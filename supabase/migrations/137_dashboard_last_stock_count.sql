-- Add the latest posted stock count to the existing pre-aggregated dashboard snapshot.
-- This is a bounded summary lookup; raw stock-count lines and ledger rows remain drill-down data.

create index if not exists idx_stock_counts_dashboard_latest
  on public.stock_counts (count_date desc, posted_at desc, updated_at desc)
  where status = 'posted' and deleted_at is null;

create or replace function public.get_dashboard_core_snapshot(p_today date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
select jsonb_build_object(
  'total_items', (select count(*) from public.items),
  'total_suppliers', (select count(*) from public.suppliers),
  'inventory_value', (select coalesce(sum(inventory_value), 0) from public.stock_balances_summary),
  'low_stock_items_count', (select count(*) from public.stock_balances_summary where status = 'active' and is_low_stock),
  'negative_stock', (select count(*) from public.stock_balances_summary where current_qty < 0),
  'urgent_requests', coalesce((select jsonb_agg(to_jsonb(row_data)) from (select id, request_no, status, priority, needed_by_date from public.purchase_requests where priority in ('urgent', 'critical') and deleted_at is null order by needed_by_date asc nulls last limit 5) row_data), '[]'::jsonb),
  'purchase_requests', coalesce((select jsonb_agg(to_jsonb(row_data)) from (select id, request_no, status, priority from public.purchase_requests where deleted_at is null order by updated_at desc limit 5) row_data), '[]'::jsonb),
  'purchase_orders', coalesce((select jsonb_agg(to_jsonb(row_data)) from (select id, po_no, status, priority from public.purchase_orders where deleted_at is null order by updated_at desc limit 5) row_data), '[]'::jsonb),
  'recent_documents', coalesce((select jsonb_agg(to_jsonb(row_data)) from (select id, document_no, document_type from public.documents order by updated_at desc limit 6) row_data), '[]'::jsonb),
  'today_receiving', (select count(*) from public.goods_receivings where received_date = p_today and deleted_at is null),
  'stock_count_due', (select count(*) from public.stock_counts where status in ('draft', 'submitted', 'reviewed', 'approved') and deleted_at is null),
  'wastage_attention', (select count(*) from public.stock_wastage where status in ('draft', 'submitted') and deleted_at is null),
  'receiving_followup', (select count(*) from public.purchase_orders where status in ('sent', 'partial_received') and deleted_at is null),
  'production_today_posted', (select count(*) from public.production_jobs where status = 'posted' and production_date = p_today and deleted_at is null),
  'production_pending_approval', (select count(*) from public.production_jobs where status = 'submitted' and deleted_at is null),
  'production_ready_to_post', (select count(*) from public.production_jobs where status = 'approved' and deleted_at is null),
  'production_ingredient_shortages', (select count(*) from public.production_job_ingredient_lines where stock_available_qty < 0),
  'outlet_missing_evening', (select count(*) from public.outlet_daily_records where record_date = p_today and status in ('draft', 'morning_recorded')),
  'outlet_needs_review', (select count(*) from public.outlet_daily_records where status = 'evening_completed'),
  'last_stock_count', coalesce((
    select to_jsonb(row_data)
    from (
      select count_no, count_date, status
      from public.stock_counts
      where status = 'posted' and deleted_at is null
      order by count_date desc, posted_at desc nulls last, updated_at desc
      limit 1
    ) row_data
  ), 'null'::jsonb)
);
$$;

revoke all on function public.get_dashboard_core_snapshot(date) from public;
grant execute on function public.get_dashboard_core_snapshot(date) to authenticated;
