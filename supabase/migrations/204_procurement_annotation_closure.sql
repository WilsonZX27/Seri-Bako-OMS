-- Finance and Purchasing may send approved POs. Owners may permanently remove
-- cancelled POs only when no downstream receiving, return, or invoice exists.
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.permission_code='purchase_order.send'
where r.role_code in ('purchasing','finance') and r.status='active' and r.deleted_at is null
on conflict(role_id,permission_id) do nothing;

alter function public.preview_phase_one_hard_delete(text,uuid) rename to preview_phase_one_hard_delete_v203;
alter function public.hard_delete_phase_one(text,uuid,text) rename to hard_delete_phase_one_v203;

create or replace function public.preview_phase_one_hard_delete(record_type text,record_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; po public.purchase_orders%rowtype; grn_count bigint; return_count bigint; invoice_count bigint; deps jsonb; eligible boolean;
begin
  if record_type<>'purchase_order' then return public.preview_phase_one_hard_delete_v203(record_type,record_id); end if;
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' and r.deleted_at is null limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  select * into po from public.purchase_orders where id=record_id for update;
  if po.id is null then raise exception 'Purchase Order was not found.'; end if;
  if po.company_id<>actor.company_id then raise exception 'Record belongs to another company.'; end if;
  select count(*) into grn_count from public.goods_receivings where purchase_order_id=po.id and deleted_at is null;
  select count(*) into return_count from public.purchase_returns where purchase_order_id=po.id and deleted_at is null;
  select count(*) into invoice_count from public.supplier_invoices where purchase_order_id=po.id and deleted_at is null;
  deps:=jsonb_build_object('goods_receivings',grn_count,'purchase_returns',return_count,'supplier_invoices',invoice_count);
  eligible:=po.status='cancelled' and grn_count=0 and return_count=0 and invoice_count=0;
  return jsonb_build_object('supported',true,'eligible',eligible,'record_type',record_type,'record_id',po.id,'record_number',po.po_no,'display_label',po.po_no,'status',po.status,'dependencies',deps,'cascade_safe',jsonb_build_object('purchase_order_lines',(select count(*) from public.purchase_order_lines where purchase_order_id=po.id),'document',case when po.document_id is null then 0 else 1 end),'snapshot',to_jsonb(po),'confirmation',po.po_no,'irreversible_warning','Permanent deletion cannot be undone. A deletion tombstone remains.','sequence_note','The PO number remains consumed.','reason',case when po.status<>'cancelled' then 'Cancel the Purchase Order before permanent deletion.' when grn_count+return_count+invoice_count>0 then 'Permanent deletion is blocked by receiving, return, or invoice history.' else 'Owner-authorized deletion of a cancelled Purchase Order without downstream history.' end);
end $$;

create or replace function public.hard_delete_phase_one(record_type text,record_id uuid,confirmation text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; po public.purchase_orders%rowtype; p jsonb; doc_id uuid; source_pr_id uuid;
begin
  if record_type<>'purchase_order' then return public.hard_delete_phase_one_v203(record_type,record_id,confirmation); end if;
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' and r.deleted_at is null limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  select * into po from public.purchase_orders where id=record_id and company_id=actor.company_id for update;
  if po.id is null then raise exception 'Purchase Order was not found.'; end if;
  p:=public.preview_phase_one_hard_delete(record_type,record_id);
  if upper(trim(coalesce(confirmation,'')))<>upper(p->>'confirmation') then raise exception 'Typed confirmation does not match.'; end if;
  if not coalesce((p->>'eligible')::boolean,false) then raise exception '%',p->>'reason'; end if;
  doc_id:=po.document_id; source_pr_id:=po.purchase_request_id;
  insert into public.permanent_deletion_tombstones(actor_id,actor_name,company_id,record_type,record_id,record_number,display_label,deletion_reason,dependency_summary,sanitized_snapshot) values(actor.id,actor.full_name,actor.company_id,record_type,po.id,po.po_no,po.po_no,'Owner-confirmed cancelled PO permanent deletion',p->'dependencies',p->'snapshot');
  if doc_id is not null then
    delete from public.attachments where entity_type='document' and entity_id=doc_id;
    delete from public.activity_logs where entity_type='document' and entity_id=doc_id;
    delete from public.document_comments where document_id=doc_id;
    delete from public.document_revisions where document_id=doc_id;
    update public.purchase_orders set document_id=null where id=po.id;
    delete from public.documents where id=doc_id;
  end if;
  delete from public.purchase_order_lines where purchase_order_id=po.id;
  delete from public.purchase_orders where id=po.id;
  if source_pr_id is not null and not exists(select 1 from public.purchase_orders where purchase_request_id=source_pr_id and deleted_at is null) then update public.purchase_requests set status='ready_to_convert',updated_by=actor.id,updated_at=now() where id=source_pr_id and status='converted_to_po'; end if;
  return jsonb_build_object('deleted',true,'record_type',record_type,'record_id',record_id);
end $$;

revoke all on function public.preview_phase_one_hard_delete(text,uuid),public.hard_delete_phase_one(text,uuid,text) from public,anon;
grant execute on function public.preview_phase_one_hard_delete(text,uuid),public.hard_delete_phase_one(text,uuid,text) to authenticated;
