-- Seri Bako does not maintain supplier-specific item identities. AutoCount /
-- Item Master is authoritative for both code and name across every supplier.

update public.supplier_items supplier_item
set supplier_item_code = item.item_code,
    supplier_item_name = item.item_name,
    updated_at = now()
from public.items item
where item.id = supplier_item.item_id
  and item.company_id = supplier_item.company_id
  and (
    supplier_item.supplier_item_code is distinct from item.item_code
    or supplier_item.supplier_item_name is distinct from item.item_name
  );

create or replace function public.sync_supplier_item_master_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item_record public.items%rowtype;
begin
  select * into item_record
  from public.items item
  where item.id = new.item_id
    and item.company_id = new.company_id
    and item.deleted_at is null;
  if item_record.id is null then
    raise exception 'Supplier item must reference an Item Master record in the same company.';
  end if;
  new.supplier_item_code := item_record.item_code;
  new.supplier_item_name := item_record.item_name;
  return new;
end
$$;

drop trigger if exists supplier_items_sync_item_master_identity on public.supplier_items;
create trigger supplier_items_sync_item_master_identity
before insert or update of item_id, company_id, supplier_item_code, supplier_item_name
on public.supplier_items
for each row execute function public.sync_supplier_item_master_identity();

revoke all on function public.sync_supplier_item_master_identity() from public, anon, authenticated;

notify pgrst, 'reload schema';
