-- Make schedule validation actionable and keep NGTeco raw punches as the only
-- calculation evidence. Timecard-derived events remain immutable audit data.

alter table public.attendance_raw_punch_events
  add column if not exists excluded_from_calculation boolean not null default false,
  add column if not exists exclusion_reason text;

update public.attendance_raw_punch_events
set excluded_from_calculation=true,
    exclusion_reason='NGTeco Timecard is derived from device timesheet rules and is not raw punch evidence.'
where source_code='NGTECO_TIMECARD_REPORT' and not excluded_from_calculation;

update public.attendance_import_batches b
set parser_profile='timecard_report',
    source_metadata=b.source_metadata||jsonb_build_object('excluded_from_calculation',true,'exclusion_reason','Timecard is not raw punch evidence')
where b.parser_profile='view_attendance_punch'
  and exists(select 1 from public.attendance_import_batch_events be join public.attendance_raw_punch_events e on e.id=be.event_id where be.batch_id=b.id and e.source_code='NGTECO_TIMECARD_REPORT')
  and not exists(select 1 from public.attendance_import_batch_events be join public.attendance_raw_punch_events e on e.id=be.event_id where be.batch_id=b.id and e.source_code<>'NGTECO_TIMECARD_REPORT');

update public.daily_attendance_results r
set is_current=false,
    calculation=r.calculation||jsonb_build_object('excluded_source',true,'exclusion_reason','Timecard is not raw punch evidence')
where r.is_current
  and exists(select 1 from public.attendance_import_batches b where b.id=r.import_batch_id and b.parser_profile='timecard_report');

create index if not exists attendance_raw_punch_calculation_idx
  on public.attendance_raw_punch_events(company_id,person_id,occurred_at)
  where not excluded_from_calculation;

create or replace function public.validate_schedule_week(p_week_id uuid) returns jsonb
language plpgsql security definer set search_path=public stable as $$
declare w public.schedule_weeks; blockers jsonb:='[]'::jsonb; warnings jsonb:='[]'::jsonb;
begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id();
 if w.id is null or not public.has_permission('schedule.submit') or not public.can_access_company_branch(w.company_id,w.branch_id) then
   return jsonb_build_object('status','blocked','blockers',jsonb_build_array(jsonb_build_object('code','not_authorised','message','You do not have permission to submit this outlet schedule.')),'warnings',warnings);
 end if;
 if w.status not in ('draft','returned','rejected','amendment_pending') then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','not_editable','message','Only a Draft, Returned, Rejected, or Amendment Pending schedule can be submitted.')); end if;
 if not exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','no_assignments','message','Add at least one shift, OFF, leave, public holiday, or off-in-lieu day before submitting.')); end if;
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','inactive_staff','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' is inactive and must be removed before submission.')) from (select distinct a.staff_id,s.full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and (s.status<>'active' or s.deleted_at is not null)) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','cross_branch_collision','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has another outlet shift on '||q.work_date::text||'.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id and other.branch_id<>a.branch_id and other.assignment_kind='shift' where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift') q),'[]'::jsonb);
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $$;

create or replace function public.submit_schedule_week(p_week_id uuid,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare w public.schedule_weeks; actor uuid:=public.current_staff_id(); prior_status text; validation jsonb; warning_note text;
begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 validation:=public.validate_schedule_week(p_week_id);
 if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.'); end if;
 warning_note:=nullif((select string_agg(value->>'message',' ') from jsonb_array_elements(coalesce(validation->'warnings','[]'::jsonb))), '');
 prior_status:=w.status;
 update public.schedule_weeks set status='submitted',submitted_by=actor,submitted_at=now(),updated_at=now() where id=w.id returning * into w;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment) values(w.company_id,w.id,'submit',prior_status,'submitted',actor,nullif(concat_ws(' ',nullif(trim(p_comment),''),warning_note),''));
 return w;
end $$;

drop function if exists public.get_schedule_staff(uuid);
create function public.get_schedule_staff(p_branch_id uuid,p_week_id uuid default null) returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text,role_code text)
language sql security definer set search_path=public stable as $$
 select distinct s.id,s.full_name,s.staff_code,s.status,s.employment_type,r.role_code
 from public.staffs s
 join public.roles r on r.id=s.role_id
 where s.company_id=public.current_staff_company_id() and s.deleted_at is null
   and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read')
   and (exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=p_branch_id)
     or exists(select 1 from public.shift_assignment_revisions a where a.staff_id=s.id and a.branch_id=p_branch_id and a.schedule_week_id=p_week_id and a.is_current))
 order by s.full_name,s.id
$$;

create or replace function public.finalise_attendance_punch_file(p_file_name text,p_file_hash text,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare grouped record; batch public.attendance_import_batches; batches jsonb:='[]'::jsonb; coverage jsonb:='[]'::jsonb; week_coverage jsonb; unmatched jsonb; from_date date; to_date date; duplicates integer:=0; batch_duplicates integer; coverage_map jsonb;
begin
 if not public.has_permission('attendance.import') then raise exception 'Attendance import is not authorised.'; end if;
 if coalesce(length(p_file_name),0)=0 or coalesce(length(p_file_hash),0)<>64 or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>10000 then raise exception 'Invalid raw punch file.'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) row where coalesce(row->>'Punch Date','')!~'^\d{2}/\d{2}/\d{4}$') then raise exception 'Only NGTeco View Attendance Punch files are accepted.'; end if;
 select min(to_date(row->>'Punch Date','MM/DD/YYYY')),max(to_date(row->>'Punch Date','MM/DD/YYYY')) into from_date,to_date from jsonb_array_elements(p_rows) row;
 for grouped in select date_trunc('week',to_date(row->>'Punch Date','MM/DD/YYYY'))::date week_start,jsonb_agg(row) rows from jsonb_array_elements(p_rows) row group by 1 order by 1 loop
   batch:=public.finalise_attendance_import('view_attendance_punch',grouped.week_start,p_file_name,p_file_hash,grouped.rows);
   select count(*) into batch_duplicates from public.attendance_import_batch_events where batch_id=batch.id and disposition='duplicate'; duplicates:=duplicates+batch_duplicates;
   with daily as (select e.local_timestamp::date day,count(*) total from public.attendance_import_batch_events be join public.attendance_raw_punch_events e on e.id=be.event_id where be.batch_id=batch.id group by 1), scored as (select day,total,total<greatest(10,ceil(max(total) over()*0.35)) incomplete from daily)
   select coalesce(jsonb_object_agg(day::text,jsonb_build_object('punchCount',total,'status',case when incomplete then 'incomplete' else 'available' end)),'{}'::jsonb),coalesce(jsonb_agg(jsonb_build_object('date',day,'punchCount',total,'status',case when incomplete then 'incomplete' else 'available' end) order by day),'[]'::jsonb) into coverage_map,week_coverage from scored;
   coverage:=coverage||week_coverage;
   update public.attendance_import_batches set source_metadata=source_metadata||jsonb_build_object('file_date_from',from_date,'file_date_to',to_date,'shared_file_hash',p_file_hash,'duplicate_rows',batch_duplicates,'coverage_by_date',coverage_map) where id=batch.id;
   update public.daily_attendance_results r set is_current=false,calculation=r.calculation||jsonb_build_object('coverage_status','incomplete','suppressed_missing_punch_result',true) where r.import_batch_id=batch.id and r.is_current and r.actual_first_in is null and coalesce(coverage_map -> (r.work_date::text) ->> 'status','incomplete')='incomplete';
   batches:=batches||jsonb_build_array(jsonb_build_object('id',batch.id,'weekStart',batch.week_start,'rowCount',batch.row_count,'duplicateRows',batch_duplicates));
 end loop;
 select coalesce(jsonb_agg(person_id order by person_id),'[]'::jsonb) into unmatched from (select distinct row->>'Person ID' person_id from jsonb_array_elements(p_rows) row where not exists(select 1 from public.ngteco_person_mappings m where m.company_id=public.current_staff_company_id() and m.person_id=row->>'Person ID' and m.is_active)) q;
 return jsonb_build_object('dateRange',jsonb_build_object('from',from_date,'to',to_date),'acceptedRows',jsonb_array_length(p_rows)-duplicates,'duplicateRows',duplicates,'invalidRows',0,'unmatchedPeople',unmatched,'coverageByDate',coverage,'batches',batches);
end $$;

revoke all on function public.validate_schedule_week(uuid),public.finalise_attendance_punch_file(text,text,jsonb) from public,anon;
grant execute on function public.validate_schedule_week(uuid),public.finalise_attendance_punch_file(text,text,jsonb),public.get_schedule_staff(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
