-- A PO line may use a different UOM from the supplier item's stored purchase
-- UOM. Supplier-item identity is supplier + item, so reuse that relationship
-- instead of inserting a second row that the canonical Item Master identity
-- trigger rewrites to the same supplier_item_code.
create or replace function public.ensure_provisional_purchase_order_mapping()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  po public.purchase_orders%rowtype;
  item_row public.items%rowtype;
  relationship_id uuid;
  normalized_uom text;
begin
  select * into po from public.purchase_orders where id = new.purchase_order_id;
  select * into item_row from public.items
  where id = new.item_id and company_id = po.company_id
    and status = 'active' and deleted_at is null;
  if po.id is null or item_row.id is null then
    raise exception 'Purchase order line references are invalid.';
  end if;

  normalized_uom := upper(btrim(new.uom));
  select id into relationship_id
  from public.supplier_items
  where company_id = po.company_id
    and supplier_id = po.supplier_id
    and item_id = new.item_id
    and status = 'active'
    and deleted_at is null
  order by created_at, id
  limit 1;

  if relationship_id is null then
    insert into public.supplier_items (
      company_id, supplier_id, item_id, supplier_item_code, supplier_item_name,
      purchase_uom, conversion_to_base_uom, unit_cost, status, created_by, updated_by
    ) values (
      po.company_id, po.supplier_id, new.item_id,
      item_row.item_code, item_row.item_name, normalized_uom,
      1, new.unit_price, 'active', public.current_staff_id(), public.current_staff_id()
    ) returning id into relationship_id;
  end if;

  insert into public.branch_supplier_items (
    branch_id, supplier_item_id, item_id, is_preferred, status, created_by, updated_by
  ) values (
    po.branch_id, relationship_id, new.item_id, false, 'active',
    public.current_staff_id(), public.current_staff_id()
  )
  on conflict (branch_id, supplier_item_id) do update
  set status = 'active', deleted_at = null, updated_by = excluded.updated_by;

  return new;
end
$$;

comment on function public.ensure_provisional_purchase_order_mapping() is
  'Reuses the canonical supplier-item relationship across PO UOMs and ensures branch availability idempotently.';

revoke all on function public.ensure_provisional_purchase_order_mapping() from public, anon, authenticated;

notify pgrst, 'reload schema';
