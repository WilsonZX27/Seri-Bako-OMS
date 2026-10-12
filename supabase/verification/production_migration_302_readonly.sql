-- Read-only Production verification for migration 302.
-- Expected: every boolean true, columns = 2, anon_execute = false.
select jsonb_build_object(
  'ledger',exists(
    select 1 from supabase_migrations.schema_migrations
    where version='302' and name='cross_outlet_projection_provenance'
  ),
  'columns',(
    select count(*) from information_schema.columns
    where table_schema='public' and table_name='shift_assignment_revisions'
      and column_name in ('projected_from_branch_id','projected_from_schedule_week_id')
  ),
  'pair_constraint',exists(
    select 1 from pg_constraint
    where conname='shift_assignment_projection_source_pair'
      and conrelid='public.shift_assignment_revisions'::regclass
  ),
  'unique_index',exists(
    select 1 from pg_indexes
    where schemaname='public' and tablename='shift_assignment_revisions'
      and indexname='schedule_assignment_one_current_projection'
  ),
  'save_security_definer',(
    select prosecdef from pg_proc
    where oid='public.save_schedule_week_with_destinations(uuid,date,jsonb)'::regprocedure
  ),
  'copy_security_definer',(
    select prosecdef from pg_proc
    where oid='public.copy_schedule_week(uuid,date)'::regprocedure
  ),
  'edit_security_definer',(
    select prosecdef from pg_proc
    where oid='public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text)'::regprocedure
  ),
  'save_has_exact_retraction',position(
    'projected_from_schedule_week_id=source_week.id'
    in pg_get_functiondef('public.save_schedule_week_with_destinations(uuid,date,jsonb)'::regprocedure)
  )>0,
  'copy_uses_structured_save',position(
    'save_schedule_week_with_destinations'
    in pg_get_functiondef('public.copy_schedule_week(uuid,date)'::regprocedure)
  )>0,
  'edit_uses_structured_save',position(
    'save_schedule_week_with_destinations'
    in pg_get_functiondef('public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text)'::regprocedure)
  )>0,
  'authenticated_execute',
    has_function_privilege('authenticated','public.save_schedule_week_with_destinations(uuid,date,jsonb)','execute')
    and has_function_privilege('authenticated','public.copy_schedule_week(uuid,date)','execute')
    and has_function_privilege('authenticated','public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text)','execute'),
  'anon_execute',
    has_function_privilege('anon','public.save_schedule_week_with_destinations(uuid,date,jsonb)','execute')
    or has_function_privilege('anon','public.copy_schedule_week(uuid,date)','execute')
    or has_function_privilege('anon','public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text)','execute'),
  'current_projections',(
    select count(*) from public.shift_assignment_revisions
    where is_current and projected_from_schedule_week_id is not null
  )
) as migration_302_readback;
