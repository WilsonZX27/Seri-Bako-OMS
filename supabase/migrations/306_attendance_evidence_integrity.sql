-- Attendance evidence integrity: preserve raw punches, calculate with a five-minute
-- debounce, keep scheduled/no-punch days visible, and support audited break correction.

alter table public.daily_attendance_results
  add column if not exists actual_break_out timestamptz,
  add column if not exists actual_break_in timestamptz;

create index if not exists daily_attendance_current_week_branch_idx
  on public.daily_attendance_results(company_id,work_date,branch_id,staff_id) where is_current;
create index if not exists attendance_exceptions_open_result_idx
  on public.attendance_exceptions(result_id) where resolved_at is null;
create index if not exists raw_punch_company_local_person_idx
  on public.attendance_raw_punch_events(company_id,local_timestamp,person_id);

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
    'unresolvedExceptions',(select count(*) from public.attendance_exceptions e join public.daily_attendance_results r on r.id=e.result_id where e.company_id=company and e.resolved_at is null and r.work_date between p_week_start and week_end),
    'pendingActualReports',(select count(*) from public.daily_attendance_reports where company_id=company and status='pending' and work_date between p_week_start and week_end),
    'missingMappings',(select count(distinct e.person_id) from public.attendance_raw_punch_events e where e.company_id=company and e.local_timestamp>=p_week_start::timestamp and e.local_timestamp<(week_end+1)::timestamp and not exists(select 1 from public.ngteco_person_mappings m where m.company_id=company and m.person_id=e.person_id and m.is_active)),
    'scheduleStatus',case when week_count=0 then 'not_started' when locked_count=week_count then 'locked' when submitted_count>0 then 'submitted' else 'draft' end,
    'latestBatch',latest,
    'activeLocks',(select count(*) from public.attendance_period_locks where company_id=company and week_start=p_week_start and unlocked_at is null)
  );
end $$;

-- Allocate calculation revisions from the complete immutable history.
-- A prior failed or superseded result may have no current row, so current-only
-- numbering can reuse revision 1 and violate the audit-history unique key.

create or replace function public.recalculate_attendance_week_pay_v1(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; point_count integer; raw_point_count integer; inferred_break boolean; idx integer;
 worked integer; breaks integer; presence integer; payable integer; normal_cap integer; ot_candidate integer; shift_span integer; required_breaks integer; valid_breaks integer;
 first_in timestamptz; last_out timestamptz; shift_start timestamptz; shift_end timestamptz; window_start timestamptz; window_end timestamptz; interval_start timestamptz; interval_end timestamptz;
 revision_no integer; prior_id uuid; result_id uuid; exceptions text[]; expected_sources text[]; calculated integer:=0; complete boolean; shift_class text;
 holiday record; pay_rule record; pay_rule_id uuid; holiday_normal numeric; holiday_ot numeric; break_values jsonb;
begin
 select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
 if batch.id is null or batch.parser_profile<>'view_attendance_punch' or not public.has_any_permission(array['attendance.import','attendance.adjust']) then raise exception 'Attendance calculation is not authorised.'; end if;
 for a in
  select ar.*,
   coalesce(ar.custom_start,(ar.template_snapshot->>'planned_start')::time,t.planned_start) planned_start,
   coalesce(ar.custom_end,(ar.template_snapshot->>'planned_end')::time,t.planned_end) planned_end,
   case when ar.custom_start is not null and ar.custom_end is not null then ar.custom_crosses_midnight else coalesce((ar.template_snapshot->>'crosses_midnight')::boolean,t.crosses_midnight,false) end crosses_midnight,
   coalesce(ar.custom_break_seconds,(ar.template_snapshot->>'planned_break_seconds')::integer,t.planned_break_seconds,0) planned_break_seconds,
   coalesce(ar.custom_maximum_recognised_seconds,(ar.template_snapshot->>'maximum_recognised_seconds')::integer,t.maximum_recognised_seconds,30600) maximum_recognised_seconds,
   coalesce((ar.template_snapshot->>'grace_seconds')::integer,t.grace_seconds,0) grace_seconds,
   coalesce((ar.template_snapshot->>'match_before_seconds')::integer,t.match_before_seconds,14400) match_before_seconds,
   coalesce((ar.template_snapshot->>'match_after_seconds')::integer,t.match_after_seconds,14400) match_after_seconds,
   s.employment_type
  from public.shift_assignment_revisions ar
  left join public.shift_templates t on t.id=ar.shift_template_id
  join public.staffs s on s.id=ar.staff_id
  where ar.company_id=batch.company_id and ar.work_date between batch.week_start and batch.week_start+6 and ar.assignment_kind='shift' and ar.is_current
 loop
  shift_start:=(a.work_date+a.planned_start) at time zone 'Asia/Kuala_Lumpur'; shift_end:=((a.work_date+case when a.crosses_midnight then 1 else 0 end)+a.planned_end) at time zone 'Asia/Kuala_Lumpur';
  window_start:=shift_start-make_interval(secs=>a.match_before_seconds); window_end:=shift_end+make_interval(secs=>a.match_after_seconds);
  with ordered as (
    select e.occurred_at,e.source_code,lower(e.punch_type) punch_type,
      lag(e.occurred_at) over(order by e.occurred_at,e.id) previous_at,
      count(*) over() raw_total
    from public.attendance_raw_punch_events e
    join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active
    join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id
    where e.company_id=batch.company_id and e.occurred_at between window_start and window_end
  ), clustered as (
    select *,sum(case when previous_at is null or occurred_at-previous_at>interval '5 minutes' then 1 else 0 end) over(order by occurred_at) cluster_id
    from ordered
  ), deduped as (
    select distinct on(cluster_id) occurred_at,source_code,punch_type,raw_total
    from clustered order by cluster_id,occurred_at
  )
  select array_agg(occurred_at order by occurred_at),array_agg(source_code order by occurred_at),array_agg(punch_type order by occurred_at),coalesce(max(raw_total),0)
  into points,sources,punch_types,raw_point_count from deduped;
  point_count:=coalesce(cardinality(points),0); worked:=0; breaks:=0; valid_breaks:=0; exceptions:='{}'; break_values:='[]'::jsonb;
  if point_count=1 then
    if abs(extract(epoch from points[1]-shift_start))<=abs(extract(epoch from shift_end-points[1])) then first_in:=points[1]; last_out:=null;
    else first_in:=null; last_out:=points[1]; end if;
  elsif point_count>=2 then first_in:=points[1]; last_out:=points[point_count];
  else first_in:=null; last_out:=null; end if;
  if point_count=0 then exceptions:=array_append(exceptions,'missing_punches'); end if; if point_count%2=1 then exceptions:=array_append(exceptions,'odd_punch_count'); end if;
  idx:=1; while idx+1<=point_count loop interval_start:=points[idx]; interval_end:=points[idx+1]; if (punch_types[idx] is not null and punch_types[idx] not in ('in','check in','check-in')) or (punch_types[idx+1] is not null and punch_types[idx+1] not in ('out','check out','check-out')) or interval_end<=interval_start then exceptions:=array_append(exceptions,'impossible_ordering'); else worked:=worked+extract(epoch from interval_end-interval_start)::integer; if idx>1 then breaks:=breaks+extract(epoch from interval_start-points[idx-1])::integer; break_values:=break_values||jsonb_build_array(extract(epoch from interval_start-points[idx-1])::integer); if extract(epoch from interval_start-points[idx-1])>=3600 then valid_breaks:=valid_breaks+1; end if; end if; end if; idx:=idx+2; end loop;
  shift_span:=extract(epoch from shift_end-shift_start)::integer; shift_class:=case when a.employment_type='full_time' and shift_span>34200 then 'full_day' else 'morning_afternoon' end; required_breaks:=case when a.employment_type='full_time' and shift_class='full_day' then 2 else 1 end;
  if point_count<required_breaks*2+2 then exceptions:=array_append(exceptions,'missing_break_punch'); elsif a.employment_type='full_time' and valid_breaks<required_breaks then exceptions:=array_append(exceptions,'short_break'); end if;
  inferred_break:=a.employment_type='full_time' and point_count=3 and last_out>=shift_start+((shift_end-shift_start)*0.66);
  if inferred_break then
    exceptions:=array_remove(array_remove(exceptions,'odd_punch_count'),'missing_break_punch');
    exceptions:=array_append(exceptions,'system_inferred_break');
    breaks:=greatest(a.planned_break_seconds,3600);
  end if;
  complete:=(point_count>=2 and point_count%2=0 and not ('impossible_ordering'=any(exceptions))) or inferred_break;
  presence:=case when complete then extract(epoch from last_out-first_in)::integer end;
  if inferred_break then worked:=greatest(0,presence-breaks); end if;
  normal_cap:=case when a.employment_type='full_time' and shift_class='full_day' then 34200 when a.employment_type='full_time' then 30600 else least(a.maximum_recognised_seconds,shift_span) end;
  payable:=case when not complete then null when a.employment_type='full_time' then normal_cap else floor(worked/1800.0)::integer*1800 end; ot_candidate:=case when payable is null then 0 else least(floor(greatest(0,worked-normal_cap)/1800.0)::integer*1800,floor(greatest(0,extract(epoch from last_out-shift_end)::integer)/1800.0)::integer*1800) end;
  if first_in is null then exceptions:=array_append(exceptions,'missing_check_in'); elsif first_in>shift_start+make_interval(secs=>a.grace_seconds) then exceptions:=array_append(exceptions,'late'); end if;
  if last_out is null then exceptions:=array_append(exceptions,'missing_check_out'); elsif last_out<shift_end then exceptions:=array_append(exceptions,'early_leave'); end if;
  if ot_candidate>0 then exceptions:=array_append(exceptions,'overtime'); end if;
  select h.* into holiday from public.public_holidays h join public.public_holiday_branches hb on hb.holiday_id=h.id and hb.branch_id=a.branch_id and hb.active_slot where h.company_id=batch.company_id and h.holiday_date=a.work_date and h.status='active' limit 1;
  pay_rule_id:=null; holiday_normal:=null; holiday_ot:=null; if holiday.id is not null then exceptions:=array_append(exceptions,'public_holiday'); select * into pay_rule from public.attendance_pay_rule_versions r where r.company_id=batch.company_id and r.is_active and r.effective_from<=a.work_date order by r.effective_from desc limit 1; pay_rule_id:=pay_rule.id; holiday_normal:=pay_rule.holiday_normal_multiplier; holiday_ot:=pay_rule.holiday_ot_multiplier; if pay_rule.id is null then exceptions:=array_append(exceptions,'missing_public_holiday_multiplier'); end if; end if;
  select array_agg(dm.source_code) into expected_sources from public.ngteco_device_mappings dm where dm.company_id=batch.company_id and dm.branch_id=a.branch_id and dm.is_active; if cardinality(expected_sources)>0 and exists(select 1 from unnest(sources) source where not(source=any(expected_sources))) then exceptions:=array_append(exceptions,'wrong_branch_device'); end if;
  perform pg_advisory_xact_lock(hashtextextended(batch.company_id::text||':'||a.staff_id::text||':'||a.work_date::text,0)); select id into prior_id from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date and is_current for update; select coalesce(max(calculation_revision),0)+1 into revision_no from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date; if prior_id is not null then update public.daily_attendance_results set is_current=false where id=prior_id; end if;
  insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,calculation,presence_seconds,worked_seconds,unpaid_break_seconds,paid_break_seconds,payable_seconds,overtime_seconds,holiday_id,holiday_normal_multiplier,holiday_ot_multiplier)
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,worked,coalesce(least(payable,normal_cap),0),breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('rules_version','employment-pay-v1','employment_type',a.employment_type,'shift_class',shift_class,'schedule_span_seconds',shift_span,'normal_cap_seconds',normal_cap,'rounding',case when a.employment_type='part_time' then 'daily_floor_30_minutes' else 'fixed_shift_pay' end,'worked_before_rounding_seconds',worked,'payable_after_rounding_seconds',payable,'required_break_count',required_breaks,'break_durations_seconds',break_values,'overtime_candidate_seconds',ot_candidate,'overtime_approved_seconds',0,'punches',coalesce(to_jsonb(points),'[]'::jsonb),'raw_punch_count',coalesce(raw_point_count,0),'deduplicated_punch_count',point_count,'dedupe_window_seconds',300,'inference',case when inferred_break then 'missing_break_punch_one_hour_deducted' else null end,'holiday_rule_version_id',pay_rule_id,'schedule_source',case when a.custom_start is not null then 'direct_or_adjusted' else 'shift_template' end),presence,case when complete then worked end,case when a.employment_type='part_time' then breaks else 0 end,case when a.employment_type='full_time' and complete then required_breaks*3600 when a.employment_type='full_time' then null else 0 end,case when payable is null then null else least(payable,normal_cap) end,0,holiday.id,holiday_normal,holiday_ot) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','impossible_ordering') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;


-- Reapply raw-punch coverage suppression after every manual recalculation.
-- Dates absent from the file or marked incomplete cannot create an inferred
-- missing-punch result when the employee has no punch evidence.

create or replace function public.recalculate_attendance_week(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$ declare calculated integer; batch public.attendance_import_batches; begin
 select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
 if batch.id is null or batch.parser_profile<>'view_attendance_punch' then raise exception 'Attendance calculation is not authorised.'; end if;
 select public.recalculate_attendance_week_pay_v1(p_batch_id) into calculated;
  update public.daily_attendance_results r set
    payable_seconds=case when s.employment_type='part_time' and r.worked_seconds is not null then floor(r.worked_seconds/1800.0)::integer*1800 else r.payable_seconds end,
    recognised_paid_seconds=case when s.employment_type='part_time' and r.worked_seconds is not null then floor(r.worked_seconds/1800.0)::integer*1800 else r.recognised_paid_seconds end,
   actual_punch_count=jsonb_array_length(coalesce(r.calculation->'punches','[]'::jsonb)),
   expected_punch_count=case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then 2 when s.employment_type='part_time' then 4 when (r.calculation->>'shift_class')='full_day' then 6 else 4 end,
   missing_punch_count=greatest(0,(case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then 2 when s.employment_type='part_time' then 4 when (r.calculation->>'shift_class')='full_day' then 6 else 4 end)-jsonb_array_length(coalesce(r.calculation->'punches','[]'::jsonb))),
   overtime_candidate_seconds=case when s.employment_type='part_time' then 0 else coalesce((r.calculation->>'overtime_candidate_seconds')::integer,0) end,
   holiday_normal_multiplier=case when r.holiday_id is null then null when s.employment_type='full_time' then 2 else 1 end,
   holiday_ot_multiplier=case when r.holiday_id is null then null else 1 end,
    holiday_normal_equivalent_seconds=case when r.holiday_id is null then null when s.employment_type='full_time' then r.payable_seconds*2 when r.worked_seconds is not null then floor(r.worked_seconds/1800.0)::integer*1800 else r.payable_seconds end,
   statuses=case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then array_remove(r.statuses,'missing_break_punch') when s.employment_type='part_time' then array_remove(r.statuses,'overtime') else r.statuses end,
   calculation=r.calculation||jsonb_build_object('rules_version','weekly-close-v2','expected_punch_count',case when s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 then 2 when s.employment_type='part_time' then 4 when (r.calculation->>'shift_class')='full_day' then 6 else 4 end,'overtime_policy',case when s.employment_type='part_time' then 'ordinary_hours_no_ro' else 'post_schedule_floor_30_minutes_to_ro' end)
 from public.staffs s where r.import_batch_id=p_batch_id and r.is_current and s.id=r.staff_id;
 delete from public.attendance_exceptions e using public.daily_attendance_results r,public.staffs s where e.result_id=r.id and r.import_batch_id=p_batch_id and r.is_current and s.id=r.staff_id and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 and e.exception_code='missing_break_punch';
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity,details)
 select r.company_id,r.id,p_batch_id,'short_break','warning',jsonb_build_object('minimum_seconds',1800,'actual_seconds',r.break_seconds)
 from public.daily_attendance_results r join public.staffs s on s.id=r.staff_id
 where r.import_batch_id=p_batch_id and r.is_current and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)>18000
   and r.actual_punch_count>=4 and r.break_seconds<1800 and not exists(select 1 from public.attendance_exceptions e where e.result_id=r.id and e.exception_code='short_break');
 update public.daily_attendance_results r set statuses=array_append(r.statuses,'short_break') from public.staffs s
 where r.import_batch_id=p_batch_id and r.is_current and s.id=r.staff_id and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)>18000 and r.actual_punch_count>=4 and r.break_seconds<1800 and not ('short_break'=any(r.statuses));
 with punch_pairs as (
   select r.id,r.staff_id,r.work_date,r.scheduled_end,r.calculation,
     coalesce(((r.work_date+a.ro_original_end) at time zone 'Asia/Kuala_Lumpur'),r.scheduled_end) ot_start,
     punch.value::timestamptz interval_start,next_punch.value::timestamptz interval_end
   from public.daily_attendance_results r join public.staffs s on s.id=r.staff_id and s.employment_type='full_time'
   left join public.shift_assignment_revisions a on a.id=r.assignment_id
   cross join lateral jsonb_array_elements_text(coalesce(r.calculation->'punches','[]'::jsonb)) with ordinality punch(value,ordinality)
   join lateral (select value from jsonb_array_elements_text(coalesce(r.calculation->'punches','[]'::jsonb)) with ordinality following(value,ordinality) where following.ordinality=punch.ordinality+1) next_punch on true
   where r.import_batch_id=p_batch_id and r.is_current and punch.ordinality%2=1
 ), overtime as (
   select id,floor(sum(case when interval_end>ot_start then extract(epoch from interval_end-greatest(interval_start,ot_start)) else 0 end)/1800.0)::integer*1800 seconds
   from punch_pairs group by id
 ) update public.daily_attendance_results r set overtime_candidate_seconds=coalesce(overtime.seconds,0),calculation=r.calculation||jsonb_build_object('overtime_candidate_seconds',coalesce(overtime.seconds,0),'overtime_baseline','original_published_shift_end') from overtime where r.id=overtime.id;
 update public.daily_attendance_results r set calculation=r.calculation||jsonb_build_object('coverage_status',coalesce(batch.source_metadata->'coverage_by_date'->(r.work_date::text)->>'status','not_in_file'),'scheduled_without_punches',r.actual_first_in is null) where r.import_batch_id=p_batch_id and r.is_current;
 update public.daily_attendance_results current_result set monthly_missing_punch_count=monthly.total
 from (select company_id,staff_id,date_trunc('month',work_date)::date month_start,sum(coalesce(missing_punch_count,0))::integer total from public.daily_attendance_results where is_current group by company_id,staff_id,date_trunc('month',work_date)::date) monthly
 where current_result.is_current and current_result.company_id=monthly.company_id and current_result.staff_id=monthly.staff_id and date_trunc('month',current_result.work_date)::date=monthly.month_start;
 update public.attendance_ro_reservations reservation set recommended_used_minutes=case reservation.direction
   when 'late_start' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (result.actual_first_in-((reservation.work_date+reservation.original_start) at time zone 'Asia/Kuala_Lumpur'))))/1800.0)::integer*30)
   when 'early_finish' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (((reservation.work_date+reservation.original_end) at time zone 'Asia/Kuala_Lumpur')-result.actual_last_out)))/1800.0)::integer*30)
 end,updated_at=now()
 from public.daily_attendance_results result where result.import_batch_id=p_batch_id and result.is_current and result.assignment_id=reservation.assignment_id and result.actual_first_in is not null and result.actual_last_out is not null and reservation.status='reserved';
 return calculated; end $$;


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
   with daily as (select e.local_timestamp::date as punch_date,count(*) as total from public.attendance_import_batch_events be join public.attendance_raw_punch_events e on e.id=be.event_id where be.batch_id=batch.id group by e.local_timestamp::date), scored as (select punch_date,total,total<greatest(10,ceil(max(total) over()*0.35)) as incomplete from daily)
   select coalesce(jsonb_object_agg(punch_date::text,jsonb_build_object('punchCount',total,'status',case when incomplete then 'incomplete' else 'available' end)),'{}'::jsonb),coalesce(jsonb_agg(jsonb_build_object('date',punch_date,'punchCount',total,'status',case when incomplete then 'incomplete' else 'available' end) order by punch_date),'[]'::jsonb) into coverage_map,week_coverage from scored;
   coverage:=coverage||week_coverage;
   update public.attendance_import_batches set source_metadata=source_metadata||jsonb_build_object('file_date_from',from_date,'file_date_to',to_date,'shared_file_hash',p_file_hash,'duplicate_rows',batch_duplicates,'coverage_by_date',coverage_map) where id=batch.id;
   perform public.recalculate_attendance_week(batch.id);
   batches:=batches||jsonb_build_array(jsonb_build_object('id',batch.id,'weekStart',batch.week_start,'rowCount',batch.row_count,'duplicateRows',batch_duplicates));
 end loop;
 select coalesce(jsonb_agg(person_id order by person_id),'[]'::jsonb) into unmatched from (select distinct row->>'Person ID' person_id from jsonb_array_elements(p_rows) row where not exists(select 1 from public.ngteco_person_mappings m where m.company_id=public.current_staff_company_id() and m.person_id=row->>'Person ID' and m.is_active)) q;
 return jsonb_build_object('dateRange',jsonb_build_object('from',from_date,'to',to_date),'acceptedRows',jsonb_array_length(p_rows)-duplicates,'duplicateRows',duplicates,'invalidRows',0,'unmatchedPeople',unmatched,'coverageByDate',coverage,'batches',batches);
end $$;


create or replace function public.adjust_attendance_result(p_result_id uuid,p_patch jsonb,p_reason text)
returns public.daily_attendance_results
language plpgsql security definer set search_path=public as $$
declare prior public.daily_attendance_results; revised public.daily_attendance_results;
  break_out timestamptz; break_in timestamptz; corrected_break integer;
begin
  select * into prior from public.daily_attendance_results
   where id=p_result_id and company_id=public.current_staff_company_id() and is_current for update;
  if prior.id is null then raise exception 'Current attendance result not found.'; end if;
  break_out:=coalesce((p_patch->>'actual_break_out')::timestamptz,prior.actual_break_out);
  break_in:=coalesce((p_patch->>'actual_break_in')::timestamptz,prior.actual_break_in);
  if (break_out is null)<>(break_in is null) then raise exception 'Break out and break in must be supplied together.'; end if;
  if break_out is not null and (break_in<=break_out or (coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in) is not null and break_out<=coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in)) or (coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out) is not null and break_in>=coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out))) then
    raise exception 'Break times must fall between clock in and clock out.';
  end if;
  select * into revised from public.adjust_attendance_result_before_ot_claims(p_result_id,p_patch-'overtime_seconds'-'actual_break_out'-'actual_break_in',p_reason);
  corrected_break:=case when break_out is not null then extract(epoch from break_in-break_out)::integer else revised.break_seconds end;
  update public.daily_attendance_results set
    actual_break_out=break_out,actual_break_in=break_in,break_seconds=corrected_break,
    worked_seconds=case when actual_first_in is not null and actual_last_out is not null then greatest(0,extract(epoch from actual_last_out-actual_first_in)::integer-corrected_break) else null end,
    raw_work_seconds=case when actual_first_in is not null and actual_last_out is not null then greatest(0,extract(epoch from actual_last_out-actual_first_in)::integer-corrected_break) else raw_work_seconds end,
    expected_punch_count=prior.expected_punch_count,actual_punch_count=prior.actual_punch_count,missing_punch_count=prior.missing_punch_count,
    monthly_missing_punch_count=prior.monthly_missing_punch_count,overtime_candidate_seconds=prior.overtime_candidate_seconds,
    holiday_normal_equivalent_seconds=prior.holiday_normal_equivalent_seconds,
    calculation=calculation||jsonb_build_object('manager_break_out',break_out,'manager_break_in',break_in,'manager_break_seconds',corrected_break)
  where id=revised.id returning * into revised;
  update public.attendance_adjustments set after_state=to_jsonb(revised)
   where id=(select id from public.attendance_adjustments where result_id=revised.id order by created_at desc limit 1);
  return revised;
end $$;

revoke all on function public.recalculate_attendance_week_pay_v1(uuid),public.recalculate_attendance_week(uuid),public.finalise_attendance_punch_file(text,text,jsonb),public.adjust_attendance_result(uuid,jsonb,text),public.get_attendance_workspace_summary(date) from public,anon;
grant execute on function public.recalculate_attendance_week(uuid),public.finalise_attendance_punch_file(text,text,jsonb),public.adjust_attendance_result(uuid,jsonb,text),public.get_attendance_workspace_summary(date) to authenticated;
notify pgrst,'reload schema';
