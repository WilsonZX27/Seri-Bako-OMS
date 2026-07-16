-- Sprint 7.7: allow pristine Purchase Requests to remove only their intrinsic creation audit rows.
-- Forward-only replacement for the PR branches of migration 056. Do not edit 056.

create or replace function public.preview_phase_one_hard_delete(record_type text, record_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actor public.staffs%rowtype; root jsonb; label text; number text; company uuid; status text;
  deps jsonb := '{}'::jsonb; blocked boolean := false; c bigint; v_document_id uuid;
  intrinsic_activity bigint := 0; intrinsic_revision bigint := 0; intrinsic_document boolean := false;
begin
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id
    where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  if record_type='purchase_request' then
    select jsonb_build_object('id',pr.id,'request_no',pr.request_no,'status',pr.status,'company_id',pr.company_id,'document_id',pr.document_id), pr.request_no, pr.request_no, pr.company_id, pr.status, pr.document_id
      into root,number,label,company,status,v_document_id from public.purchase_requests pr where pr.id=record_id for update;
    if root is null then raise exception 'Purchase Request was not found.'; end if;
    if company is distinct from actor.company_id then raise exception 'Record belongs to another company.'; end if;
    select count(*) into c from public.purchase_orders where purchase_request_id=record_id;
    deps:=deps||jsonb_build_object('purchase_orders',c); blocked:=c>0 or status not in ('draft','cancelled');
    deps:=deps||jsonb_build_object('purchase_request_lines',(select count(*) from public.purchase_request_lines where purchase_request_id=record_id));
    if v_document_id is not null then
      select exists(select 1 from public.documents d where d.id=v_document_id) into intrinsic_document;
      select count(*) into c from public.document_comments where document_comments.document_id=v_document_id;
      deps:=deps||jsonb_build_object('document_comments',c); blocked:=blocked or c>0;
      select count(*) into c from public.attachments where entity_type='document' and entity_id=v_document_id and deleted_at is null;
      deps:=deps||jsonb_build_object('attachments',c); blocked:=blocked or c>0;
      select count(*) into intrinsic_revision from public.document_revisions where document_revisions.document_id=v_document_id and revision_no=1 and change_summary='Initial document created.';
      select count(*) into c from public.document_revisions where document_revisions.document_id=v_document_id;
      deps:=deps||jsonb_build_object('document_revisions',greatest(c-intrinsic_revision,0)); blocked:=blocked or c<>intrinsic_revision;
      select count(*) into intrinsic_activity from public.activity_logs where entity_type='document' and entity_id=v_document_id and activity_type='created' and message='Purchase request '||number||' created' and metadata is null;
      select count(*) into c from public.activity_logs where entity_type='document' and entity_id=v_document_id;
      deps:=deps||jsonb_build_object('activity_logs',greatest(c-intrinsic_activity,0)); blocked:=blocked or c<>intrinsic_activity;
    else
      deps:=deps||jsonb_build_object('document',0,'document_comments',0,'attachments',0,'document_revisions',0,'activity_logs',0);
    end if;
  elsif record_type='supplier' then
    select jsonb_build_object('id',s.id,'supplier_code',s.supplier_code,'name',s.name,'status',s.status),coalesce(s.supplier_code,s.id::text),s.name,s.company_id,s.status into root,number,label,company,status from suppliers s where s.id=record_id for update;
    if root is null then raise exception 'Supplier was not found.'; end if;
    select count(*) into c from supplier_items where supplier_id=record_id; deps:=deps||jsonb_build_object('supplier_items',c); blocked:=blocked or c>0;
    select count(*) into c from purchase_request_lines where suggested_supplier_id=record_id; deps:=deps||jsonb_build_object('purchase_request_lines_suggested_supplier',c); blocked:=blocked or c>0;
    select count(*) into c from purchase_orders where supplier_id=record_id; deps:=deps||jsonb_build_object('purchase_orders',c); blocked:=blocked or c>0;
    select count(*) into c from goods_receivings where supplier_id=record_id; deps:=deps||jsonb_build_object('goods_receivings',c); blocked:=blocked or c>0;
    select count(*) into c from purchase_returns where supplier_id=record_id; deps:=deps||jsonb_build_object('purchase_returns',c); blocked:=blocked or c>0;
    select count(*) into c from supplier_invoices where supplier_id=record_id; deps:=deps||jsonb_build_object('supplier_invoices',c); blocked:=blocked or c>0;
    select count(*) into c from items where supplier_id=record_id; deps:=deps||jsonb_build_object('items_supplier_reference',c); blocked:=blocked or c>0;
  elsif record_type='item' then
    select jsonb_build_object('id',i.id,'item_code',i.item_code,'item_name',i.item_name,'status',i.status),i.item_code,i.item_name,i.company_id,i.status into root,number,label,company,status from items i where i.id=record_id for update;
    if root is null then raise exception 'Item was not found.'; end if;
    select count(*) into c from stock_transactions where item_id=record_id; deps:=deps||jsonb_build_object('stock_transactions',c); blocked:=blocked or c>0;
    select count(*) into c from stock_transaction_lines where item_id=record_id; deps:=deps||jsonb_build_object('stock_transaction_lines',c); blocked:=blocked or c>0;
    select count(*) into c from purchase_request_lines where item_id=record_id; deps:=deps||jsonb_build_object('purchase_request_lines',c); blocked:=blocked or c>0;
    select count(*) into c from purchase_order_lines where item_id=record_id; deps:=deps||jsonb_build_object('purchase_order_lines',c); blocked:=blocked or c>0;
    select count(*) into c from goods_receiving_lines where item_id=record_id; deps:=deps||jsonb_build_object('goods_receiving_lines',c); blocked:=blocked or c>0;
    select count(*) into c from purchase_return_lines where item_id=record_id; deps:=deps||jsonb_build_object('purchase_return_lines',c); blocked:=blocked or c>0;
    select count(*) into c from supplier_items where item_id=record_id; deps:=deps||jsonb_build_object('supplier_items',c); blocked:=blocked or c>0;
    select count(*) into c from recipe_lines where ingredient_item_id=record_id; deps:=deps||jsonb_build_object('recipe_lines',c); blocked:=blocked or c>0;
    select count(*) into c from stock_count_lines where item_id=record_id; deps:=deps||jsonb_build_object('stock_count_lines',c); blocked:=blocked or c>0;
    select count(*) into c from stock_transfer_lines where item_id=record_id; deps:=deps||jsonb_build_object('stock_transfer_lines',c); blocked:=blocked or c>0;
    select count(*) into c from stock_wastage_lines where item_id=record_id; deps:=deps||jsonb_build_object('stock_wastage_lines',c); blocked:=blocked or c>0;
    select count(*) into c from production_job_lines where item_id=record_id; deps:=deps||jsonb_build_object('production_job_lines',c); blocked:=blocked or c>0;
    select count(*) into c from production_jobs where output_item_id=record_id; deps:=deps||jsonb_build_object('production_jobs_output_item',c); blocked:=blocked or c>0;
    select count(*) into c from barcodes where item_id=record_id; deps:=deps||jsonb_build_object('barcodes',c); blocked:=blocked or c>0;
  elsif record_type='product' then
    select jsonb_build_object('id',p.id,'product_code',p.product_code,'product_name',p.product_name,'status',p.status),p.product_code,p.product_name,p.company_id,p.status into root,number,label,company,status from products p where p.id=record_id for update;
    if root is null then raise exception 'Product was not found.'; end if;
    select count(*) into c from recipes where product_id=record_id; deps:=deps||jsonb_build_object('recipes',c); blocked:=blocked or c>0;
    select count(*) into c from product_packaging where product_id=record_id; deps:=deps||jsonb_build_object('product_packaging',c); blocked:=blocked or c>0;
    select count(*) into c from barcodes where product_id=record_id; deps:=deps||jsonb_build_object('barcodes',c); blocked:=blocked or c>0;
    select count(*) into c from stock_transaction_lines where product_id=record_id; deps:=deps||jsonb_build_object('stock_transaction_lines',c); blocked:=blocked or c>0;
    select count(*) into c from production_jobs where product_id=record_id; deps:=deps||jsonb_build_object('production_jobs',c); blocked:=blocked or c>0;
  elsif record_type='recipe' then
    select jsonb_build_object('id',r.id,'recipe_code',r.recipe_code,'recipe_name',r.recipe_name,'status',r.status),r.recipe_code,r.recipe_name,r.company_id,r.status into root,number,label,company,status from recipes r where r.id=record_id for update;
    if root is null then raise exception 'Recipe was not found.'; end if;
    select count(*) into c from production_jobs where recipe_id=record_id; deps:=deps||jsonb_build_object('production_jobs',c); blocked:=c>0;
    deps:=deps||jsonb_build_object('recipe_lines',(select count(*) from recipe_lines where recipe_id=record_id),'recipe_cost_snapshots',(select count(*) from recipe_cost_snapshots where recipe_id=record_id));
  else raise exception 'Unsupported Phase 1 record type.'; end if;
  if company is distinct from actor.company_id then raise exception 'Record belongs to another company.'; end if;
  return jsonb_build_object('supported',true,'eligible',not blocked,'record_type',record_type,'record_id',record_id,'record_number',number,'display_label',label,'status',status,'dependencies',deps,'cascade_safe',case when record_type='purchase_request' then jsonb_build_object('purchase_request_lines',deps->'purchase_request_lines','document',case when intrinsic_document then 1 else 0 end,'document_revisions',intrinsic_revision,'activity_logs',intrinsic_activity) when record_type='recipe' then jsonb_build_object('recipe_lines',deps->'recipe_lines','recipe_cost_snapshots',deps->'recipe_cost_snapshots') else '{}'::jsonb end,'snapshot',root,'confirmation',coalesce(number,'DELETE'),'irreversible_warning','Permanent deletion cannot be undone. Linked-record deletion is outside Phase 1.','sequence_note','Document sequence numbers remain consumed.','reason',case when blocked then 'Permanent deletion is blocked by current status or linked records.' else 'Owner-authorized Phase 1 permanent deletion.' end);
end $$;

create or replace function public.hard_delete_phase_one(record_type text, record_id uuid, confirmation text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare actor public.staffs%rowtype; p jsonb; expected text; root jsonb; company uuid; label text; number text; v_document_id uuid;
begin
  select s.* into actor from public.staffs s join public.staff_roles sr on sr.staff_id=s.id join public.roles r on r.id=sr.role_id where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null and r.role_code='super_admin' and r.status='active' limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;
  p:=public.preview_phase_one_hard_delete(record_type,record_id); expected:=p->>'confirmation';
  if upper(trim(coalesce(confirmation,'')))<>upper(expected) then raise exception 'Typed confirmation does not match.'; end if;
  if not coalesce((p->>'eligible')::boolean,false) then raise exception 'Permanent deletion is blocked by current dependencies or status.'; end if;
  root:=p->'snapshot'; company:=(root->>'company_id')::uuid; label:=p->>'display_label'; number:=p->>'record_number'; v_document_id:=(root->>'document_id')::uuid;
  insert into permanent_deletion_tombstones(actor_id,actor_name,company_id,record_type,record_id,record_number,display_label,deletion_reason,dependency_summary,sanitized_snapshot)
  values(actor.id,actor.full_name,company,record_type,record_id,number,label,'Owner-confirmed Phase 1 permanent deletion',p->'dependencies',root);
  if record_type='purchase_request' then
    if v_document_id is not null then
      delete from public.activity_logs where entity_type='document' and entity_id=v_document_id and activity_type='created' and message='Purchase request '||number||' created' and metadata is null;
      delete from public.document_revisions where document_revisions.document_id=v_document_id and revision_no=1 and change_summary='Initial document created.';
      update public.purchase_requests set document_id=null where id=record_id;
      delete from public.documents where id=v_document_id;
    end if;
    delete from public.purchase_requests where id=record_id;
  elsif record_type='supplier' then delete from public.suppliers where id=record_id;
  elsif record_type='item' then delete from public.items where id=record_id;
  elsif record_type='product' then delete from public.products where id=record_id;
  elsif record_type='recipe' then delete from public.recipes where id=record_id;
  end if;
  return jsonb_build_object('deleted',true,'record_type',record_type,'record_id',record_id);
end $$;

grant execute on function public.preview_phase_one_hard_delete(text,uuid) to authenticated;
grant execute on function public.hard_delete_phase_one(text,uuid,text) to authenticated;
