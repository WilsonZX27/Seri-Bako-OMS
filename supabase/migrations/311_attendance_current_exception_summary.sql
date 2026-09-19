-- Attendance overview must describe the current calculation, not immutable
-- superseded revisions retained for audit.  The partial index keeps the
-- current-week exception count bounded by tenant and live result.

create index if not exists attendance_exceptions_open_company_result_idx
  on public.attendance_exceptions(company_id, result_id)
  where resolved_at is null;

create or replace function public.get_attendance_workspace_summary(p_week_start date)
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare company uuid:=public.current_staff_company_id(); week_end date:=p_week_start+6;
  week_count integer; submitted_count integer; locked_count integer; latest jsonb;
begin
  if company is null or not public.has_permission('attendance.read') or extract(isodow from p_week_start)<>1 then
    raise exception 'Attendance workspace is not authorised.';
  end if;
  select count(*),count(*) filter(where status='submitted'),count(*) filter(where status='locked')
    into week_count,submitted_count,locked_count from public.schedule_weeks
   where company_id=company and week_start=p_week_start;
  select to_jsonb(b) into latest from (
    select id,parser_profile,file_name,status,row_count,error_count,warning_count,finalised_at
      from public.attendance_import_batches where company_id=company and week_start=p_week_start
     order by created_at desc limit 1
  ) b;
  return jsonb_build_object(
    'weekStart',p_week_start,'weekEnd',week_end,
    'pendingApprovals',submitted_count,
    'pendingRequests',(select count(*) from public.shift_change_requests where company_id=company and status in ('pending_supervisor','pending_manager')),
    'unresolvedExceptions',(select count(distinct e.result_id) from public.attendance_exceptions e join public.daily_attendance_results r on r.id=e.result_id where e.company_id=company and e.resolved_at is null and r.is_current and r.work_date between p_week_start and week_end),
    'pendingActualReports',(select count(*) from public.daily_attendance_reports where company_id=company and status='pending' and work_date between p_week_start and week_end),
    'missingMappings',(select count(distinct e.person_id) from public.attendance_raw_punch_events e where e.company_id=company and e.local_timestamp>=p_week_start::timestamp and e.local_timestamp<(week_end+1)::timestamp and not exists(select 1 from public.ngteco_person_mappings m where m.company_id=company and m.person_id=e.person_id and m.is_active)),
    'scheduleStatus',case when week_count=0 then 'not_started' when locked_count=week_count then 'locked' when submitted_count>0 then 'submitted' else 'draft' end,
    'latestBatch',latest,
    'activeLocks',(select count(*) from public.attendance_period_locks where company_id=company and week_start=p_week_start and unlocked_at is null)
  );
end $$;

revoke all on function public.get_attendance_workspace_summary(date) from public,anon;
grant execute on function public.get_attendance_workspace_summary(date) to authenticated;
notify pgrst,'reload schema';
