-- Local rehearsal candidate: app rollback first, drain import writers before this transaction.
-- Retain scoped guards, source provenance, revisions, approvals and receipts.
begin;
set local lock_timeout='5s';
lock table public.shift_assignment_revisions in share row exclusive mode;
revoke all on function public.import_schedule_template_drafts_atomic(date,text,text,jsonb,integer,jsonb,text) from public,anon,authenticated,service_role;
revoke all on function public.schedule_template_import_capabilities() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
