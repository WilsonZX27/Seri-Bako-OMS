-- Read-only Production audit for migration 304.
select version,name from supabase_migrations.schema_migrations where version='304';

select json_build_object(
  'column_exists',exists(select 1 from information_schema.columns where table_schema='public' and table_name='staffs' and column_name='employment_end_date' and data_type='date'),
  'current_staff_id_has_end_guard',position('employment_end_date' in pg_get_functiondef('public.current_staff_id()'::regprocedure))>0,
  'current_staff_company_has_end_guard',position('employment_end_date' in pg_get_functiondef('public.current_staff_company_id()'::regprocedure))>0,
  'schedule_eligibility_has_end_guard',position('p_work_date<=s.employment_end_date' in pg_get_functiondef('public.is_staff_schedule_eligible(uuid,date)'::regprocedure))>0,
  'authenticated_eligibility_execute',has_function_privilege('authenticated','public.is_staff_schedule_eligible(uuid,date)','EXECUTE'),
  'anon_eligibility_execute',has_function_privilege('anon','public.is_staff_schedule_eligible(uuid,date)','EXECUTE')
) as verification;
