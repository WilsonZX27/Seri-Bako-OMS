-- Branch-level inventory is the operational truth.
-- Location fields remain only as a temporary write-path compatibility layer and
-- are deliberately not used by any balance, valuation, or low-stock calculation.

drop view if exists public.low_stock_items;
drop view if exists public.inventory_valuation_view;
drop view if exists public.stock_balances_view;
drop view if exists public.item_location_stock_balances;
drop view if exists public.stock_ledger_view;
drop view if exists public.stock_counts_list_view;

create view public.stock_ledger_view as
select
  st.id as stock_transaction_id,
  st.transaction_no,
  st.transaction_date,
  st.transaction_type,
  st.status,
  st.document_id,
  st.reference_type,
  st.reference_id,
  st.created_by,
  st.posted_at,
  stl.id as stock_transaction_line_id,
  coalesce(stl.item_id, st.item_id) as item_id,
  i.item_code,
  i.item_name,
  i.base_unit,
  coalesce(stl.branch_id, st.branch_id) as branch_id,
  b.branch_name,
  null::uuid as location_id,
  null::text as location_name,
  coalesce(stl.quantity_in, st.quantity_in) as quantity_in,
  coalesce(stl.quantity_out, st.quantity_out) as quantity_out,
  coalesce(stl.unit_cost, st.unit_cost, 0) as unit_cost,
  coalesce(stl.total_cost, st.total_cost, coalesce(st.unit_cost, 0) * greatest(st.quantity_in, st.quantity_out)) as total_cost,
  sum(coalesce(stl.quantity_in, st.quantity_in) - coalesce(stl.quantity_out, st.quantity_out))
    over (
      partition by coalesce(stl.item_id, st.item_id), coalesce(stl.branch_id, st.branch_id)
      order by st.transaction_date, st.created_at, st.id
      rows between unbounded preceding and current row
    ) as running_balance
from public.stock_transactions st
left join public.stock_transaction_lines stl on stl.stock_transaction_id = st.id
join public.items i on i.id = coalesce(stl.item_id, st.item_id)
left join public.branches b on b.id = coalesce(stl.branch_id, st.branch_id)
where st.status = 'posted';

create view public.inventory_valuation_view as
select
  item_id,
  item_code,
  item_name,
  base_unit,
  branch_id,
  branch_name,
  null::uuid as location_id,
  null::text as location_name,
  sum(quantity_in) as total_quantity_in,
  sum(quantity_out) as total_quantity_out,
  sum(quantity_in - quantity_out) as current_qty,
  case when sum(quantity_in) > 0 then sum(case when quantity_in > 0 then total_cost else 0 end) / sum(quantity_in) else 0 end as average_cost,
  sum(quantity_in - quantity_out) * case when sum(quantity_in) > 0 then sum(case when quantity_in > 0 then total_cost else 0 end) / sum(quantity_in) else 0 end as inventory_value,
  max(transaction_date) as last_movement
from public.stock_ledger_view
group by item_id, item_code, item_name, base_unit, branch_id, branch_name;

create view public.stock_balances_view as
select
  ledger.item_id,
  ledger.item_code,
  i.autocount_code,
  ledger.item_name,
  i.category,
  i.purchase_unit,
  ledger.base_unit,
  i.conversion_to_base_unit,
  i.supplier_id,
  s.name as supplier_name,
  i.cost,
  i.safety_stock,
  i.lead_time_days,
  i.moq,
  i.status,
  ledger.branch_id,
  ledger.branch_name,
  null::uuid as location_id,
  null::text as location_name,
  sum(ledger.quantity_in) as total_quantity_in,
  sum(ledger.quantity_out) as total_quantity_out,
  sum(ledger.quantity_in - ledger.quantity_out) as current_stock,
  sum(ledger.quantity_in - ledger.quantity_out) as current_qty,
  case when sum(ledger.quantity_in) > 0 then sum(case when ledger.quantity_in > 0 then ledger.total_cost else 0 end) / sum(ledger.quantity_in) else 0 end as average_cost,
  sum(ledger.quantity_in - ledger.quantity_out) * case when sum(ledger.quantity_in) > 0 then sum(case when ledger.quantity_in > 0 then ledger.total_cost else 0 end) / sum(ledger.quantity_in) else 0 end as inventory_value,
  max(ledger.transaction_date) as last_movement,
  sum(ledger.quantity_in - ledger.quantity_out) < i.safety_stock as is_low_stock,
  greatest(i.safety_stock - sum(ledger.quantity_in - ledger.quantity_out), 0) as shortage_quantity
from public.stock_ledger_view ledger
join public.items i on i.id = ledger.item_id
left join public.suppliers s on s.id = i.supplier_id
group by
  ledger.item_id, ledger.item_code, i.autocount_code, ledger.item_name, i.category, i.purchase_unit,
  ledger.base_unit, i.conversion_to_base_unit, i.supplier_id, s.name, i.cost, i.safety_stock,
  i.lead_time_days, i.moq, i.status, ledger.branch_id, ledger.branch_name;

create view public.low_stock_items as
select item_id, item_code, item_name, category, base_unit, supplier_id, supplier_name,
  current_stock, safety_stock, shortage_quantity, moq, lead_time_days, cost
from public.stock_balances_view
where is_low_stock = true and status = 'active'
order by shortage_quantity desc, item_name asc;

create view public.stock_counts_list_view as
select
  sc.*,
  b.branch_name,
  null::text as location_name,
  counted.full_name as counted_by_name,
  count(scl.id)::integer as line_count,
  count(scl.id) filter (where abs(scl.variance_percent) > sc.tolerance_percent)::integer as high_variance_count
from public.stock_counts sc
left join public.branches b on b.id = sc.branch_id
left join public.staffs counted on counted.id = sc.counted_by
left join public.stock_count_lines scl on scl.stock_count_id = sc.id
where sc.deleted_at is null
group by sc.id, b.branch_name, counted.full_name;

-- Recreating a view resets its grants and security mode. Keep reads subject to
-- the caller's underlying-table RLS policies; views must never become a tenant
-- isolation bypass merely because they are a read model.
alter view public.stock_ledger_view set (security_invoker = true);
alter view public.inventory_valuation_view set (security_invoker = true);
alter view public.stock_balances_view set (security_invoker = true);
alter view public.low_stock_items set (security_invoker = true);
alter view public.stock_counts_list_view set (security_invoker = true);
revoke all on public.stock_ledger_view, public.inventory_valuation_view, public.stock_balances_view, public.low_stock_items, public.stock_counts_list_view from public, anon;
grant select on public.stock_ledger_view, public.inventory_valuation_view, public.stock_balances_view, public.low_stock_items, public.stock_counts_list_view to authenticated;

comment on view public.stock_ledger_view is
  'Branch-level inventory ledger. Location columns are null compatibility placeholders pending removal of the legacy write path.';
