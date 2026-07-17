-- Sprint 7.21.2: repair owner hard-delete preview for global master-data tables.
-- Items, suppliers, and products do not have company_id columns. The owner actor's
-- company is used for the tombstone; dependency checks use the actual current tables.

alter function public.preview_phase_one_hard_delete(text, uuid) rename to preview_phase_one_hard_delete_v059;
alter function public.hard_delete_phase_one(text, uuid, text) rename to hard_delete_phase_one_v059;

create or replace function public.preview_phase_one_hard_delete(record_type text, record_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  root jsonb;
  number text;
  label text;
  status text;
  deps jsonb := '{}'::jsonb;
  blocked boolean := false;
  c bigint;
begin
  if record_type not in ('supplier', 'item', 'product') then
    return public.preview_phase_one_hard_delete_v059(record_type, record_id);
  end if;

  select s.* into actor
  from public.staffs s
  join public.staff_roles sr on sr.staff_id = s.id
  join public.roles r on r.id = sr.role_id
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
    and s.deleted_at is null
    and r.role_code = 'super_admin'
    and r.status = 'active'
  limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;

  if record_type = 'supplier' then
    select jsonb_build_object(
      'id', s.id, 'supplier_code', s.supplier_code, 'name', s.name,
      'status', s.status, 'company_id', actor.company_id
    ), coalesce(s.supplier_code, s.id::text), s.name, s.status
    into root, number, label, status
    from public.suppliers s where s.id = record_id for update;
    if root is null then raise exception 'Supplier was not found.'; end if;

    select count(*) into c from public.supplier_items where supplier_id = record_id;
    deps := deps || jsonb_build_object('supplier_items', c); blocked := blocked or c > 0;
    select count(*) into c from public.purchase_request_lines where suggested_supplier_id = record_id;
    deps := deps || jsonb_build_object('purchase_request_lines_suggested_supplier', c); blocked := blocked or c > 0;
    select count(*) into c from public.purchase_orders where supplier_id = record_id;
    deps := deps || jsonb_build_object('purchase_orders', c); blocked := blocked or c > 0;
    select count(*) into c from public.goods_receivings where supplier_id = record_id;
    deps := deps || jsonb_build_object('goods_receivings', c); blocked := blocked or c > 0;
    select count(*) into c from public.purchase_returns where supplier_id = record_id;
    deps := deps || jsonb_build_object('purchase_returns', c); blocked := blocked or c > 0;
    select count(*) into c from public.supplier_invoices where supplier_id = record_id;
    deps := deps || jsonb_build_object('supplier_invoices', c); blocked := blocked or c > 0;
    select count(*) into c from public.items where supplier_id = record_id;
    deps := deps || jsonb_build_object('items_supplier_reference', c); blocked := blocked or c > 0;

  elsif record_type = 'item' then
    select jsonb_build_object(
      'id', i.id, 'item_code', i.item_code, 'item_name', i.item_name,
      'status', i.status, 'company_id', actor.company_id
    ), i.item_code, i.item_name, i.status
    into root, number, label, status
    from public.items i where i.id = record_id for update;
    if root is null then raise exception 'Item was not found.'; end if;

    select count(*) into c from public.stock_transactions where item_id = record_id;
    deps := deps || jsonb_build_object('stock_transactions', c); blocked := blocked or c > 0;
    select count(*) into c from public.stock_transaction_lines where item_id = record_id;
    deps := deps || jsonb_build_object('stock_transaction_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.purchase_request_lines where item_id = record_id;
    deps := deps || jsonb_build_object('purchase_request_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.purchase_order_lines where item_id = record_id;
    deps := deps || jsonb_build_object('purchase_order_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.goods_receiving_lines where item_id = record_id;
    deps := deps || jsonb_build_object('goods_receiving_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.purchase_return_lines where item_id = record_id;
    deps := deps || jsonb_build_object('purchase_return_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.supplier_items where item_id = record_id;
    deps := deps || jsonb_build_object('supplier_items', c); blocked := blocked or c > 0;
    select count(*) into c from public.recipe_lines where ingredient_item_id = record_id;
    deps := deps || jsonb_build_object('recipe_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.stock_count_lines where item_id = record_id;
    deps := deps || jsonb_build_object('stock_count_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.stock_transfer_lines where item_id = record_id;
    deps := deps || jsonb_build_object('stock_transfer_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.stock_wastage_lines where item_id = record_id;
    deps := deps || jsonb_build_object('stock_wastage_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.production_job_ingredient_lines where item_id = record_id;
    deps := deps || jsonb_build_object('production_job_ingredient_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.production_job_output_lines where item_id = record_id;
    deps := deps || jsonb_build_object('production_job_output_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.production_jobs where output_item_id = record_id;
    deps := deps || jsonb_build_object('production_jobs_output_item', c); blocked := blocked or c > 0;
    select count(*) into c from public.barcode_mappings where item_id = record_id and deleted_at is null;
    deps := deps || jsonb_build_object('barcode_mappings', c); blocked := blocked or c > 0;

  else
    select jsonb_build_object(
      'id', p.id, 'product_code', p.product_code, 'product_name', p.product_name,
      'status', p.status, 'company_id', actor.company_id
    ), p.product_code, p.product_name, p.status
    into root, number, label, status
    from public.products p where p.id = record_id for update;
    if root is null then raise exception 'Product was not found.'; end if;

    select count(*) into c from public.recipes where product_id = record_id;
    deps := deps || jsonb_build_object('recipes', c); blocked := blocked or c > 0;
    select count(*) into c from public.product_packaging where product_id = record_id;
    deps := deps || jsonb_build_object('product_packaging', c); blocked := blocked or c > 0;
    select count(*) into c from public.barcode_mappings where product_id = record_id and deleted_at is null;
    deps := deps || jsonb_build_object('barcode_mappings', c); blocked := blocked or c > 0;
    select count(*) into c from public.stock_transaction_lines where product_id = record_id;
    deps := deps || jsonb_build_object('stock_transaction_lines', c); blocked := blocked or c > 0;
    select count(*) into c from public.production_jobs where product_id = record_id;
    deps := deps || jsonb_build_object('production_jobs', c); blocked := blocked or c > 0;
    select count(*) into c from public.production_job_output_lines where product_id = record_id;
    deps := deps || jsonb_build_object('production_job_output_lines', c); blocked := blocked or c > 0;
  end if;

  return jsonb_build_object(
    'supported', true, 'eligible', not blocked, 'record_type', record_type,
    'record_id', record_id, 'record_number', number, 'display_label', label,
    'status', status, 'dependencies', deps, 'cascade_safe', '{}'::jsonb,
    'snapshot', root, 'confirmation', coalesce(number, 'DELETE'),
    'irreversible_warning', 'Permanent deletion cannot be undone. Linked-record deletion is outside Phase 1.',
    'sequence_note', 'Document sequence numbers remain consumed.',
    'reason', case when blocked then 'Permanent deletion is blocked by current status or linked records.' else 'Owner-authorized Phase 1 permanent deletion.' end
  );
end $$;

create or replace function public.hard_delete_phase_one(record_type text, record_id uuid, confirmation text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare actor public.staffs%rowtype; p jsonb; expected text; root jsonb;
begin
  if record_type not in ('supplier', 'item', 'product') then
    return public.hard_delete_phase_one_v059(record_type, record_id, confirmation);
  end if;

  select s.* into actor
  from public.staffs s
  join public.staff_roles sr on sr.staff_id = s.id
  join public.roles r on r.id = sr.role_id
  where s.auth_user_id = auth.uid()
    and s.status = 'active'
    and s.deleted_at is null
    and r.role_code = 'super_admin'
    and r.status = 'active'
  limit 1;
  if actor.id is null then raise exception 'Owner / Super Admin access is required.'; end if;

  p := public.preview_phase_one_hard_delete(record_type, record_id);
  expected := p->>'confirmation';
  if upper(trim(coalesce(confirmation, ''))) <> upper(expected) then raise exception 'Typed confirmation does not match.'; end if;
  if not coalesce((p->>'eligible')::boolean, false) then raise exception 'Permanent deletion is blocked by current dependencies or status.'; end if;
  root := p->'snapshot';

  insert into public.permanent_deletion_tombstones(
    actor_id, actor_name, company_id, record_type, record_id, record_number,
    display_label, deletion_reason, dependency_summary, sanitized_snapshot
  ) values (
    actor.id, actor.full_name, actor.company_id, record_type, record_id,
    p->>'record_number', p->>'display_label', 'Owner-confirmed Phase 1 permanent deletion',
    p->'dependencies', root
  );

  if record_type = 'supplier' then delete from public.suppliers where id = record_id;
  elsif record_type = 'item' then delete from public.items where id = record_id;
  else delete from public.products where id = record_id;
  end if;
  return jsonb_build_object('deleted', true, 'record_type', record_type, 'record_id', record_id);
end $$;

grant execute on function public.preview_phase_one_hard_delete(text, uuid) to authenticated;
grant execute on function public.hard_delete_phase_one(text, uuid, text) to authenticated;
