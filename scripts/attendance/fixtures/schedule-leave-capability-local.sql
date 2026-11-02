-- LOCAL TEST DATABASE ONLY. Its Paid EL wrappers are absent: report false,
-- rather than enabling or installing any leave/payroll policy.
begin;
create or replace function public.schedule_leave_capabilities()
returns jsonb language sql stable security invoker set search_path=pg_catalog
as $$select jsonb_build_object('revision',1,'paid_emergency_leave',false)$$;
revoke all on function public.schedule_leave_capabilities() from public,anon;
grant execute on function public.schedule_leave_capabilities() to authenticated;
notify pgrst,'reload schema';
commit;
