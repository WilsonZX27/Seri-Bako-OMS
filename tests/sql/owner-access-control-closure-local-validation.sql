\set ON_ERROR_STOP on
begin;

-- This disposable validation is intended for a fresh local migration replay.
-- It does not connect to or mutate production.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'bootstrap_first_admin'
      and pg_get_function_identity_arguments(p.oid) = ''
      and p.prosecdef
  ) then raise exception 'bootstrap_first_admin() is missing'; end if;
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    where c.oid = 'public.staffs'::regclass and t.tgname = 'prevent_owner_auth_relink'
  ) then raise exception 'Owner identity relink trigger is missing'; end if;
end $$;

select has_function_privilege('authenticated', 'public.bootstrap_first_admin(uuid)', 'execute') as authenticated_bootstrap_execute;
select has_function_privilege('service_role', 'public.bootstrap_first_admin(uuid)', 'execute') as service_role_bootstrap_execute;

rollback;
