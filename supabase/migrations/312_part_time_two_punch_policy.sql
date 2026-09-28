-- Part-time attendance uses one work interval: IN and OUT only.
-- This removes the old >5-hour break expectation and repairs current rows so
-- stale missing-break blockers cannot prevent weekly close.

alter function public.recalculate_attendance_week(uuid)
  rename to recalculate_attendance_week_before_part_time_punch_policy;

create or replace function public.recalculate_attendance_week(p_batch_id uuid)
returns integer
language plpgsql security definer set search_path=public as $$
declare
  calculated integer;
  batch public.attendance_import_batches;
begin
  select * into batch
  from public.attendance_import_batches
  where id=p_batch_id and company_id=public.current_staff_company_id();
  if batch.id is null or batch.parser_profile<>'view_attendance_punch' then
    raise exception 'Attendance calculation is not authorised.';
  end if;

  select public.recalculate_attendance_week_before_part_time_punch_policy(p_batch_id)
    into calculated;

  update public.daily_attendance_results r
  set expected_punch_count=2,
      missing_punch_count=greatest(0,2-coalesce(r.actual_punch_count,0)),
      statuses=array_remove(array_remove(r.statuses,'missing_break_punch'),'short_break'),
      calculation=r.calculation||jsonb_build_object(
        'expected_punch_count',2,
        'part_time_punch_policy','in_out_only'
      )
  from public.staffs s
  where r.import_batch_id=p_batch_id
    and r.is_current
    and s.id=r.staff_id
    and s.employment_type='part_time';

  delete from public.attendance_exceptions e
  using public.daily_attendance_results r, public.staffs s
  where e.result_id=r.id
    and r.import_batch_id=p_batch_id
    and r.is_current
    and s.id=r.staff_id
    and s.employment_type='part_time'
    and e.exception_code in ('missing_break_punch','short_break');

  -- Repair existing current results as well, so a newly deployed policy does
  -- not leave a previous calculation blocking the week close indefinitely.
  update public.daily_attendance_results r
  set expected_punch_count=2,
      missing_punch_count=greatest(0,2-coalesce(r.actual_punch_count,0)),
      statuses=array_remove(array_remove(r.statuses,'missing_break_punch'),'short_break'),
      calculation=r.calculation||jsonb_build_object(
        'expected_punch_count',2,
        'part_time_punch_policy','in_out_only'
      )
  from public.staffs s
  where r.is_current
    and s.id=r.staff_id
    and s.employment_type='part_time';

  delete from public.attendance_exceptions e
  using public.daily_attendance_results r, public.staffs s
  where e.result_id=r.id
    and r.is_current
    and s.id=r.staff_id
    and s.employment_type='part_time'
    and e.exception_code in ('missing_break_punch','short_break');

  with totals as (
    select company_id,staff_id,date_trunc('month',work_date)::date month_start,
      sum(coalesce(missing_punch_count,0))::integer total
    from public.daily_attendance_results
    where is_current
    group by company_id,staff_id,date_trunc('month',work_date)::date
  )
  update public.daily_attendance_results r
  set monthly_missing_punch_count=totals.total
  from totals
  where r.is_current
    and r.company_id=totals.company_id
    and r.staff_id=totals.staff_id
    and date_trunc('month',r.work_date)::date=totals.month_start;

  return calculated;
end $$;

grant execute on function public.recalculate_attendance_week(uuid) to authenticated;
revoke all on function public.recalculate_attendance_week_before_part_time_punch_policy(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
