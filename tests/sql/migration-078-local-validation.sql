\set ON_ERROR_STOP on
begin;

insert into public.companies (id, company_code, company_name)
values ('81000000-0000-0000-0000-000000000001', 'M078-LOCAL', 'Migration 078 Local Validation');
insert into public.branches (id, company_id, branch_code, branch_name, branch_type)
values
  ('82000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'M078-A', 'Migration 078 Branch A', 'central_kitchen'),
  ('82000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', 'M078-B', 'Migration 078 Branch B', 'outlet');
insert into public.locations (id, company_id, branch_id, location_code, location_name, location_type)
values
  ('83000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'M078-A-STORE', 'Branch A Store', 'dry_store'),
  ('83000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', 'M078-B-STORE', 'Branch B Store', 'dry_store');
insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('84000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'migration078.local@example.invalid', now(), now());
insert into public.staffs (id, company_id, auth_user_id, staff_code, full_name, email, default_branch_id)
values ('85000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'M078-OWNER', 'Migration 078 Owner', 'migration078.local@example.invalid', '82000000-0000-0000-0000-000000000001');
insert into public.roles(company_id,role_code,role_name) values ('81000000-0000-0000-0000-000000000001','super_admin','Super Admin / Owner');
insert into public.role_permissions(role_id,permission_id)
select distinct target.id,rp.permission_id from public.roles target join public.roles template on template.role_code=target.role_code and template.company_id is distinct from target.company_id join public.role_permissions rp on rp.role_id=template.id
where target.company_id='81000000-0000-0000-0000-000000000001' on conflict do nothing;
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select '85000000-0000-0000-0000-000000000001', id, null, true from public.roles where role_code = 'super_admin' and company_id='81000000-0000-0000-0000-000000000001';
insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
values ('85000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'full', true);

insert into public.suppliers (id, company_id, supplier_code, name, status)
values ('86000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'M078-SUP', 'Migration 078 Supplier', 'active');
insert into public.items (id, company_id, item_code, item_name, category, purchase_unit, base_unit, cost, status)
values
  ('87000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'M078-A1', 'Branch A Item One', 'Validation', 'KG', 'KG', 3.25, 'active'),
  ('87000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', 'M078-A2', 'Branch A Item Two', 'Validation', 'PCS', 'PCS', 4.50, 'active'),
  ('87000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000001', 'M078-B1', 'Branch B Only Item', 'Validation', 'KG', 'KG', 5.75, 'active');
insert into public.supplier_items (
  id, company_id, supplier_id, item_id, supplier_item_code, supplier_item_name, purchase_uom, unit_cost
) values (
  '86500000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', '86000000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000001', 'M078-SUP-A1', 'Migration 078 Item One', 'KG', 3.25
);
insert into public.branch_supplier_items (branch_id, supplier_item_id, item_id, is_preferred)
values (
  '82000000-0000-0000-0000-000000000001', '86500000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000001', true
);
insert into public.stock_transactions (
  id, item_id, location_id, branch_id, transaction_type, transaction_no, transaction_date,
  quantity_in, quantity_out, unit_cost, total_cost, status, posted_at
)
values
  ('88000000-0000-0000-0000-000000000001', '87000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'opening_balance', 'M078-ST-A1', current_date, 10, 0, 3.25, 32.50, 'posted', now()),
  ('88000000-0000-0000-0000-000000000002', '87000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', 'opening_balance', 'M078-ST-A2', current_date, 10, 0, 4.50, 45.00, 'posted', now()),
  ('88000000-0000-0000-0000-000000000003', '87000000-0000-0000-0000-000000000003', '83000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000002', 'opening_balance', 'M078-ST-B1', current_date, 10, 0, 5.75, 57.50, 'posted', now());

insert into public.purchase_requests (
  id, company_id, request_no, requested_by, request_date, required_date, priority, needed_by_date,
  urgency_reason, production_risk, branch_id, location_id, status, remarks, updated_at
)
values (
  '89000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'M078-PR-1',
  '85000000-0000-0000-0000-000000000001', '2026-07-01', '2026-07-08', 'urgent', '2026-07-07',
  'Original urgency', true, '82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001',
  'draft', 'Original remarks', '2026-07-01 01:02:03+00'
);
insert into public.purchase_request_lines (
  id, purchase_request_id, item_id, qty, uom, estimated_unit_cost, suggested_supplier_id, reason, remarks
)
values (
  '8a000000-0000-0000-0000-000000000001', '89000000-0000-0000-0000-000000000001',
  '87000000-0000-0000-0000-000000000001', 2.5, 'KG', 3.25,
  '86000000-0000-0000-0000-000000000001', 'Original reason', 'Original line remarks'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '84000000-0000-0000-0000-000000000001', true);

select public.update_draft_purchase_request(
  '89000000-0000-0000-0000-000000000001', '2026-07-01 01:02:03+00',
  '82000000-0000-0000-0000-000000000001', '2026-07-01', '2026-07-08', 'urgent', '2026-07-07',
  'Original urgency', true, 'Original remarks',
  '[{"item_id":"87000000-0000-0000-0000-000000000001","qty":2.5,"uom":"KG","estimated_unit_cost":3.25,"suggested_supplier_id":"86000000-0000-0000-0000-000000000001","reason":"Original reason","remarks":"Original line remarks","branch_id":"82000000-0000-0000-0000-000000000001"}]'::jsonb
);

do $$
declare current_version timestamptz; baseline_lines jsonb;
begin
  select updated_at into current_version from public.purchase_requests where id = '89000000-0000-0000-0000-000000000001';
  select jsonb_agg(to_jsonb(line) order by line.item_id) into baseline_lines
  from public.purchase_request_lines line where purchase_request_id = '89000000-0000-0000-0000-000000000001';
  if not exists (
    select 1 from public.purchase_requests
    where id = '89000000-0000-0000-0000-000000000001'
      and request_date = '2026-07-01' and required_date = '2026-07-08' and priority = 'urgent'
      and needed_by_date = '2026-07-07' and urgency_reason = 'Original urgency' and production_risk
      and remarks = 'Original remarks' and branch_id = '82000000-0000-0000-0000-000000000001'
      and location_id = '83000000-0000-0000-0000-000000000001'
  ) then raise exception 'Successful edit did not preserve all draft header fields'; end if;
  if not exists (
    select 1 from public.purchase_request_lines
    where purchase_request_id = '89000000-0000-0000-0000-000000000001'
      and item_id = '87000000-0000-0000-0000-000000000001' and qty = 2.5 and uom = 'KG'
      and estimated_unit_cost = 3.25 and suggested_supplier_id = '86000000-0000-0000-0000-000000000001'
      and reason = 'Original reason' and remarks = 'Original line remarks'
  ) then raise exception 'Successful edit did not preserve all draft line fields'; end if;

  begin
    perform public.update_draft_purchase_request(
      '89000000-0000-0000-0000-000000000001', current_version, '82000000-0000-0000-0000-000000000002',
      '2026-07-01', '2026-07-08', 'urgent', '2026-07-07', 'Original urgency', true, 'Original remarks',
      '[{"item_id":"87000000-0000-0000-0000-000000000001","qty":2.5,"uom":"KG","estimated_unit_cost":3.25,"branch_id":"82000000-0000-0000-0000-000000000001"}]'::jsonb
    );
    raise exception 'FORGED_BRANCH_ACCEPTED';
  exception when others then
    if sqlerrm = 'FORGED_BRANCH_ACCEPTED' or sqlerrm not like '%branch cannot be changed%' then raise; end if;
  end;

  begin
    perform public.update_draft_purchase_request(
      '89000000-0000-0000-0000-000000000001', current_version, '82000000-0000-0000-0000-000000000001',
      '2026-07-01', '2026-07-08', 'urgent', '2026-07-07', 'Original urgency', true, 'Original remarks',
      '[{"item_id":"87000000-0000-0000-0000-000000000001","qty":1,"uom":"KG","estimated_unit_cost":3.25,"branch_id":"82000000-0000-0000-0000-000000000001"},{"item_id":"87000000-0000-0000-0000-000000000002","qty":1,"uom":"PCS","estimated_unit_cost":4.5,"branch_id":"82000000-0000-0000-0000-000000000002"}]'::jsonb
    );
    raise exception 'MIXED_BRANCH_ACCEPTED';
  exception when others then
    if sqlerrm = 'MIXED_BRANCH_ACCEPTED' or sqlerrm not like '%Mixed-branch%' then raise; end if;
  end;

  begin
    perform public.update_draft_purchase_request(
      '89000000-0000-0000-0000-000000000001', current_version, '82000000-0000-0000-0000-000000000001',
      '2026-07-01', '2026-07-08', 'urgent', '2026-07-07', 'Original urgency', true, 'Original remarks',
      '[{"item_id":"87000000-0000-0000-0000-000000000003","qty":1,"uom":"KG","estimated_unit_cost":5.75,"branch_id":"82000000-0000-0000-0000-000000000001"}]'::jsonb
    );
    raise exception 'CROSS_BRANCH_ITEM_ACCEPTED';
  exception when others then
    if sqlerrm = 'CROSS_BRANCH_ITEM_ACCEPTED' or sqlerrm not like '%active and available%' then raise; end if;
  end;

  begin
    perform public.update_draft_purchase_request(
      '89000000-0000-0000-0000-000000000001', current_version, '82000000-0000-0000-0000-000000000001',
      '2026-07-01', '2026-07-08', 'urgent', '2026-07-07', 'Original urgency', true, 'Original remarks',
      '[{"item_id":"87000000-0000-0000-0000-000000000001","qty":1,"uom":"KG","estimated_unit_cost":3.25,"branch_id":"82000000-0000-0000-0000-000000000001"},{"item_id":"87000000-0000-0000-0000-000000000001","qty":2,"uom":"KG","estimated_unit_cost":3.25,"branch_id":"82000000-0000-0000-0000-000000000001"}]'::jsonb
    );
    raise exception 'DUPLICATE_ITEM_ACCEPTED';
  exception when others then
    if sqlerrm = 'DUPLICATE_ITEM_ACCEPTED' or sqlerrm not like '%only once%' then raise; end if;
  end;

  begin
    perform public.update_draft_purchase_request(
      '89000000-0000-0000-0000-000000000001', '2026-07-01 01:02:03+00', '82000000-0000-0000-0000-000000000001',
      '2026-07-01', '2026-07-08', 'urgent', '2026-07-07', 'Original urgency', true, 'Original remarks',
      '[{"item_id":"87000000-0000-0000-0000-000000000001","qty":9,"uom":"KG","estimated_unit_cost":3.25,"branch_id":"82000000-0000-0000-0000-000000000001"}]'::jsonb
    );
    raise exception 'STALE_UPDATE_ACCEPTED';
  exception when others then
    if sqlerrm = 'STALE_UPDATE_ACCEPTED' or sqlerrm not like '%changed after you opened%' then raise; end if;
  end;

  if baseline_lines is distinct from (
    select jsonb_agg(to_jsonb(line) order by line.item_id)
    from public.purchase_request_lines line where purchase_request_id = '89000000-0000-0000-0000-000000000001'
  ) then raise exception 'A failed RPC changed existing draft lines'; end if;
end
$$;

reset role;
insert into public.stock_counts (id, company_id, count_no, count_date, branch_id, location_id, counted_by, status)
values
  ('8b000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000001', 'M078-SC-REVIEWED', current_date, '82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', 'reviewed'),
  ('8b000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', 'M078-SC-DRAFT', current_date, '82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', 'draft'),
  ('8b000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000001', 'M078-SC-RACE', current_date, '82000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', '85000000-0000-0000-0000-000000000001', 'reviewed');
set local role authenticated;
select set_config('request.jwt.claim.sub', '84000000-0000-0000-0000-000000000001', true);
do $$
declare affected integer;
begin
  update public.stock_counts set status = 'approved' where id = '8b000000-0000-0000-0000-000000000001' and status in ('reviewed');
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Reviewed stock count conditional approval failed'; end if;
  update public.stock_counts set status = 'approved' where id = '8b000000-0000-0000-0000-000000000002' and status in ('reviewed');
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Invalid stock count workflow state was approved'; end if;
  update public.stock_counts set status = 'submitted' where id = '8b000000-0000-0000-0000-000000000003';
  update public.stock_counts set status = 'approved' where id = '8b000000-0000-0000-0000-000000000003' and status in ('reviewed');
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale/racing stock count approval succeeded'; end if;
end
$$;

reset role;
rollback;
\echo 'Migration 078 and stock-count conditional-state local validation passed.'
