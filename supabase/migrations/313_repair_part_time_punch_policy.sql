-- Repair current attendance rows after deploying the part-time two-punch policy.
-- Migration 312 changes future recalculation behavior; this migration applies
-- the same normalization to rows that were already calculated.

begin;

update public.daily_attendance_results r
set expected_punch_count=2,
    missing_punch_count=greatest(0,2-coalesce(r.actual_punch_count,0)),
    statuses=array_remove(array_remove(r.statuses,'missing_break_punch'),'short_break'),
    calculation=coalesce(r.calculation,'{}'::jsonb)||jsonb_build_object(
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

commit;

notify pgrst,'reload schema';
