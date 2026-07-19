\set ON_ERROR_STOP on
begin;

insert into public.companies (id, company_code, company_name)
values ('10000000-0000-0000-0000-000000000001', 'E2E-LOCAL', 'E2E Local Company');
insert into public.branches (id, company_id, branch_code, branch_name, branch_type)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E2E-A', 'E2E Branch A', 'outlet'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'E2E-B', 'E2E Branch B', 'outlet');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'manager.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'finance.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'kitchen.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outlet.local@example.invalid', now(), now());
insert into public.staffs (id, company_id, auth_user_id, staff_code, full_name, email, default_branch_id)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'E2E-MGR', 'E2E Manager', 'manager.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'E2E-FIN', 'E2E Finance', 'finance.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'E2E-KIT', 'E2E Kitchen', 'kitchen.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'E2E-OUT', 'E2E Outlet', 'outlet.local@example.invalid', '20000000-0000-0000-0000-000000000001');
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select staff_id, r.id, '20000000-0000-0000-0000-000000000001', true
from (values
  ('40000000-0000-0000-0000-000000000001'::uuid, 'manager'),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'finance'),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'kitchen'),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'outlet_staff')
) v(staff_id, role_code) join public.roles r using (role_code);
insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
select id, '20000000-0000-0000-0000-000000000001', 'full', true from public.staffs where company_id='10000000-0000-0000-0000-000000000001';

insert into public.purchase_requests (id, company_id, request_no, requested_by, branch_id, status)
values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'E2E-PR-A', '40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'manager_review'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'E2E-PR-B', '40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'manager_review');
insert into public.products (id, product_code, product_name, category, display_order, selling_unit)
values ('60000000-0000-0000-0000-000000000001', 'SC01', 'E2E Product', 'E2E Category', 1, 'PCS');
insert into public.items (id, item_code, item_name, category, purchase_unit, base_unit, conversion_to_base_unit, cost)
values ('70000000-0000-0000-0000-000000000001', 'E2E-ITEM', 'E2E Ingredient', 'E2E', 'KG', 'KG', 1, 2);
insert into public.recipes (id, company_id, product_id, recipe_no, yield_qty, yield_unit, status, approval_status)
values ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'E2E-REC', 10, 'PCS', 'active', 'approved');
insert into public.recipe_lines (recipe_id, ingredient_item_id, qty_required, unit, cost_per_unit, wastage_percent, recipe_uom, base_uom, conversion_factor, base_qty_required)
values ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 2, 'KG', 2, 0, 'KG', 'KG', 1, 2);

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
do $$ begin
  if (select count(*) from public.purchase_requests) <> 1 then raise exception 'Manager list scope is not exactly one assigned-branch PR'; end if;
  if exists (select 1 from public.purchase_requests where id='50000000-0000-0000-0000-000000000002') then raise exception 'Manager can see an out-of-branch PR'; end if;
  if (select count(*) from public.recipes) <> 0 then raise exception 'Manager can read recipe master data'; end if;
end $$;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
do $$ begin
  if (select count(*) from public.recipes) <> 1 then raise exception 'Finance cannot read recipe master data'; end if;
end $$;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
do $$ begin
  if (select count(*) from public.recipes) <> 0 then raise exception 'Kitchen can read recipe master data directly'; end if;
  if jsonb_array_length(public.get_production_recipe_options()) <> 1 then raise exception 'Kitchen cannot read the minimal active production recipe snapshot'; end if;
end $$;
select public.save_outlet_daily_record(
  null, '20000000-0000-0000-0000-000000000001', current_date, null,
  '[{"product_id":"60000000-0000-0000-0000-000000000001","qty_sent":"10","morning_received_qty":"99","wastage_qty":"9"}]'::jsonb,
  'morning_recorded'
) as daily_id \gset

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000004', true);
select public.save_outlet_daily_record(
  :'daily_id', '20000000-0000-0000-0000-000000000001', current_date, 'Outlet confirmed',
  '[{"product_id":"60000000-0000-0000-0000-000000000001","qty_sent":"99","morning_received_qty":"9","wastage_qty":"1","wastage_reason":"unsold","notes":"One unsold"}]'::jsonb,
  'evening_completed'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select public.save_outlet_daily_record(
  :'daily_id', '20000000-0000-0000-0000-000000000001', current_date, 'Must be ignored',
  '[{"product_id":"60000000-0000-0000-0000-000000000001","qty_sent":"12","morning_received_qty":"55","wastage_qty":"5"}]'::jsonb,
  'draft'
);
do $$ begin
  if not exists (
    select 1 from public.outlet_daily_records r join public.outlet_daily_record_lines l on l.record_id=r.id
    where r.company_id='10000000-0000-0000-0000-000000000001' and r.record_date=current_date
      and r.status='evening_completed' and r.notes='Outlet confirmed'
      and l.qty_sent=12 and l.morning_received_qty=9 and l.wastage_qty=1 and l.wastage_reason='unsold'
  ) then raise exception 'Daily Record field ownership was not preserved'; end if;
end $$;

reset role;
rollback;
\echo 'Sprint 7.23.5.1 local RLS and field-ownership verification passed.'
