-- REVIEW ONLY: do not install without full live body/ACL baseline comparison.
-- Proposed ordering: movement count (not cross-unit quantity). Existing JSON name/qty retained.
-- No grants, policies, table writes, backfills or migration number.
create or replace function public.get_inventory_dashboard_summary(p_period text default '30d')
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with params as (
  select case
    when p_period = '7d' then current_date - 7
    when p_period = 'month' then date_trunc('month', current_date)::date
    else current_date - 30
  end as period_start
), visible_branches as (
  select b.id, b.company_id
  from public.branches b
  where public.can_access_inventory_branch(b.company_id, b.id)
), visible_balances as (
  select s.*
  from public.stock_balances_summary s
  join visible_branches vb on vb.id = s.branch_id and vb.company_id = s.company_id
), daily_rows as (
  select d.*
  from public.inventory_daily_summary d
  join visible_branches vb on vb.id = d.branch_id and vb.company_id = d.company_id
  cross join params p
  where d.transaction_date >= p.period_start
), top_purchased as (
  select i.id as item_id, i.item_code, i.item_name as name,
    i.base_unit, sum(d.quantity_in) as qty, sum(d.movement_count) as movement_count
  from daily_rows d
  join public.items i on i.id = d.item_id
  where d.transaction_type = 'purchase' and d.quantity_in > 0
  group by i.id, i.item_code, i.item_name, i.base_unit
  order by movement_count desc, i.id asc limit 5
), top_consumed as (
  select i.id as item_id, i.item_code, i.item_name as name,
    i.base_unit, sum(d.quantity_out) as qty, sum(d.movement_count) as movement_count
  from daily_rows d
  join public.items i on i.id = d.item_id
  where d.transaction_type = 'production_usage' and d.quantity_out > 0
  group by i.id, i.item_code, i.item_name, i.base_unit
  order by movement_count desc, i.id asc limit 5
)
select jsonb_build_object(
  'inventory_value', coalesce((select sum(inventory_value) from visible_balances), 0),
  'total_active_items', coalesce((select count(distinct item_id) from visible_balances where status = 'active'), 0),
  'low_stock_items_count', coalesce((select count(*) from visible_balances where status = 'active' and is_low_stock), 0),
  'negative_stock', coalesce((select count(*) from visible_balances where current_qty < 0), 0),
  'todays_movements', coalesce((select sum(movement_count) from daily_rows where transaction_date = current_date), 0),
  'todays_receiving', coalesce((select count(*) from public.goods_receivings gr join visible_branches vb on vb.id = gr.branch_id where gr.received_date = current_date and gr.deleted_at is null), 0),
  'todays_transfers', coalesce((select sum(movement_count) from daily_rows where transaction_date = current_date and transaction_type in ('transfer_in', 'transfer_out')), 0),
  'pending_adjustments', coalesce((select count(*) from public.stock_counts sc join visible_branches vb on vb.id = sc.branch_id where sc.status in ('reviewed', 'approved') and sc.deleted_at is null), 0),
  'stock_count_due', coalesce((select count(*) from public.stock_counts sc join visible_branches vb on vb.id = sc.branch_id where sc.status in ('draft', 'submitted', 'reviewed', 'approved') and sc.deleted_at is null), 0),
  'recent_transactions', '[]'::jsonb,
  'top_purchased_items', coalesce((select jsonb_agg(to_jsonb(top_purchased) order by top_purchased.movement_count desc, top_purchased.item_id) from top_purchased), '[]'::jsonb),
  'top_consumed_items', coalesce((select jsonb_agg(to_jsonb(top_consumed) order by top_consumed.movement_count desc, top_consumed.item_id) from top_consumed), '[]'::jsonb),
  'low_stock_rows', coalesce((select jsonb_agg(to_jsonb(low_rows)) from (select * from visible_balances where status = 'active' and is_low_stock order by shortage_quantity desc, item_name asc limit 5) low_rows), '[]'::jsonb)
);
$$;
