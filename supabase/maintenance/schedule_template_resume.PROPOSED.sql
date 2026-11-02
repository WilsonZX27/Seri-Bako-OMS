-- Resume only the previously installed exact candidate; do not rerun CREATE TABLE migration.
begin;
set local lock_timeout='5s';
lock table public.shift_assignment_revisions in share row exclusive mode;
revoke all on function public.import_schedule_template_drafts_atomic(date,text,text,jsonb,integer,jsonb,text) from public,anon,service_role;
revoke all on function public.schedule_template_import_capabilities() from public,anon,service_role;
grant execute on function public.import_schedule_template_drafts_atomic(date,text,text,jsonb,integer,jsonb,text) to authenticated;
grant execute on function public.schedule_template_import_capabilities() to authenticated;
notify pgrst,'reload schema';
commit;
