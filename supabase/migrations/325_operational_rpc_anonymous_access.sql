-- Remove anonymous RPC execution while preserving existing authenticated/service access.
-- Reviewed against the linked-production function signatures on 2026-10-04.
-- Trigger execution does not depend on caller EXECUTE grants.
revoke execute on function public.refresh_stock_balances_summary_from_branch() from public, anon;
grant execute on function public.refresh_stock_balances_summary_from_branch() to authenticated;
grant execute on function public.refresh_stock_balances_summary_from_branch() to service_role;
revoke execute on function public.get_payables_attention_summary() from public, anon;
grant execute on function public.get_payables_attention_summary() to authenticated;
grant execute on function public.get_payables_attention_summary() to service_role;
revoke execute on function public.save_schedule_week(uuid,date,jsonb) from public, anon;
grant execute on function public.save_schedule_week(uuid,date,jsonb) to authenticated;
grant execute on function public.save_schedule_week(uuid,date,jsonb) to service_role;
revoke execute on function public.transition_stock_transfer_terminal_atomic(uuid,text) from public, anon;
grant execute on function public.transition_stock_transfer_terminal_atomic(uuid,text) to authenticated;
grant execute on function public.transition_stock_transfer_terminal_atomic(uuid,text) to service_role;
revoke execute on function public.recalculate_attendance_week(uuid) from public, anon;
grant execute on function public.recalculate_attendance_week(uuid) to authenticated;
grant execute on function public.recalculate_attendance_week(uuid) to service_role;
revoke execute on function public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text) from public, anon;
grant execute on function public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text) to authenticated;
grant execute on function public.submit_comp_time_transaction(uuid,uuid,date,text,integer,text,text) to service_role;
revoke execute on function public.submit_daily_attendance_report(uuid,text,integer,timestamp with time zone,timestamp with time zone,text,text,uuid) from public, anon;
grant execute on function public.submit_daily_attendance_report(uuid,text,integer,timestamp with time zone,timestamp with time zone,text,text,uuid) to authenticated;
grant execute on function public.submit_daily_attendance_report(uuid,text,integer,timestamp with time zone,timestamp with time zone,text,text,uuid) to service_role;
revoke execute on function public.decide_daily_attendance_report(uuid,text,text,text) from public, anon;
grant execute on function public.decide_daily_attendance_report(uuid,text,text,text) to authenticated;
grant execute on function public.decide_daily_attendance_report(uuid,text,text,text) to service_role;
revoke execute on function public.lock_attendance_period(date,uuid) from public, anon;
grant execute on function public.lock_attendance_period(date,uuid) to authenticated;
grant execute on function public.lock_attendance_period(date,uuid) to service_role;
revoke execute on function public.cancel_goods_receiving_atomic(uuid) from public, anon;
grant execute on function public.cancel_goods_receiving_atomic(uuid) to authenticated;
grant execute on function public.cancel_goods_receiving_atomic(uuid) to service_role;
revoke execute on function public.cancel_purchase_return_atomic(uuid) from public, anon;
grant execute on function public.cancel_purchase_return_atomic(uuid) to authenticated;
grant execute on function public.cancel_purchase_return_atomic(uuid) to service_role;
revoke execute on function public.transition_production_job_atomic(uuid,text,text) from public, anon;
grant execute on function public.transition_production_job_atomic(uuid,text,text) to authenticated;
grant execute on function public.transition_production_job_atomic(uuid,text,text) to service_role;
revoke execute on function public.transition_stock_wastage_terminal_atomic(uuid,text) from public, anon;
grant execute on function public.transition_stock_wastage_terminal_atomic(uuid,text) to authenticated;
grant execute on function public.transition_stock_wastage_terminal_atomic(uuid,text) to service_role;
revoke execute on function public.planning_manager() from public, anon;
grant execute on function public.planning_manager() to authenticated;
grant execute on function public.planning_manager() to service_role;
revoke execute on function public.planning_branch_access(uuid,uuid) from public, anon;
grant execute on function public.planning_branch_access(uuid,uuid) to authenticated;
grant execute on function public.planning_branch_access(uuid,uuid) to service_role;

-- Both functions use pg_catalog built-ins only; no user-controlled path resolution.
alter function public.set_updated_at() set search_path = pg_catalog;
alter function public.natural_sort_key(text) set search_path = pg_catalog;
