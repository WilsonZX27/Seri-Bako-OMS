-- Allocate calculation revisions from the complete immutable history.
-- A prior failed or superseded result may have no current row, so current-only
-- numbering can reuse revision 1 and violate the audit-history unique key.

create or replace function public.recalculate_attendance_week_pay_v1(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; point_count integer; idx integer;
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
  select array_agg(e.occurred_at order by e.occurred_at),array_agg(e.source_code order by e.occurred_at),array_agg(lower(e.punch_type) order by e.occurred_at) into points,sources,punch_types
  from public.attendance_raw_punch_events e join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id where e.company_id=batch.company_id and e.occurred_at between window_start and window_end;
  point_count:=coalesce(cardinality(points),0); worked:=0; breaks:=0; valid_breaks:=0; exceptions:='{}'; break_values:='[]'::jsonb; first_in:=points[1]; last_out:=points[point_count];
  if point_count=0 then exceptions:=array_append(exceptions,'missing_punches'); end if; if point_count%2=1 then exceptions:=array_append(exceptions,'odd_punch_count'); end if;
  idx:=1; while idx+1<=point_count loop interval_start:=points[idx]; interval_end:=points[idx+1]; if (punch_types[idx] is not null and punch_types[idx] not in ('in','check in','check-in')) or (punch_types[idx+1] is not null and punch_types[idx+1] not in ('out','check out','check-out')) or interval_end<=interval_start then exceptions:=array_append(exceptions,'impossible_ordering'); else worked:=worked+extract(epoch from interval_end-interval_start)::integer; if idx>1 then breaks:=breaks+extract(epoch from interval_start-points[idx-1])::integer; break_values:=break_values||jsonb_build_array(extract(epoch from interval_start-points[idx-1])::integer); if extract(epoch from interval_start-points[idx-1])>=3600 then valid_breaks:=valid_breaks+1; end if; end if; end if; idx:=idx+2; end loop;
  shift_span:=extract(epoch from shift_end-shift_start)::integer; shift_class:=case when a.employment_type='full_time' and shift_span>34200 then 'full_day' else 'morning_afternoon' end; required_breaks:=case when a.employment_type='full_time' and shift_class='full_day' then 2 else 1 end;
  if point_count<required_breaks*2+2 then exceptions:=array_append(exceptions,'missing_break_punch'); elsif a.employment_type='full_time' and valid_breaks<required_breaks then exceptions:=array_append(exceptions,'short_break'); end if;
  complete:=point_count>=2 and point_count%2=0 and not ('impossible_ordering'=any(exceptions)); presence:=case when complete then extract(epoch from last_out-first_in)::integer end;
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
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,worked,coalesce(least(payable,normal_cap),0),breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('rules_version','employment-pay-v1','employment_type',a.employment_type,'shift_class',shift_class,'schedule_span_seconds',shift_span,'normal_cap_seconds',normal_cap,'rounding',case when a.employment_type='part_time' then 'daily_floor_30_minutes' else 'fixed_shift_pay' end,'worked_before_rounding_seconds',worked,'payable_after_rounding_seconds',payable,'required_break_count',required_breaks,'break_durations_seconds',break_values,'overtime_candidate_seconds',ot_candidate,'overtime_approved_seconds',0,'punches',coalesce(to_jsonb(points),'[]'::jsonb),'holiday_rule_version_id',pay_rule_id,'schedule_source',case when a.custom_start is not null then 'direct_or_adjusted' else 'shift_template' end),presence,case when complete then worked end,case when a.employment_type='part_time' then breaks else 0 end,case when a.employment_type='full_time' and complete then required_breaks*3600 when a.employment_type='full_time' then null else 0 end,case when payable is null then null else least(payable,normal_cap) end,0,holiday.id,holiday_normal,holiday_ot) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','missing_check_in','missing_check_out','odd_punch_count','impossible_ordering') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;

revoke all on function public.recalculate_attendance_week_pay_v1(uuid) from public,anon,authenticated;
notify pgrst,'reload schema';
