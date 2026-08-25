-- Preserve committed PO line immutability while allowing the Owner-only,
-- dependency-checked hard-delete RPC to remove an eligible cancelled PO.
create or replace function public.prevent_committed_purchase_order_line_mutation()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare order_status public.purchase_order_status;
begin
  if current_setting('app.phase_one_hard_delete', true) = 'on'
     or current_setting('app.purchase_receipt_posting', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select status into order_status from public.purchase_orders
  where id = coalesce(new.purchase_order_id, old.purchase_order_id);
  if order_status <> 'draft' then
    raise exception 'Purchase order lines are locked after the PO leaves draft. Create a revision or cancel and reissue.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create or replace function public.hard_delete_phase_one(record_type text, record_id uuid, confirmation text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor public.staffs%rowtype; po public.purchase_orders%rowtype; p jsonb; doc_id uuid; source_pr_id uuid;
begin
  if record_type <> 'purchase_order' then return public.hard_delete_phase_one_v203(record_type, record_id, confirmation); end if;
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id = s.id join public.roles r on r.id = sr.role_id
  where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null
    and r.role_code = 'super_admin' and r.status = 'active' and r.deleted_at is null limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  select * into po from public.purchase_orders where id = record_id and company_id = actor.company_id for update;
  if po.id is null then raise exception 'Purchase Order was not found.'; end if;
  p := public.preview_phase_one_hard_delete(record_type, record_id);
  if upper(trim(coalesce(confirmation, ''))) <> upper(p->>'confirmation') then raise exception 'Typed confirmation does not match.'; end if;
  if not coalesce((p->>'eligible')::boolean, false) then raise exception '%', p->>'reason'; end if;
  doc_id := po.document_id; source_pr_id := po.purchase_request_id;
  insert into public.permanent_deletion_tombstones(actor_id,actor_name,company_id,record_type,record_id,record_number,display_label,deletion_reason,dependency_summary,sanitized_snapshot)
  values(actor.id,actor.full_name,actor.company_id,record_type,po.id,po.po_no,po.po_no,'Owner-confirmed cancelled PO permanent deletion',p->'dependencies',p->'snapshot');
  if doc_id is not null then
    delete from public.attachments where entity_type = 'document' and entity_id = doc_id;
    delete from public.activity_logs where entity_type = 'document' and entity_id = doc_id;
    delete from public.document_comments where document_id = doc_id;
    delete from public.document_revisions where document_id = doc_id;
    update public.purchase_orders set document_id = null where id = po.id;
    delete from public.documents where id = doc_id;
  end if;
  perform set_config('app.phase_one_hard_delete', 'on', true);
  delete from public.purchase_order_lines where purchase_order_id = po.id;
  delete from public.purchase_orders where id = po.id;
  perform set_config('app.phase_one_hard_delete', 'off', true);
  if source_pr_id is not null and not exists(select 1 from public.purchase_orders where purchase_request_id = source_pr_id and deleted_at is null) then
    update public.purchase_requests set status = 'ready_to_convert', updated_by = actor.id, updated_at = now()
    where id = source_pr_id and status = 'converted_to_po';
  end if;
  return jsonb_build_object('deleted', true, 'record_type', record_type, 'record_id', record_id);
end $$;

revoke all on function public.hard_delete_phase_one(text, uuid, text) from public, anon;
grant execute on function public.hard_delete_phase_one(text, uuid, text) to authenticated;
