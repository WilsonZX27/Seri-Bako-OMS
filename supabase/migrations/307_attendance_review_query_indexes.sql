-- Bound attendance review scans to the selected outlet devices and week.
create index if not exists raw_punch_local_source_person_idx
  on public.attendance_raw_punch_events(local_timestamp, source_code, person_id);

create index if not exists daily_attendance_current_staff_month_idx
  on public.daily_attendance_results(staff_id, work_date)
  where is_current;
