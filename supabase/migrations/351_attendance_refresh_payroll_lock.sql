-- Local integration candidate. Apply only after 348, 349 and 350.
-- Based on schedule worker f4b08aae; preserves its scoped partial refresh logic.
-- Released payroll enters needs_review before any attendance calculation write.
create or replace function public.refresh_schedule_attendance(p_week_start date,p_branch_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare candidate public.attendance_schedule_refresh; job public.attendance_schedule_refresh; batch_id uuid; protected_result boolean; count_days integer:=0; changed integer; outcomes jsonb:='[]';
begin
 if not public.has_any_permission(array['attendance.import','attendance.adjust']) then raise exception 'Attendance calculation is not authorised.'; end if;
 if p_week_start is null or extract(isodow from p_week_start)<>1 then raise exception 'A Monday week is required.'; end if;
 for candidate in select * from public.attendance_schedule_refresh q
  where q.company_id=public.current_staff_company_id() and q.work_date between p_week_start and p_week_start+6
   and (p_branch_id is null or q.branch_id=p_branch_id) and public.can_access_company_branch(q.company_id,q.branch_id)
   and q.status in ('pending','failed','waiting_punches') order by q.staff_id,q.work_date limit 100
 loop
  -- Review/source writers acquire the employee lock before queue/result locks.
  -- Use the same order here, then reread the job: another worker may have
  -- completed it while this transaction waited for the employee lock.
  perform public.attestation_lock(candidate.staff_id);
  select * into job from public.attendance_schedule_refresh q
   where q.company_id=candidate.company_id and q.staff_id=candidate.staff_id and q.work_date=candidate.work_date
    and q.status in ('pending','failed','waiting_punches')
    and (p_branch_id is null or q.branch_id=p_branch_id) and public.can_access_company_branch(q.company_id,q.branch_id)
   for update skip locked;
  if not found then continue; end if;
  begin
   perform pg_advisory_xact_lock(hashtextextended(job.company_id::text||':'||job.staff_id::text||':'||job.work_date::text,0));
   perform 1 from public.daily_attendance_results r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current for update;
   select exists(select 1 from public.daily_attendance_results r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current and r.review_status<>'pending')
    or exists(select 1 from public.attendance_period_locks l where l.company_id=job.company_id and l.week_start=p_week_start and l.unlocked_at is null and (l.branch_id is null or l.branch_id=job.branch_id or exists(select 1 from public.daily_attendance_results previous where previous.company_id=job.company_id and previous.staff_id=job.staff_id and previous.work_date=job.work_date and previous.is_current and previous.branch_id=l.branch_id)))
    or exists(select 1 from public.daily_attendance_reports r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.status='approved')
    or exists(select 1 from public.shift_assignment_revisions a where a.company_id=job.company_id and a.staff_id=job.staff_id and a.work_date=job.work_date and a.is_current and not public.can_access_company_branch(a.company_id,a.branch_id))
    or exists(select 1 from public.daily_attendance_results r where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current and not public.can_access_company_branch(r.company_id,r.branch_id))
    or public.attendance_payroll_locked(job.company_id,job.staff_id,job.work_date)
    into protected_result;
   if protected_result then
    update public.attendance_schedule_refresh set status='needs_review',error_code='protected_result',updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
   else
    select b.id into batch_id from public.attendance_import_batches b where b.company_id=job.company_id and b.week_start between p_week_start-7 and p_week_start+7 and b.status='finalised' and b.parser_profile='view_attendance_punch' and exists(select 1 from public.attendance_import_batch_events be join public.attendance_raw_punch_events e on e.id=be.event_id where be.batch_id=b.id and e.local_timestamp::date between job.work_date-1 and job.work_date+2) order by b.finalised_at desc nulls last,b.created_at desc,b.id limit 1;
    if batch_id is null then
     update public.attendance_schedule_refresh set status='waiting_punches',error_code=null,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
    elsif (select count(*) from public.shift_assignment_revisions a where a.company_id=job.company_id and a.staff_id=job.staff_id and a.work_date=job.work_date and a.is_current and a.assignment_kind='shift')<>1 then
     update public.attendance_schedule_refresh set status='needs_review',error_code='no_unique_working_shift',updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
    else
     update public.attendance_schedule_refresh set status='running',error_code=null,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
     changed:=public.calculate_schedule_day(batch_id,job.staff_id,job.work_date);
     if changed<>1 then raise exception 'Expected one employee-day result'; end if;
     update public.daily_attendance_results r set calculation=r.calculation||jsonb_build_object('schedule_source_revision',job.source_revision,'schedule_source_hash',job.source_hash)
      where r.company_id=job.company_id and r.staff_id=job.staff_id and r.work_date=job.work_date and r.is_current;
     update public.attendance_schedule_refresh set status='ready',calculated_revision=job.source_revision,error_code=null,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
     count_days:=count_days+1;
    end if;
   end if;
  exception when others then
   update public.attendance_schedule_refresh set status='failed',error_code=sqlstate,updated_at=now() where company_id=job.company_id and staff_id=job.staff_id and work_date=job.work_date;
  end;
  outcomes:=outcomes||jsonb_build_array((select jsonb_build_object('staffId',q.staff_id,'workDate',q.work_date,'status',q.status,'sourceRevision',q.source_revision,'sourceHash',q.source_hash) from public.attendance_schedule_refresh q where q.company_id=job.company_id and q.staff_id=job.staff_id and q.work_date=job.work_date));
 end loop;
 return jsonb_build_object('calculated',count_days,'outcomes',outcomes);
end $$;
revoke all on function public.refresh_schedule_attendance(date,uuid) from public,anon;
grant execute on function public.refresh_schedule_attendance(date,uuid) to authenticated;
notify pgrst,'reload schema';
