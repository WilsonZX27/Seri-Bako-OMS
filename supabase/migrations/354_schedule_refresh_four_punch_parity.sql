-- Scoped schedule refresh uses the same four-punch rules as migration 352.
-- No historical rewrite. Active OT claims require review before source recalculation.
create or replace function public.calculate_schedule_day_base(p_batch_id uuid,p_staff_id uuid,p_work_date date) returns integer
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
  where ar.company_id=batch.company_id and ar.work_date=p_work_date and ar.assignment_kind='shift' and ar.is_current and ar.staff_id=p_staff_id and ar.work_date=p_work_date
 loop
  shift_start:=(a.work_date+a.planned_start) at time zone 'Asia/Kuala_Lumpur'; shift_end:=((a.work_date+case when a.crosses_midnight then 1 else 0 end)+a.planned_end) at time zone 'Asia/Kuala_Lumpur';
  window_start:=shift_start-make_interval(secs=>a.match_before_seconds); window_end:=shift_end+make_interval(secs=>a.match_after_seconds);
  select array_agg(e.occurred_at order by e.occurred_at,e.id),
    array_agg(e.source_code order by e.occurred_at,e.id),
    array_agg(lower(e.punch_type) order by e.occurred_at,e.id),count(*)::integer
  into points,sources,punch_types,raw_point_count
  from public.attendance_raw_punch_events e
  join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active
  join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id
  where e.company_id=batch.company_id and e.occurred_at between window_start and window_end;
  point_count:=coalesce(cardinality(points),0); worked:=0; breaks:=0; valid_breaks:=0; exceptions:='{}'; break_values:='[]'::jsonb;
  if (select count(distinct p) from unnest(points) p)<point_count then exceptions:=array_append(exceptions,'duplicate_punch'); end if;
  if point_count>4 then exceptions:=array_append(exceptions,'unexpected_punch_count'); end if;
  if point_count=1 then
    if abs(extract(epoch from points[1]-shift_start))<=abs(extract(epoch from shift_end-points[1])) then first_in:=points[1]; last_out:=null;
    else first_in:=null; last_out:=points[1]; end if;
  elsif point_count>=2 then first_in:=points[1]; last_out:=points[point_count];
  else first_in:=null; last_out:=null; end if;
  if point_count=0 then exceptions:=array_append(exceptions,'missing_punches'); end if; if point_count%2=1 then exceptions:=array_append(exceptions,'odd_punch_count'); end if;
  idx:=1; while idx+1<=point_count loop interval_start:=points[idx]; interval_end:=points[idx+1]; if (punch_types[idx] is not null and punch_types[idx] not in ('in','check in','check-in')) or (punch_types[idx+1] is not null and punch_types[idx+1] not in ('out','check out','check-out')) or interval_end<=interval_start then exceptions:=array_append(exceptions,'impossible_ordering'); else worked:=worked+extract(epoch from interval_end-interval_start)::integer; if idx>1 then breaks:=breaks+extract(epoch from interval_start-points[idx-1])::integer; break_values:=break_values||jsonb_build_array(extract(epoch from interval_start-points[idx-1])::integer); if extract(epoch from interval_start-points[idx-1])>=3600 then valid_breaks:=valid_breaks+1; end if; end if; end if; idx:=idx+2; end loop;
  shift_span:=extract(epoch from shift_end-shift_start)::integer; shift_class:=case when a.employment_type='full_time' and shift_span>34200 then 'full_day' else 'morning_afternoon' end; required_breaks:=1;
  if point_count<required_breaks*2+2 then exceptions:=array_append(exceptions,'missing_break_punch'); elsif a.employment_type='full_time' and valid_breaks<required_breaks then exceptions:=array_append(exceptions,'short_break'); end if;
  inferred_break:=false;
  complete:=point_count=4 and not ('impossible_ordering'=any(exceptions)) and not ('duplicate_punch'=any(exceptions));
  presence:=case when complete then extract(epoch from last_out-first_in)::integer end;
  normal_cap:=case when a.employment_type='full_time' and shift_class='full_day' then 34200 when a.employment_type='full_time' then 30600 else least(a.maximum_recognised_seconds,shift_span) end;
  payable:=case when not complete then null when a.employment_type='full_time' then normal_cap else floor(worked/1800.0)::integer*1800 end; ot_candidate:=case when payable is null then 0 else least(floor(greatest(0,worked-normal_cap)/1800.0)::integer*1800,floor(greatest(0,extract(epoch from last_out-shift_end)::integer)/1800.0)::integer*1800) end;
  if first_in is null then exceptions:=array_append(exceptions,'missing_check_in'); elsif first_in>shift_start+make_interval(secs=>a.grace_seconds) then exceptions:=array_append(exceptions,'late'); end if;
  if last_out is null then exceptions:=array_append(exceptions,'missing_check_out'); elsif last_out<shift_end then exceptions:=array_append(exceptions,'early_leave'); end if;
  if ot_candidate>0 then exceptions:=array_append(exceptions,'overtime'); end if;
  select h.* into holiday from public.public_holidays h join public.public_holiday_branches hb on hb.holiday_id=h.id and hb.branch_id=a.branch_id and hb.active_slot where h.company_id=batch.company_id and h.holiday_date=a.work_date and h.status='active' limit 1;
  pay_rule_id:=null; holiday_normal:=null; holiday_ot:=null; if holiday.id is not null then exceptions:=array_append(exceptions,'public_holiday'); select * into pay_rule from public.attendance_pay_rule_versions r where r.company_id=batch.company_id and r.is_active and r.effective_from<=a.work_date order by r.effective_from desc limit 1; pay_rule_id:=pay_rule.id; holiday_normal:=null; holiday_ot:=null; end if;
  select array_agg(dm.source_code) into expected_sources from public.ngteco_device_mappings dm where dm.company_id=batch.company_id and dm.branch_id=a.branch_id and dm.is_active; if cardinality(expected_sources)>0 and exists(select 1 from unnest(sources) source where not(source=any(expected_sources))) then exceptions:=array_append(exceptions,'wrong_branch_device'); end if;
  perform pg_advisory_xact_lock(hashtextextended(batch.company_id::text||':'||a.staff_id::text||':'||a.work_date::text,0)); select id into prior_id from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date and is_current for update; select coalesce(max(calculation_revision),0)+1 into revision_no from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date; if prior_id is not null then update public.daily_attendance_results set is_current=false where id=prior_id; end if;
  insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,calculation,presence_seconds,worked_seconds,unpaid_break_seconds,paid_break_seconds,payable_seconds,overtime_seconds,holiday_id,holiday_normal_multiplier,holiday_ot_multiplier)
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,worked,case when payable is null then 0 else least(payable,normal_cap) end,breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('rules_version','employment-pay-v1','employment_type',a.employment_type,'shift_class',shift_class,'schedule_span_seconds',shift_span,'normal_cap_seconds',normal_cap,'rounding',case when a.employment_type='part_time' then 'daily_floor_30_minutes' else 'fixed_shift_pay' end,'worked_before_rounding_seconds',worked,'payable_after_rounding_seconds',payable,'required_break_count',required_breaks,'break_durations_seconds',break_values,'overtime_candidate_seconds',ot_candidate,'overtime_approved_seconds',0,'punches',coalesce(to_jsonb(points),'[]'::jsonb),'raw_punch_count',coalesce(raw_point_count,0),'deduplicated_punch_count',point_count,'dedupe_window_seconds',0,'inference',case when inferred_break then 'missing_break_punch_one_hour_deducted' else null end,'holiday_rule_version_id',pay_rule_id,'schedule_source',case when a.custom_start is not null then 'direct_or_adjusted' else 'shift_template' end),presence,case when complete then worked end,case when a.employment_type='part_time' then breaks else 0 end,case when a.employment_type='full_time' and complete then required_breaks*3600 when a.employment_type='full_time' then null else 0 end,case when payable is null then null else least(payable,normal_cap) end,0,holiday.id,holiday_normal,holiday_ot) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','impossible_ordering','missing_break_punch','duplicate_punch','unexpected_punch_count') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;



-- Keep legacy follow-up updates within the explicitly recalculated batch.
create or replace function public.calculate_schedule_day_pay_policy(p_batch_id uuid,p_staff_id uuid,p_work_date date) returns integer
language plpgsql security definer set search_path=public as $$ declare calculated integer; batch public.attendance_import_batches; begin
 select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
 if batch.id is null or batch.parser_profile<>'view_attendance_punch' then raise exception 'Attendance calculation is not authorised.'; end if;
 select public.calculate_schedule_day_base(p_batch_id,p_staff_id,p_work_date) into calculated;
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
 from public.staffs s where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and s.id=r.staff_id;
 delete from public.attendance_exceptions e using public.daily_attendance_results r,public.staffs s where e.result_id=r.id and r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and s.id=r.staff_id and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)<=18000 and e.exception_code='missing_break_punch';
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity,details)
 select r.company_id,r.id,p_batch_id,'short_break','warning',jsonb_build_object('minimum_seconds',1800,'actual_seconds',r.break_seconds)
 from public.daily_attendance_results r join public.staffs s on s.id=r.staff_id
 where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)>18000
   and r.actual_punch_count>=4 and r.break_seconds<1800 and not exists(select 1 from public.attendance_exceptions e where e.result_id=r.id and e.exception_code='short_break');
 update public.daily_attendance_results r set statuses=array_append(r.statuses,'short_break') from public.staffs s
 where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and s.id=r.staff_id and s.employment_type='part_time' and extract(epoch from r.scheduled_end-r.scheduled_start)>18000 and r.actual_punch_count>=4 and r.break_seconds<1800 and not ('short_break'=any(r.statuses));
 with punch_pairs as (
   select r.id,r.staff_id,r.work_date,r.scheduled_end,r.calculation,
     coalesce(((r.work_date+a.ro_original_end+case when a.ro_original_end<(r.scheduled_start at time zone 'Asia/Kuala_Lumpur')::time then interval '1 day' else interval '0' end) at time zone 'Asia/Kuala_Lumpur'),r.scheduled_end) ot_start,
     punch.value::timestamptz interval_start,next_punch.value::timestamptz interval_end
   from public.daily_attendance_results r join public.staffs s on s.id=r.staff_id and s.employment_type='full_time'
   left join public.shift_assignment_revisions a on a.id=r.assignment_id
   cross join lateral jsonb_array_elements_text(coalesce(r.calculation->'punches','[]'::jsonb)) with ordinality punch(value,ordinality)
   join lateral (select value from jsonb_array_elements_text(coalesce(r.calculation->'punches','[]'::jsonb)) with ordinality following(value,ordinality) where following.ordinality=punch.ordinality+1) next_punch on true
   where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and punch.ordinality%2=1
 ), overtime as (
   select id,floor(sum(case when interval_end>ot_start then extract(epoch from interval_end-greatest(interval_start,ot_start)) else 0 end)/1800.0)::integer*1800 seconds
   from punch_pairs group by id
 ) update public.daily_attendance_results r set overtime_candidate_seconds=coalesce(overtime.seconds,0),calculation=r.calculation||jsonb_build_object('overtime_candidate_seconds',coalesce(overtime.seconds,0),'overtime_baseline','original_published_shift_end') from overtime where r.id=overtime.id;
 update public.daily_attendance_results r set calculation=r.calculation||jsonb_build_object('coverage_status',coalesce(batch.source_metadata->'coverage_by_date'->(r.work_date::text)->>'status','not_in_file'),'scheduled_without_punches',r.actual_first_in is null) where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date;
 update public.daily_attendance_results current_result set monthly_missing_punch_count=monthly.total
 from (select company_id,staff_id,date_trunc('month',work_date)::date month_start,sum(coalesce(missing_punch_count,0))::integer total from public.daily_attendance_results where is_current group by company_id,staff_id,date_trunc('month',work_date)::date) monthly
 where current_result.import_batch_id=p_batch_id and current_result.is_current and current_result.staff_id=p_staff_id and current_result.work_date=p_work_date and current_result.company_id=monthly.company_id and current_result.staff_id=monthly.staff_id and date_trunc('month',current_result.work_date)::date=monthly.month_start;
 update public.attendance_ro_reservations reservation set recommended_used_minutes=case reservation.direction
   when 'late_start' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (result.actual_first_in-((reservation.work_date+reservation.original_start) at time zone 'Asia/Kuala_Lumpur'))))/1800.0)::integer*30)
   when 'early_finish' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (((reservation.work_date+reservation.original_end) at time zone 'Asia/Kuala_Lumpur')-result.actual_last_out)))/1800.0)::integer*30)
 end,updated_at=now()
 from public.daily_attendance_results result where result.import_batch_id=p_batch_id and result.is_current and result.staff_id=p_staff_id and result.work_date=p_work_date and result.assignment_id=reservation.assignment_id and result.actual_first_in is not null and result.actual_last_out is not null and reservation.status='reserved';
 return calculated; end $$;


create or replace function public.calculate_schedule_day_part_time(p_batch_id uuid,p_staff_id uuid,p_work_date date)
returns integer language plpgsql security definer set search_path=public as $$
declare calculated integer;
begin
 calculated:=public.calculate_schedule_day_pay_policy(p_batch_id,p_staff_id,p_work_date);
 update public.daily_attendance_results r set
   expected_punch_count=4, missing_punch_count=greatest(0,4-r.actual_punch_count),
   actual_break_out=case when r.worked_seconds is not null then (r.calculation->'punches'->>1)::timestamptz end,
   actual_break_in=case when r.worked_seconds is not null then (r.calculation->'punches'->>2)::timestamptz end,
   unpaid_break_seconds=case when r.worked_seconds is not null then r.break_seconds end,
   paid_break_seconds=case when r.worked_seconds is not null then 0 end,
   overtime_candidate_seconds=case when r.worked_seconds is null then 0 else r.overtime_candidate_seconds end,
   holiday_normal_multiplier=null,holiday_ot_multiplier=null,
   holiday_normal_equivalent_seconds=null,
   calculation=r.calculation||jsonb_build_object('rules_version','four-punch-v1','expected_punch_count',4,
     'overtime_candidate_seconds',case when r.worked_seconds is null then 0 else r.overtime_candidate_seconds end,
     'short_hours_seconds',case when r.worked_seconds is not null then least(greatest(0,extract(epoch from r.scheduled_end-r.scheduled_start)::integer),r.late_seconds+r.early_leave_seconds) end,
     'pph_policy','deferred_total_triple_not_extra_triple','inference',null)
 where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date;
 update public.daily_attendance_results set statuses=array_append(statuses,'missing_break_punch')
 where import_batch_id=p_batch_id and is_current and staff_id=p_staff_id and work_date=p_work_date and actual_punch_count<4 and not ('missing_break_punch'=any(statuses));
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity)
 select company_id,id,p_batch_id,'missing_break_punch','blocker' from public.daily_attendance_results r
 where import_batch_id=p_batch_id and is_current and staff_id=p_staff_id and work_date=p_work_date and actual_punch_count<4
 and not exists(select 1 from public.attendance_exceptions e where e.result_id=r.id and e.exception_code='missing_break_punch');
 update public.attendance_exceptions e set severity='blocker' from public.daily_attendance_results r
 where e.result_id=r.id and r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and e.exception_code='missing_break_punch';
 -- Do not silently repair historical rows outside this recalculation batch.
 with totals as (
  select company_id,staff_id,date_trunc('month',work_date)::date month_start,sum(coalesce(missing_punch_count,0))::integer total
  from public.daily_attendance_results where is_current and company_id=public.current_staff_company_id()
  group by company_id,staff_id,date_trunc('month',work_date)::date
 ) update public.daily_attendance_results r set monthly_missing_punch_count=t.total from totals t
 where r.import_batch_id=p_batch_id and r.is_current and r.staff_id=p_staff_id and r.work_date=p_work_date and r.company_id=t.company_id and r.staff_id=t.staff_id and date_trunc('month',r.work_date)::date=t.month_start;
 return calculated;
end $$;

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
    or exists(select 1 from public.attendance_ot_claims c where c.company_id=job.company_id and c.staff_id=job.staff_id and c.work_date=job.work_date and c.status in ('submitted','approved','credited'))
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

revoke all on function public.calculate_schedule_day_base(uuid,uuid,date),public.calculate_schedule_day_pay_policy(uuid,uuid,date),public.calculate_schedule_day_part_time(uuid,uuid,date) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
