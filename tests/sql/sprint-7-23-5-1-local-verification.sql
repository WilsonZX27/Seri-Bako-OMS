\set ON_ERROR_STOP on
begin;

insert into public.companies (id, company_code, company_name)
values ('10000000-0000-0000-0000-000000000001', 'E2E-LOCAL', 'E2E Local Company');
insert into public.branches (id, company_id, branch_code, branch_name, branch_type)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'OFFICE', 'Office', 'outlet'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'CK-PJS10', 'CK-PJS10', 'central_kitchen'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'CK-ALMA', 'CK-ALMA', 'central_kitchen');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'manager.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'finance.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'kitchen.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outlet.local@example.invalid', now(), now()),
  ('30000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'owner.local@example.invalid', now(), now());
insert into public.staffs (id, company_id, auth_user_id, staff_code, full_name, email, default_branch_id)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'E2E-MGR', 'E2E Manager', 'manager.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'E2E-FIN', 'E2E Finance', 'finance.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'E2E-KIT', 'E2E Kitchen', 'kitchen.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 'E2E-OUT', 'E2E Outlet', 'outlet.local@example.invalid', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', 'E2E-OWN', 'E2E Owner', 'owner.local@example.invalid', '20000000-0000-0000-0000-000000000001');
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select staff_id, r.id, branch_id, true
from (values
  ('40000000-0000-0000-0000-000000000001'::uuid, 'manager', '20000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'finance', null::uuid),
  ('40000000-0000-0000-0000-000000000003'::uuid, 'kitchen', '20000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000004'::uuid, 'outlet_staff', '20000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000005'::uuid, 'super_admin', null::uuid)
) v(staff_id, role_code, branch_id) join public.roles r using (role_code);
insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'manage', true),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'manage', true),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'read_only', true),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'read_only', true),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'full', true);

insert into public.purchase_requests (id, company_id, request_no, requested_by, branch_id, status)
values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'PR-00008', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'manager_review'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'PR-00011', '40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'manager_review');
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
do $$ declare result jsonb; begin
  if (select count(*) from public.staff_branches where staff_id='40000000-0000-0000-0000-000000000001') <> 1 then raise exception 'Manager fixture must retain only Office branch context'; end if;
  if (select count(*) from public.purchase_requests where request_no in ('PR-00008', 'PR-00011')) <> 2 then raise exception 'Manager cannot see both same-company PR fixtures'; end if;
  if not public.has_permission('pr.view_all') or public.has_permission('pr.view_branch') then raise exception 'Manager PR scope permissions are not canonical'; end if;
  if public.has_any_permission(array['pr.admin_review','pr.finance_review','pr.convert_to_po','supplier_invoice.view','supplier_invoice.pay','recipes.read','recipes.view','roles.read','settings.manage']) then raise exception 'Manager received Finance, Purchasing, recipe-costing, or Owner capability'; end if;
  if (select count(*) from public.recipes) <> 0 then raise exception 'Manager can read recipe master data'; end if;
  result := public.transition_purchase_request('50000000-0000-0000-0000-000000000001', 'manager_approve', null);
  if result ->> 'status' <> 'admin_review' then raise exception 'Manager Review did not advance the cross-branch PR'; end if;
  begin
    perform public.transition_purchase_request('50000000-0000-0000-0000-000000000001', 'admin_approve', null);
    raise exception 'Manager completed Purchasing Review';
  exception when others then
    if sqlerrm = 'Manager completed Purchasing Review' then raise; end if;
    if sqlerrm not like '%permission%' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
do $$ begin
  if (select count(*) from public.purchase_requests where request_no in ('PR-00008', 'PR-00011')) <> 2 then raise exception 'Finance company-wide PR visibility changed'; end if;
  if (select count(*) from public.recipes) <> 1 then raise exception 'Finance cannot read recipe master data'; end if;
end $$;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
do $$ begin
  if exists (select 1 from public.purchase_requests where request_no='PR-00011') then raise exception 'Kitchen can read an out-of-branch PR'; end if;
  if (select count(*) from public.recipes) <> 0 then raise exception 'Kitchen can read recipe master data directly'; end if;
  if jsonb_array_length(public.get_production_recipe_options()) <> 1 then raise exception 'Kitchen cannot read the minimal active production recipe snapshot'; end if;
end $$;
select public.save_outlet_daily_record(
  null, '20000000-0000-0000-0000-000000000001', current_date, null,
  '[{"product_id":"60000000-0000-0000-0000-000000000001","qty_sent":"10","morning_received_qty":"99","wastage_qty":"9"}]'::jsonb,
  'morning_recorded'
) as daily_id \gset

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000004', true);
do $$ begin
  if exists (select 1 from public.purchase_requests where request_no='PR-00011') then raise exception 'Outlet Staff can read an out-of-branch PR'; end if;
end $$;
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

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000005', true);
do $$ begin
  if (select count(*) from public.purchase_requests where request_no in ('PR-00008', 'PR-00011')) <> 2 then raise exception 'Owner PR visibility changed'; end if;
end $$;

reset role;
rollback;
\echo 'Manager company scope and Sprint 7.23.5.1 local verification passed.'
