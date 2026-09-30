-- Explicit product-to-inventory identity. No automatic name/code matching is
-- used because a wrong match would turn an estimate into false stock.
create table if not exists public.outlet_packaging_item_links (
  product_id uuid primary key references public.products(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  item_id uuid not null references public.items(id),
  item_base_units_per_product_unit numeric(18,6) not null
    check (item_base_units_per_product_unit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.staffs(id),
  unique (company_id, item_id)
);

create or replace function public.validate_outlet_packaging_item_link()
returns trigger language plpgsql set search_path = public as $$
declare
  product_company uuid;
  product_category text;
  item_company uuid;
  item_category text;
begin
  select company_id, category into product_company, product_category
    from public.products where id = new.product_id and deleted_at is null;
  select company_id, category into item_company, item_category
    from public.items where id = new.item_id and deleted_at is null;
  if product_company is distinct from new.company_id
     or item_company is distinct from new.company_id
     or lower(trim(coalesce(product_category, ''))) <> 'packaging'
     or lower(trim(coalesce(item_category, ''))) <> 'packaging' then
    raise exception 'Packaging product and inventory item must belong to the same company';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_outlet_packaging_item_link on public.outlet_packaging_item_links;
create trigger validate_outlet_packaging_item_link
before insert or update on public.outlet_packaging_item_links
for each row execute function public.validate_outlet_packaging_item_link();

drop trigger if exists set_outlet_packaging_item_links_updated_at on public.outlet_packaging_item_links;
create trigger set_outlet_packaging_item_links_updated_at
before update on public.outlet_packaging_item_links
for each row execute function public.set_updated_at();

alter table public.outlet_packaging_item_links enable row level security;
grant select, insert, update, delete on public.outlet_packaging_item_links to authenticated;
create policy "tenant packaging links read" on public.outlet_packaging_item_links
for select to authenticated
using (company_id = public.current_staff_company_id()
  and public.has_permission('outlet_daily_record.view_all'));

create policy "tenant packaging links insert" on public.outlet_packaging_item_links
for insert to authenticated
with check (company_id = public.current_staff_company_id()
  and public.has_permission('outlet_daily_record.view_all')
  and public.current_staff_has_company_role(array['super_admin','manager','purchasing']));
create policy "tenant packaging links update" on public.outlet_packaging_item_links
for update to authenticated
using (company_id = public.current_staff_company_id()
  and public.has_permission('outlet_daily_record.view_all')
  and public.current_staff_has_company_role(array['super_admin','manager','purchasing']))
with check (company_id = public.current_staff_company_id()
  and public.has_permission('outlet_daily_record.view_all')
  and public.current_staff_has_company_role(array['super_admin','manager','purchasing']));
create policy "tenant packaging links delete" on public.outlet_packaging_item_links
for delete to authenticated
using (company_id = public.current_staff_company_id()
  and public.has_permission('outlet_daily_record.view_all')
  and public.current_staff_has_company_role(array['super_admin','manager','purchasing']));

notify pgrst, 'reload schema';
