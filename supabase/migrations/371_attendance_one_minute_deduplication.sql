-- Pending migration only. Retain every raw event; no historical recalculation here.
create or replace function public.attendance_retained_punch_indexes(points timestamptz[]) returns integer[]
language plpgsql immutable set search_path=public as $$
declare retained integer[]:='{}'; i integer; last_kept timestamptz;
begin
 for i in 1..coalesce(cardinality(points),0) loop
  if last_kept is null or points[i]-last_kept>=interval '60 seconds' then retained:=array_append(retained,i);last_kept:=points[i];end if;
 end loop; return retained;
end $$;
revoke all on function public.attendance_retained_punch_indexes(timestamptz[]) from public,anon,authenticated;

create or replace function public.recalculate_attendance_week_pay_v1(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; retained_indexes integer[]; original_points timestamptz[]; point_count integer; raw_point_count integer; inferred_break boolean; idx integer;
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
  select array_agg(e.occurred_at order by e.occurred_at,e.id),
    array_agg(e.source_code order by e.occurred_at,e.id),
    array_agg(lower(e.punch_type) order by e.occurred_at,e.id),count(*)::integer
  into points,sources,punch_types,raw_point_count
  from public.attendance_raw_punch_events e
  join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active
  join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id
  where e.company_id=batch.company_id and e.occurred_at between window_start and window_end;
  original_points:=points;
  retained_indexes:=public.attendance_retained_punch_indexes(points);
  points:=array(select points[i] from unnest(retained_indexes) i);
  punch_types:=array(select punch_types[i] from unnest(retained_indexes) i);
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
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,worked,case when payable is null then 0 else least(payable,normal_cap) end,breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('rules_version','employment-pay-v1','employment_type',a.employment_type,'shift_class',shift_class,'schedule_span_seconds',shift_span,'normal_cap_seconds',normal_cap,'rounding',case when a.employment_type='part_time' then 'daily_floor_30_minutes' else 'fixed_shift_pay' end,'worked_before_rounding_seconds',worked,'payable_after_rounding_seconds',payable,'required_break_count',required_breaks,'break_durations_seconds',break_values,'overtime_candidate_seconds',ot_candidate,'overtime_approved_seconds',0,'punches',coalesce(to_jsonb(points),'[]'::jsonb),'raw_punch_count',coalesce(raw_point_count,0),'deduplicated_punch_count',point_count,'dedupe_window_seconds',60,'raw_punches',coalesce(to_jsonb(original_points),'[]'::jsonb),'ignored_duplicate_count',coalesce(raw_point_count,0)-point_count,'inference',case when inferred_break then 'missing_break_punch_one_hour_deducted' else null end,'holiday_rule_version_id',pay_rule_id,'schedule_source',case when a.custom_start is not null then 'direct_or_adjusted' else 'shift_template' end),presence,case when complete then worked end,case when a.employment_type='part_time' then breaks else 0 end,case when a.employment_type='full_time' and complete then required_breaks*3600 when a.employment_type='full_time' then null else 0 end,case when payable is null then null else least(payable,normal_cap) end,0,holiday.id,holiday_normal,holiday_ot) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','impossible_ordering','missing_break_punch','duplicate_punch','unexpected_punch_count') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;

create or replace function public.calculate_schedule_day_base(p_batch_id uuid,p_staff_id uuid,p_work_date date) returns integer
language plpgsql security definer set search_path=public as $$
declare batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; retained_indexes integer[]; original_points timestamptz[]; point_count integer; raw_point_count integer; inferred_break boolean; idx integer;
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
  original_points:=points;
  retained_indexes:=public.attendance_retained_punch_indexes(points);
  points:=array(select points[i] from unnest(retained_indexes) i);
  punch_types:=array(select punch_types[i] from unnest(retained_indexes) i);
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
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,worked,case when payable is null then 0 else least(payable,normal_cap) end,breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('rules_version','employment-pay-v1','employment_type',a.employment_type,'shift_class',shift_class,'schedule_span_seconds',shift_span,'normal_cap_seconds',normal_cap,'rounding',case when a.employment_type='part_time' then 'daily_floor_30_minutes' else 'fixed_shift_pay' end,'worked_before_rounding_seconds',worked,'payable_after_rounding_seconds',payable,'required_break_count',required_breaks,'break_durations_seconds',break_values,'overtime_candidate_seconds',ot_candidate,'overtime_approved_seconds',0,'punches',coalesce(to_jsonb(points),'[]'::jsonb),'raw_punch_count',coalesce(raw_point_count,0),'deduplicated_punch_count',point_count,'dedupe_window_seconds',60,'raw_punches',coalesce(to_jsonb(original_points),'[]'::jsonb),'ignored_duplicate_count',coalesce(raw_point_count,0)-point_count,'inference',case when inferred_break then 'missing_break_punch_one_hour_deducted' else null end,'holiday_rule_version_id',pay_rule_id,'schedule_source',case when a.custom_start is not null then 'direct_or_adjusted' else 'shift_template' end),presence,case when complete then worked end,case when a.employment_type='part_time' then breaks else 0 end,case when a.employment_type='full_time' and complete then required_breaks*3600 when a.employment_type='full_time' then null else 0 end,case when payable is null then null else least(payable,normal_cap) end,0,holiday.id,holiday_normal,holiday_ot) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','impossible_ordering','missing_break_punch','duplicate_punch','unexpected_punch_count') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;

