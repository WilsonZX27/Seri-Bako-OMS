\set ON_ERROR_STOP on
begin;

select set_config('request.jwt.claim.role','service_role',true);

insert into public.companies (id, company_code, company_name)
values ('91000000-0000-0000-0000-000000000001', 'INV-GO-LIVE', 'Inventory Go-Live Validation');
insert into public.branches (id, company_id, branch_code, branch_name, branch_type)
values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'ALMA-T', 'ALMA Test', 'central_kitchen'),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'PJS10-T', 'PJS10 Test', 'outlet');
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('94000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'inventory.owner@example.invalid', now(), now()),
  ('94000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'inventory.kitchen@example.invalid', now(), now());
insert into public.staffs (id, company_id, auth_user_id, staff_code, full_name, email, default_branch_id)
values
  ('95000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', 'INV-OWNER-T', 'Inventory Owner Test', 'inventory.owner@example.invalid', '92000000-0000-0000-0000-000000000001'),
  ('95000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000002', 'INV-KITCHEN-T', 'Inventory Kitchen Test', 'inventory.kitchen@example.invalid', '92000000-0000-0000-0000-000000000001');
insert into public.roles(company_id,role_code,role_name) values
 ('91000000-0000-0000-0000-000000000001','super_admin','Super Admin / Owner'),
 ('91000000-0000-0000-0000-000000000001','kitchen','Kitchen');
insert into public.role_permissions(role_id,permission_id)
select distinct target.id,rp.permission_id from public.roles target join public.roles template on template.role_code=target.role_code and template.company_id is distinct from target.company_id join public.role_permissions rp on rp.role_id=template.id
where target.company_id='91000000-0000-0000-0000-000000000001' on conflict do nothing;
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select '95000000-0000-0000-0000-000000000001', id, null, true from public.roles where role_code = 'super_admin' and company_id='91000000-0000-0000-0000-000000000001';
insert into public.staff_roles (staff_id, role_id, branch_id, is_primary)
select '95000000-0000-0000-0000-000000000002', id, '92000000-0000-0000-0000-000000000001', true from public.roles where role_code = 'kitchen' and company_id='91000000-0000-0000-0000-000000000001';
insert into public.staff_branches (staff_id, branch_id, access_level, is_default)
values
  ('95000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'full', true),
  ('95000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', 'full', true);

insert into public.suppliers (id, company_id, supplier_code, name, status)
values ('96000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'INV-SUP-T', 'Inventory Supplier Test', 'active');
insert into public.items (id, company_id, item_code, item_name, category, purchase_unit, base_unit, cost, status)
values
  ('97000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'INV-ITEM-1', 'Canonical Inventory Item', 'Validation', 'KG', 'KG', 4, 'active'),
  ('97000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'INV-ITEM-2', 'Canonical Inventory Item Two', 'Validation', 'PCS', 'PCS', 2, 'active');
insert into public.supplier_items (
  id, company_id, supplier_id, item_id, supplier_item_code, supplier_item_name, purchase_uom, unit_cost
) values (
  '96500000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000001', 'INV-SUP-ITEM-1', 'Inventory Supplier Item One', 'KG', 4
);
insert into public.branch_supplier_items (branch_id, supplier_item_id, item_id, is_preferred)
values (
  '92000000-0000-0000-0000-000000000001', '96500000-0000-0000-0000-000000000001',
  '97000000-0000-0000-0000-000000000001', true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);

select public.post_opening_stock('INV-OPEN-A', '92000000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', current_date, 20, 4, 'ALMA opening');
select public.post_opening_stock('INV-OPEN-B', '92000000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000001', current_date, 7, 5, 'PJS10 opening');

do $$
declare a_qty numeric; b_qty numeric; before_count integer;
begin
  select current_qty into a_qty from public.stock_balances_view where item_id = '97000000-0000-0000-0000-000000000001' and branch_id = '92000000-0000-0000-0000-000000000001';
  select current_qty into b_qty from public.stock_balances_view where item_id = '97000000-0000-0000-0000-000000000001' and branch_id = '92000000-0000-0000-0000-000000000002';
  if a_qty <> 20 or b_qty <> 7 then raise exception 'Branch balances were not isolated'; end if;
  select count(*) into before_count from public.stock_transactions;
  begin
    perform public.post_opening_stock('INV-OPEN-DUP', '92000000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', current_date, 1, 4, 'duplicate');
    raise exception 'DUPLICATE_OPENING_ACCEPTED';
  exception when others then if sqlerrm = 'DUPLICATE_OPENING_ACCEPTED' then raise; end if; end;
  begin
    perform public.post_opening_stock('INV-OPEN-FORGED', '92000000-0000-0000-0000-000000000003', '97000000-0000-0000-0000-000000000002', current_date, 1, 2, 'unknown branch');
    raise exception 'FORGED_BRANCH_ACCEPTED';
  exception when others then if sqlerrm = 'FORGED_BRANCH_ACCEPTED' then raise; end if; end;
  if (select count(*) from public.stock_transactions) <> before_count then raise exception 'Failed opening-stock call changed the ledger'; end if;
  begin
    perform public.post_opening_stock_batch(jsonb_build_array(
      jsonb_build_object('transaction_no','INV-BATCH-VALID','branch_id','92000000-0000-0000-0000-000000000001','item_id','97000000-0000-0000-0000-000000000002','transaction_date',current_date,'quantity',3,'unit_cost',2,'remarks','valid row'),
      jsonb_build_object('transaction_no','INV-BATCH-BAD','branch_id','92000000-0000-0000-0000-000000000003','item_id','97000000-0000-0000-0000-000000000002','transaction_date',current_date,'quantity',3,'unit_cost',2,'remarks','unknown branch')
    ));
    raise exception 'PARTIAL_BATCH_ACCEPTED';
  exception when others then if sqlerrm = 'PARTIAL_BATCH_ACCEPTED' then raise; end if; end;
  if exists (select 1 from public.stock_transactions where transaction_no = 'INV-BATCH-VALID') then raise exception 'Failed batch left a partial opening-stock row'; end if;
end $$;

reset role;
insert into public.purchase_orders (id, company_id, po_no, supplier_id, branch_id, order_date, status, approval_status, idempotency_key)
values ('98000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'INV-PO-1', '96000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', current_date, 'approved', 'approved', '98000000-0000-4000-8000-000000000001');
insert into public.purchase_order_lines (id, purchase_order_id, item_id, qty_ordered, uom, unit_price)
values ('98100000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 10, 'KG', 4);
insert into public.documents (id, company_id, document_no, document_type, title, status, approval_status, current_step, related_entity_type, related_entity_id)
values
  ('98200000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'INV-GRN-1', 'goods_receiving', 'GRN Test', 'draft', 'not_required', 'Draft', 'goods_receiving', '98300000-0000-0000-0000-000000000001'),
  ('98200000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', 'INV-RET-1', 'purchase_return', 'Return Test', 'draft', 'not_required', 'Draft', 'purchase_return', '98500000-0000-0000-0000-000000000001'),
  ('98200000-0000-0000-0000-000000000003', '91000000-0000-0000-0000-000000000001', 'INV-COUNT-1', 'stock_count', 'Count Test', 'pending_approval', 'pending', 'Review', 'stock_count', '98700000-0000-0000-0000-000000000001');
insert into public.goods_receivings (id, company_id, document_id, purchase_order_id, grn_no, supplier_id, received_date, branch_id, status)
values ('98300000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', 'INV-GRN-1', '96000000-0000-0000-0000-000000000001', current_date, '92000000-0000-0000-0000-000000000001', 'draft');
insert into public.goods_receiving_lines (id, goods_receiving_id, purchase_order_line_id, item_id, ordered_qty, pending_qty, received_qty, rejected_qty, uom, unit_cost, received_base_qty, rejected_base_qty, conversion_to_base_uom_snapshot)
values ('98400000-0000-0000-0000-000000000001', '98300000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 10, 10, 12, 0, 'KG', 4, 12, 0, 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);
do $$ begin
  if exists (select 1 from public.stock_transactions where reference_type = 'goods_receiving' and reference_id = '98300000-0000-0000-0000-000000000001') then raise exception 'Draft GRN affected stock'; end if;
  begin
    perform public.post_goods_receiving_atomic('98300000-0000-0000-0000-000000000001', 'Paper DO unavailable during local test');
    raise exception 'OVER_RECEIPT_WITHOUT_REASON_POSTED';
  exception when others then if sqlerrm = 'OVER_RECEIPT_WITHOUT_REASON_POSTED' then raise; end if; end;
  if exists (select 1 from public.stock_transactions where reference_type = 'goods_receiving' and reference_id = '98300000-0000-0000-0000-000000000001') then raise exception 'Rejected over-receipt changed stock'; end if;
end $$;
reset role;
update public.goods_receiving_lines set over_receipt_reason='Supplier delivered two additional kilograms; accepted for kitchen demand.' where id='98400000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);
select public.post_goods_receiving_atomic('98300000-0000-0000-0000-000000000001', 'Paper DO unavailable during local test');
select public.post_goods_receiving_atomic('98300000-0000-0000-0000-000000000001', 'retry');
do $$ begin
  if not exists (select 1 from public.goods_receivings where id = '98300000-0000-0000-0000-000000000001' and status = 'posted') then raise exception 'GRN did not post'; end if;
  if (select qty_received from public.purchase_order_lines where id = '98100000-0000-0000-0000-000000000001') <> 12 then raise exception 'GRN did not retain the controlled over-receipt on the PO line'; end if;
  if (select status from public.purchase_orders where id = '98000000-0000-0000-0000-000000000001') <> 'received' then raise exception 'Over-received PO did not close as received'; end if;
  if (select count(*) from public.stock_transactions where reference_type = 'goods_receiving' and reference_id = '98300000-0000-0000-0000-000000000001') <> 1 then raise exception 'GRN traceability failed'; end if;
end $$;

reset role;
insert into public.purchase_returns (id, company_id, document_id, purchase_return_no, goods_receiving_id, purchase_order_id, supplier_id, branch_id, return_date, status)
values ('98500000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000002', 'INV-RET-1', '98300000-0000-0000-0000-000000000001', '98000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', current_date, 'draft');
insert into public.purchase_return_lines (id, purchase_return_id, goods_receiving_line_id, purchase_order_line_id, item_id, received_qty, previously_returned_qty, return_qty, uom, unit_cost)
values ('98600000-0000-0000-0000-000000000001', '98500000-0000-0000-0000-000000000001', '98400000-0000-0000-0000-000000000001', '98100000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 5, 0, 2, 'KG', 4);
insert into public.stock_counts (id, company_id, document_id, count_no, count_date, branch_id, status, tolerance_percent)
values ('98700000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '98200000-0000-0000-0000-000000000003', 'INV-COUNT-1', current_date, '92000000-0000-0000-0000-000000000001', 'reviewed', 2);
insert into public.stock_count_lines (id, stock_count_id, item_id, theoretical_qty, physical_qty, uom)
values ('98800000-0000-0000-0000-000000000001', '98700000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 25, 20, 'KG');

set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);
select public.post_purchase_return_atomic('98500000-0000-0000-0000-000000000001');
select public.post_purchase_return_atomic('98500000-0000-0000-0000-000000000001');
do $$
begin
  if (select returned_qty from public.goods_receiving_lines where id = '98400000-0000-0000-0000-000000000001') <> 2 then raise exception 'Return did not update received line'; end if;
  if not exists (select 1 from public.purchase_return_lines where id = '98600000-0000-0000-0000-000000000001' and stock_transaction_id is not null) then raise exception 'Return traceability failed'; end if;
  if (select count(*) from public.stock_transactions where reference_type = 'purchase_return' and reference_id = '98500000-0000-0000-0000-000000000001') <> 1 then raise exception 'Retried return double-posted'; end if;
  begin
    perform public.approve_stock_count_atomic('98700000-0000-0000-0000-000000000001');
    raise exception 'HIGH_VARIANCE_WITHOUT_EVIDENCE_APPROVED';
  exception when others then if sqlerrm = 'HIGH_VARIANCE_WITHOUT_EVIDENCE_APPROVED' then raise; end if; end;
  if (select status from public.stock_counts where id = '98700000-0000-0000-0000-000000000001') <> 'reviewed' then raise exception 'Failed approval changed workflow state'; end if;
end $$;

reset role;
insert into public.attachments (company_id, entity_type, entity_id, file_name, file_path, status)
values ('91000000-0000-0000-0000-000000000001', 'document', '98200000-0000-0000-0000-000000000003', 'count-evidence.jpg', 'local/count-evidence.jpg', 'active');
set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);
select public.approve_stock_count_atomic('98700000-0000-0000-0000-000000000001');
do $$ begin
  begin
    perform public.approve_stock_count_atomic('98700000-0000-0000-0000-000000000001');
    raise exception 'RACING_APPROVAL_ACCEPTED';
  exception when others then if sqlerrm = 'RACING_APPROVAL_ACCEPTED' then raise; end if; end;
end $$;
select public.post_stock_count_atomic('98700000-0000-0000-0000-000000000001');
do $$ begin
  if (select count(*) from public.stock_transactions where reference_type = 'stock_count' and reference_id = '98700000-0000-0000-0000-000000000001') <> 1 then raise exception 'Stock count traceability failed'; end if;
end $$;

select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000002', true);
do $$ begin
  if (select count(*) from public.stock_balances_view where branch_id = '92000000-0000-0000-0000-000000000002') <> 0 then raise exception 'Kitchen user can read another branch balance'; end if;
  if public.can_access_inventory_branch('91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000002') then raise exception 'Kitchen user can access another branch'; end if;
end $$;

reset role;
rollback;
