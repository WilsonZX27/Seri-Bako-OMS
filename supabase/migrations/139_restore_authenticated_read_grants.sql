-- Restore API read grants for the authenticated identity/read models and bounded
-- dashboard source tables introduced before/after the tenant-boundary
-- hardening migration. RLS remains the authoritative tenant and permission
-- boundary for every row returned by these tables. These grants are required
-- by the security-invoker dashboard RPC; they do not widen the rows visible
-- to a staff member.

grant select on table public.companies to authenticated;
grant select on table public.staffs to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.stock_balances_summary to authenticated;
grant select on table public.inventory_daily_summary to authenticated;

-- The dashboard snapshot reads these tables as the authenticated caller. A
-- missing table grant makes the entire JSON RPC fail with 42501, which used to
-- collapse every operational metric to "Unavailable" even when the RLS
-- policies allowed the staff member to see the underlying rows.
grant select on table public.purchase_requests to authenticated;
grant select on table public.purchase_request_lines to authenticated;
grant select on table public.purchase_orders to authenticated;
grant select on table public.purchase_order_lines to authenticated;
grant select on table public.documents to authenticated;
grant select on table public.goods_receivings to authenticated;
grant select on table public.goods_receiving_lines to authenticated;
grant select on table public.stock_counts to authenticated;
grant select on table public.stock_count_lines to authenticated;
grant select on table public.stock_wastage to authenticated;
grant select on table public.stock_wastage_lines to authenticated;
grant select on table public.production_jobs to authenticated;
grant select on table public.production_job_ingredient_lines to authenticated;
grant select on table public.outlet_daily_records to authenticated;
