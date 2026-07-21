\set ON_ERROR_STOP on
begin;

insert into public.companies (id, company_code, company_name)
values ('a1000000-0000-0000-0000-000000000001', 'BSI-LOCAL', 'Branch Supplier Validation');
insert into public.branches (id, company_id, branch_code, branch_name, branch_type) values
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'BSI-ALMA', 'ALMA', 'central_kitchen'),
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'BSI-PJS', 'PJS10', 'outlet');
insert into public.locations (id, company_id, branch_id, location_code, location_name, location_type) values
  ('a3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'BSI-ALMA-S', 'ALMA Store', 'dry_store'),
  ('a3000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002', 'BSI-PJS-S', 'PJS Store', 'dry_store');
insert into auth.users (id, aud, role, email, created_at, updated_at) values
  ('a4000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'bsi.owner@example.invalid', now(), now()),
  ('a4000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'bsi.kitchen@example.invalid', now(), now());
insert into public.staffs (id, company_id, auth_user_id, staff_code, full_name, email, default_branch_id) values
  ('a5000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000001', 'BSI-OWNER', 'BSI Owner', 'bsi.owner@example.invalid', 'a2000000-0000-0000-0000-000000000001'),
  ('a5000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-000000000002', 'BSI-KITCHEN', 'BSI Kitchen', 'bsi.kitchen@example.invalid', 'a2000000-0000-0000-0000-000000000002');
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select 'a5000000-0000-0000-0000-000000000001', id, null, true from public.roles where role_code = 'super_admin';
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select 'a5000000-0000-0000-0000-000000000002', id, 'a2000000-0000-0000-0000-000000000002', true from public.roles where role_code = 'kitchen';
insert into public.staff_branches (staff_id, branch_id, access_level, is_default) values
  ('a5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'full', true),
  ('a5000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000002', 'full', true);
insert into public.suppliers (id, supplier_code, name) values
  ('a6000000-0000-0000-0000-000000000001', 'BSI-SUP-A', 'Supplier A'),
  ('a6000000-0000-0000-0000-000000000002', 'BSI-SUP-B', 'Supplier B');
insert into public.items (id, item_code, item_name, category, purchase_unit, base_unit, cost) values
  ('a7000000-0000-0000-0000-000000000001', 'BSI-ITEM', 'Shared Item', 'Validation', 'KG', 'KG', 2);
insert into public.supplier_items (id, supplier_id, item_id, supplier_item_code, supplier_item_name, purchase_uom, unit_cost) values
  ('a8000000-0000-0000-0000-000000000001', 'a6000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 'BSI-A', 'Shared Item A', 'KG', 2),
  ('a8000000-0000-0000-0000-000000000002', 'a6000000-0000-0000-0000-000000000002', 'a7000000-0000-0000-0000-000000000001', 'BSI-B', 'Shared Item B', 'KG', 3);

do $$ declare n integer; begin
  select count(*) into n from public.supplier_items where item_id = 'a7000000-0000-0000-0000-000000000001';
  if n <> 2 then raise exception 'Historical supplier_items were not preserved'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000001', true);
select public.save_branch_supplier_item_mappings('[{"branch_id":"a2000000-0000-0000-0000-000000000001","supplier_item_id":"a8000000-0000-0000-0000-000000000001","item_id":"a7000000-0000-0000-0000-000000000001","is_preferred":true}]', 'create');
select public.save_branch_supplier_item_mappings('[{"branch_id":"a2000000-0000-0000-0000-000000000001","supplier_item_id":"a8000000-0000-0000-0000-000000000002","item_id":"a7000000-0000-0000-0000-000000000001","is_preferred":true},{"branch_id":"a2000000-0000-0000-0000-000000000002","supplier_item_id":"a8000000-0000-0000-0000-000000000002","item_id":"a7000000-0000-0000-0000-000000000001","is_preferred":true}]', 'create');
do $$ begin
  if (select count(*) from public.branch_supplier_items where branch_id = 'a2000000-0000-0000-0000-000000000001') <> 2 then raise exception 'ALMA multiple suppliers missing'; end if;
  if (select count(*) from public.branch_supplier_items where branch_id = 'a2000000-0000-0000-0000-000000000001' and is_preferred) <> 1 then raise exception 'ALMA preference is not unique'; end if;
  if not exists (select 1 from public.branch_supplier_items where branch_id = 'a2000000-0000-0000-0000-000000000002' and supplier_item_id = 'a8000000-0000-0000-0000-000000000002') then raise exception 'PJS mapping missing'; end if;
end $$;
select public.save_branch_supplier_item_mappings('[{"branch_id":"a2000000-0000-0000-0000-000000000001","supplier_item_id":"a8000000-0000-0000-0000-000000000001","item_id":"a7000000-0000-0000-0000-000000000001","is_preferred":true}]', 'update');
do $$ begin
  if not exists (select 1 from public.branch_supplier_items where branch_id = 'a2000000-0000-0000-0000-000000000001' and supplier_item_id = 'a8000000-0000-0000-0000-000000000001' and is_preferred) then raise exception 'Repeated preference update failed'; end if;
end $$;

reset role;
insert into public.purchase_requests (id, company_id, request_no, requested_by, branch_id, location_id, status)
values ('a9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'BSI-PR', 'a5000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'draft');
insert into public.purchase_request_lines (purchase_request_id, item_id, qty, uom, suggested_supplier_id)
values ('a9000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 1, 'KG', 'a6000000-0000-0000-0000-000000000001');
do $$ begin
  begin
    update public.purchase_requests set branch_id = 'a2000000-0000-0000-0000-000000000002' where id = 'a9000000-0000-0000-0000-000000000001';
    raise exception 'PR_BRANCH_CHANGE_ACCEPTED';
  exception when others then if sqlerrm = 'PR_BRANCH_CHANGE_ACCEPTED' then raise; end if; end;
  begin
    update public.purchase_request_lines set suggested_supplier_id = gen_random_uuid() where purchase_request_id = 'a9000000-0000-0000-0000-000000000001';
    raise exception 'FORGED_SUPPLIER_ACCEPTED';
  exception when others then if sqlerrm = 'FORGED_SUPPLIER_ACCEPTED' then raise; end if; end;
  update public.purchase_request_lines set suggested_supplier_id = null where purchase_request_id = 'a9000000-0000-0000-0000-000000000001';
  begin
    update public.purchase_requests set status = 'submitted' where id = 'a9000000-0000-0000-0000-000000000001';
    raise exception 'UNMAPPED_TRANSITION_ACCEPTED';
  exception when others then if sqlerrm = 'UNMAPPED_TRANSITION_ACCEPTED' then raise; end if; end;
  if not exists (select 1 from public.purchase_request_lines where purchase_request_id = 'a9000000-0000-0000-0000-000000000001' and suggested_supplier_id is null) then raise exception 'Failed transition changed draft lines'; end if;
end $$;

insert into public.purchase_orders (id, company_id, po_no, supplier_id, branch_id, status)
values ('aa000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'BSI-PO', 'a6000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', 'draft');
insert into public.purchase_order_lines (purchase_order_id, item_id, qty_ordered, uom, unit_price)
values ('aa000000-0000-0000-0000-000000000001', 'a7000000-0000-0000-0000-000000000001', 1, 'KG', 2);
do $$ begin
  begin
    update public.purchase_orders set branch_id = 'a2000000-0000-0000-0000-000000000002' where id = 'aa000000-0000-0000-0000-000000000001';
    raise exception 'PO_BRANCH_CHANGE_ACCEPTED';
  exception when others then if sqlerrm = 'PO_BRANCH_CHANGE_ACCEPTED' then raise; end if; end;
  begin
    update public.purchase_orders set supplier_id = gen_random_uuid() where id = 'aa000000-0000-0000-0000-000000000001';
    raise exception 'PO_SUPPLIER_CHANGE_ACCEPTED';
  exception when others then if sqlerrm = 'PO_SUPPLIER_CHANGE_ACCEPTED' then raise; end if; end;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000002', true);
do $$ begin
  if exists (select 1 from public.branch_supplier_items where branch_id = 'a2000000-0000-0000-0000-000000000001') then raise exception 'PJS kitchen could read ALMA mappings'; end if;
  begin
    perform public.save_branch_supplier_item_mappings('[{"branch_id":"a2000000-0000-0000-0000-000000000001","supplier_item_id":"a8000000-0000-0000-0000-000000000001","item_id":"a7000000-0000-0000-0000-000000000001","is_preferred":true}]', 'update');
    raise exception 'FORGED_BRANCH_MAPPING_ACCEPTED';
  exception when others then if sqlerrm = 'FORGED_BRANCH_MAPPING_ACCEPTED' then raise; end if; end;
end $$;

rollback;
\echo 'branch supplier item validation passed'
