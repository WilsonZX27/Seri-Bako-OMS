-- Full-day actual leave overlays; published assignments and raw punches stay immutable.
alter table public.daily_attendance_reports drop constraint daily_attendance_reports_report_type_check;
alter table public.daily_attendance_reports add constraint daily_attendance_reports_report_type_check check(report_type in ('comp_time_used','mc','unpaid_leave','emergency_leave','punch_correction','other_exception'));
create or replace function public.submit_daily_attendance_report_before_schedule_ro(p_assignment_id uuid,p_type text,p_minutes integer,p_actual_first_in timestamptz,p_actual_last_out timestamptz,p_reason text,p_note text default null,p_evidence_attachment_id uuid default null) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$ declare a public.shift_assignment_revisions; w public.schedule_weeks; current_result public.daily_attendance_results; report public.daily_attendance_reports; company uuid:=public.current_staff_company_id(); begin
 if not public.has_permission('attendance.report.submit') or p_type not in ('comp_time_used','mc','unpaid_leave','emergency_leave','punch_correction','other_exception') or nullif(trim(p_reason),'') is null then raise exception 'Daily attendance report is not authorised.'; end if;
 select * into a from public.shift_assignment_revisions where id=p_assignment_id and company_id=company and is_current;
 if a.id is null or not public.can_access_company_branch(company,a.branch_id) then raise exception 'Published assignment is not available.'; end if;
 select * into w from public.schedule_weeks where id=a.schedule_week_id and status in ('published','locked'); if w.id is null then raise exception 'Only a published schedule can receive an actual report.'; end if;
 if exists(select 1 from public.attendance_period_locks l where l.company_id=company and l.week_start=date_trunc('week',a.work_date)::date and l.unlocked_at is null and (l.branch_id is null or l.branch_id=a.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 if p_type='unpaid_leave' and (p_minutes is not null or p_actual_first_in is not null or p_actual_last_out is not null) then raise exception 'Full-day unpaid leave does not accept minutes or punch corrections.'; end if;
 if p_type='unpaid_leave' and a.assignment_kind<>'shift' then raise exception 'Full-day unpaid leave requires a scheduled working day.'; end if;
 if p_type='comp_time_used' and coalesce(p_minutes,0)<=0 then raise exception 'Comp time minutes are required.'; end if;
 if p_type='punch_correction' and p_actual_first_in is null and p_actual_last_out is null then raise exception 'Corrected punch time is required.'; end if;
 select * into current_result from public.daily_attendance_results where assignment_id=a.id and is_current order by calculation_revision desc limit 1;
 insert into public.daily_attendance_reports(company_id,assignment_id,result_id,staff_id,branch_id,work_date,report_type,requested_minutes,proposed_actual_first_in,proposed_actual_last_out,reason,note,scheduled_snapshot,punch_snapshot,evidence_attachment_id,submitted_by)
 values(company,a.id,current_result.id,a.staff_id,a.branch_id,a.work_date,p_type,p_minutes,p_actual_first_in,p_actual_last_out,trim(p_reason),nullif(trim(p_note),''),jsonb_build_object('assignment',to_jsonb(a),'week',to_jsonb(w)),coalesce(to_jsonb(current_result),'{}'::jsonb),p_evidence_attachment_id,public.current_staff_id()) returning * into report; return report; end $$;

create or replace function public.apply_approved_unpaid_leave(p_report_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare report public.daily_attendance_reports; prior public.daily_attendance_results; revised public.daily_attendance_results; assignment public.shift_assignment_revisions; revision integer; state jsonb; conflict boolean; kept_statuses text[]; planned_start time; planned_end time;
begin
 select * into report from public.daily_attendance_reports where id=p_report_id and company_id=public.current_staff_company_id() and status='approved' and report_type='unpaid_leave' for update;
 if report.id is null then raise exception 'Approved unpaid leave not found.'; end if;
 if not public.can_access_company_branch(report.company_id,report.branch_id) then raise exception 'Outlet is unavailable.'; end if;
 if exists(select 1 from public.attendance_period_locks where company_id=report.company_id and week_start=date_trunc('week',report.work_date)::date and unlocked_at is null and (branch_id is null or branch_id=report.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(report.company_id::text||':'||report.staff_id::text||':'||report.work_date::text,0));
 select * into prior from public.daily_attendance_results where company_id=report.company_id and staff_id=report.staff_id and work_date=report.work_date and is_current for update;
 select * into assignment from public.shift_assignment_revisions where id=report.assignment_id;
 planned_start:=coalesce((to_jsonb(assignment)->>'custom_start')::time,(to_jsonb(assignment)->'template_snapshot'->>'planned_start')::time);
 planned_end:=coalesce((to_jsonb(assignment)->>'custom_end')::time,(to_jsonb(assignment)->'template_snapshot'->>'planned_end')::time);
 select coalesce(max(calculation_revision),0)+1 into revision from public.daily_attendance_results where company_id=report.company_id and staff_id=report.staff_id and work_date=report.work_date;
 select coalesce(array_agg(flag),'{}'::text[]) into kept_statuses from unnest(coalesce(prior.statuses,'{}'::text[])) flag where flag not in ('normal','missing_punches','missing_check_in','missing_check_out','odd_punch_count','missing_break_punch','late','early_leave','unpaid_leave','unpaid_leave_punch_conflict');
 conflict:=prior.actual_first_in is not null or prior.actual_last_out is not null;
 if prior.id is null then
   insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,calculation_revision,scheduled_start,scheduled_end,presence_seconds,worked_seconds,statuses,review_status,calculation)
   values(report.company_id,report.staff_id,report.branch_id,report.work_date,report.assignment_id,revision,(report.work_date+planned_start) at time zone 'Asia/Kuala_Lumpur',((report.work_date+case when planned_end<=planned_start then 1 else 0 end)+planned_end) at time zone 'Asia/Kuala_Lumpur',0,0,array['unpaid_leave'],'adjusted',jsonb_build_object('approved_daily_report_id',report.id,'approved_report_type','unpaid_leave','scheduled_snapshot',report.scheduled_snapshot)) returning * into revised;
 else
   state:=to_jsonb(prior)||jsonb_build_object('id',gen_random_uuid(),'calculation_revision',revision,'is_current',true,'created_at',now(),'recognised_paid_seconds',0,'payable_seconds',0,'overtime_seconds',0,'early_leave_seconds',0,'late_seconds',0,'missing_punch_count',0,'expected_punch_count',0,'statuses',kept_statuses || case when conflict then array['unpaid_leave','unpaid_leave_punch_conflict'] else array['unpaid_leave'] end,'review_status',case when conflict or cardinality(kept_statuses)>0 then 'pending' else 'adjusted' end,'calculation',prior.calculation||jsonb_build_object('approved_daily_report_id',report.id,'approved_report_type','unpaid_leave','overtime_candidate_seconds',0,'overtime_approved_seconds',0));
   revised:=jsonb_populate_record(null::public.daily_attendance_results,state);
   update public.daily_attendance_results set is_current=false where id=prior.id;
   insert into public.daily_attendance_results select revised.*;
 end if;
 update public.daily_attendance_results set recognised_paid_seconds=0,payable_seconds=0,overtime_seconds=0,missing_punch_count=0,expected_punch_count=0,late_seconds=0,early_leave_seconds=0 where id=revised.id;
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity,details) select company_id,revised.id,batch_id,exception_code,severity,details from public.attendance_exceptions where result_id=prior.id and resolved_at is null and exception_code not in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','missing_break_punch','late','early_leave','unpaid_leave_punch_conflict');
 if conflict then insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity,details) values(report.company_id,revised.id,revised.import_batch_id,'unpaid_leave_punch_conflict','blocker',jsonb_build_object('report_id',report.id,'message','Full-day unpaid leave has punch evidence. Review the report and punches before closing.')); end if;
 insert into public.attendance_adjustments(company_id,result_id,actor_staff_id,reason,before_state,after_state) values(report.company_id,revised.id,public.current_staff_id(),report.reason,coalesce(to_jsonb(prior),'{}'::jsonb),to_jsonb(revised));
 return revised.id;
end $$;

create or replace function public.decide_daily_attendance_report(p_report_id uuid,p_decision text,p_comment text default null,p_evidence_waiver_reason text default null) returns public.daily_attendance_reports
language plpgsql security definer set search_path=public as $$
declare report public.daily_attendance_reports;
begin
 select * into report from public.daily_attendance_reports where id=p_report_id and company_id=public.current_staff_company_id() for update;
 if report.id is null or not public.can_access_company_branch(report.company_id,report.branch_id) then raise exception 'Attendance report is unavailable.'; end if;
 if report.report_type='comp_time_used' then raise exception 'Legacy comp-time requests cannot bypass scheduled RO settlement.'; end if;
 if report.report_type<>'unpaid_leave' then return public.decide_daily_attendance_report_before_schedule_ro(p_report_id,p_decision,p_comment,p_evidence_waiver_reason); end if;
 if not public.has_permission('attendance.report.approve') or p_decision not in ('approve','reject') then raise exception 'Daily attendance decision is not authorised.'; end if;
 if report.status<>'pending' then raise exception 'Pending daily attendance report not found.'; end if;
 if report.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot approve their own report.'; end if;
 if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
 if exists(select 1 from public.attendance_period_locks where company_id=report.company_id and week_start=date_trunc('week',report.work_date)::date and unlocked_at is null and (branch_id is null or branch_id=report.branch_id)) then raise exception 'Attendance period is locked.'; end if;
 update public.daily_attendance_reports set status=case when p_decision='approve' then 'approved' else 'rejected' end,decided_by=public.current_staff_id(),decided_at=now(),decision_comment=nullif(trim(p_comment),'') where id=report.id returning * into report;
 if p_decision='approve' then perform public.apply_approved_unpaid_leave(report.id); end if;
 return report;
end $$;

alter function public.recalculate_attendance_week(uuid) rename to recalculate_attendance_week_before_unpaid_leave;
create function public.recalculate_attendance_week(p_batch_id uuid) returns integer language plpgsql security definer set search_path=public as $$
declare calculated integer; report record;
begin
 calculated:=public.recalculate_attendance_week_before_unpaid_leave(p_batch_id);
 for report in select distinct r.id from public.daily_attendance_reports r join public.daily_attendance_results d on d.company_id=r.company_id and d.staff_id=r.staff_id and d.work_date=r.work_date where r.company_id=public.current_staff_company_id() and r.status='approved' and r.report_type='unpaid_leave' and d.import_batch_id=p_batch_id and d.is_current loop
   perform public.apply_approved_unpaid_leave(report.id);
 end loop;
 return calculated;
end $$;
revoke all on function public.apply_approved_unpaid_leave(uuid), public.recalculate_attendance_week_before_unpaid_leave(uuid), public.submit_daily_attendance_report_before_schedule_ro(uuid,text,integer,timestamptz,timestamptz,text,text,uuid) from public,anon,authenticated;
revoke all on function public.decide_daily_attendance_report(uuid,text,text,text), public.recalculate_attendance_week(uuid) from public,anon;
grant execute on function public.decide_daily_attendance_report(uuid,text,text,text),public.recalculate_attendance_week(uuid) to authenticated,service_role;
notify pgrst,'reload schema';
