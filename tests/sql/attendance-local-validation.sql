begin;
do $$ declare missing text[]; begin
 select array_agg(required) into missing from unnest(array['schedule.read','schedule.draft','schedule.submit','schedule.approve','schedule.request','schedule.swap_review','schedule.lock','schedule.unlock','shift_template.manage','shift_template.non_standard','attendance.read','attendance.import','attendance.map','attendance.review','attendance.adjust','attendance.export','attendance.lock','attendance.reconcile']) required where not exists(select 1 from public.permissions p where p.permission_code=required);
 if cardinality(missing)>0 then raise exception 'Missing attendance permissions: %',missing; end if;
 if exists(select 1 from public.roles r join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where r.role_code='people_operations' and p.permission_code='schedule.approve') then raise exception 'People must not approve schedules'; end if;
 if exists(select 1 from public.roles r join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where r.role_code='manager' and p.permission_code in('schedule.unlock','shift_template.non_standard')) then raise exception 'Manager received Owner attendance authority'; end if;
 if not exists(select 1 from public.roles r join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where r.role_code='outlet_supervisor' and p.permission_code='schedule.swap_review') then raise exception 'Supervisor swap permission missing'; end if;
 if exists(select 1 from public.roles r join public.role_permissions rp on rp.role_id=r.id join public.permissions p on p.id=rp.permission_id where r.role_code='outlet_supervisor' and p.permission_code='schedule.approve') then raise exception 'Supervisor received Manager approval'; end if;
end $$;
do $$ declare relation text; begin
 foreach relation in array array['shift_templates','schedule_weeks','shift_assignment_revisions','schedule_approval_events','shift_change_requests','ngteco_person_mappings','ngteco_device_mappings','attendance_import_batches','attendance_raw_punch_events','attendance_import_batch_events','attendance_reconciliation_rows','daily_attendance_results','attendance_exceptions','attendance_adjustments','attendance_period_locks'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=relation and c.relrowsecurity) then raise exception '% lacks RLS',relation; end if;
  if not exists(select 1 from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=relation) then raise exception '% lacks policy',relation; end if;
 end loop;
end $$;
do $$ declare fn text; begin
 foreach fn in array array['save_schedule_week','copy_schedule_week','submit_schedule_week','decide_schedule_week','create_shift_change_request','review_shift_change_request','lock_schedule_week','unlock_schedule_week','upsert_shift_template','get_schedule_staff','get_schedule_branches','finalise_attendance_import','recalculate_attendance_week','adjust_attendance_result','lock_attendance_period','unlock_attendance_period','upsert_ngteco_person_mapping','upsert_ngteco_device_mapping'] loop
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=fn and p.prosecdef and 'search_path=public'=any(p.proconfig)) then raise exception '% is absent or unsafe',fn; end if;
 end loop;
end $$;
rollback;
