-- User-confirmed policy, 2026-10-14. Four explicit punches; no fabricated break.
-- Existing normal-pay caps and 30-minute OT-to-RO settlement remain unchanged.
-- PPH is intentionally blank. A future triple-pay rule means total three times.
-- No bulk historical rewrite and no inferred monetary deductions.

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
create or replace function public.recalculate_attendance_week_before_part_time_punch_policy(p_batch_id uuid) returns integer
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
     coalesce(((r.work_date+a.ro_original_end+case when a.ro_original_end<(r.scheduled_start at time zone 'Asia/Kuala_Lumpur')::time then interval '1 day' else interval '0' end) at time zone 'Asia/Kuala_Lumpur'),r.scheduled_end) ot_start,
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
 where current_result.import_batch_id=p_batch_id and current_result.is_current and current_result.company_id=monthly.company_id and current_result.staff_id=monthly.staff_id and date_trunc('month',current_result.work_date)::date=monthly.month_start;
 update public.attendance_ro_reservations reservation set recommended_used_minutes=case reservation.direction
   when 'late_start' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (result.actual_first_in-((reservation.work_date+reservation.original_start) at time zone 'Asia/Kuala_Lumpur'))))/1800.0)::integer*30)
   when 'early_finish' then least(reservation.reserved_minutes,floor(greatest(0,extract(epoch from (((reservation.work_date+reservation.original_end) at time zone 'Asia/Kuala_Lumpur')-result.actual_last_out)))/1800.0)::integer*30)
 end,updated_at=now()
 from public.daily_attendance_results result where result.import_batch_id=p_batch_id and result.is_current and result.assignment_id=reservation.assignment_id and result.actual_first_in is not null and result.actual_last_out is not null and reservation.status='reserved';
 return calculated; end $$;


create or replace function public.recalculate_attendance_week_before_unpaid_leave(p_batch_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare calculated integer;
begin
 calculated:=public.recalculate_attendance_week_before_part_time_punch_policy(p_batch_id);
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
 where r.import_batch_id=p_batch_id and r.is_current;
 update public.daily_attendance_results set statuses=array_append(statuses,'missing_break_punch')
 where import_batch_id=p_batch_id and is_current and actual_punch_count<4 and not ('missing_break_punch'=any(statuses));
 insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity)
 select company_id,id,p_batch_id,'missing_break_punch','blocker' from public.daily_attendance_results r
 where import_batch_id=p_batch_id and is_current and actual_punch_count<4
 and not exists(select 1 from public.attendance_exceptions e where e.result_id=r.id and e.exception_code='missing_break_punch');
 update public.attendance_exceptions e set severity='blocker' from public.daily_attendance_results r
 where e.result_id=r.id and r.import_batch_id=p_batch_id and r.is_current and e.exception_code='missing_break_punch';
 -- Do not silently repair historical rows outside this recalculation batch.
 with totals as (
  select company_id,staff_id,date_trunc('month',work_date)::date month_start,sum(coalesce(missing_punch_count,0))::integer total
  from public.daily_attendance_results where is_current and company_id=public.current_staff_company_id()
  group by company_id,staff_id,date_trunc('month',work_date)::date
 ) update public.daily_attendance_results r set monthly_missing_punch_count=t.total from totals t
 where r.import_batch_id=p_batch_id and r.is_current and r.company_id=t.company_id and r.staff_id=t.staff_id and date_trunc('month',r.work_date)::date=t.month_start;
 return calculated;
end $$;
create or replace function public.decide_attendance_ot_claim(p_claim_id uuid,p_decision text,p_decided_minutes integer,p_comment text default null) returns public.attendance_ot_claims
language plpgsql security definer set search_path=public as $$ declare claim public.attendance_ot_claims; transaction_id uuid; current_result public.daily_attendance_results; revised public.daily_attendance_results; begin
 if not public.has_permission('attendance.ot.approve') or p_decision not in ('approve','reject') then raise exception 'OT claim decision is not authorised.'; end if;
 perform public.attestation_lock((select staff_id from public.attendance_ot_claims where id=p_claim_id and company_id=public.current_staff_company_id()));
 select * into claim from public.attendance_ot_claims where id=p_claim_id and company_id=public.current_staff_company_id() for update;
 if claim.id is null or claim.status<>'submitted' then raise exception 'Submitted OT claim was not found.'; end if;
 if claim.submitted_by=public.current_staff_id() then raise exception 'A submitter cannot decide their own OT claim.'; end if;
 if p_decision='reject' and nullif(trim(p_comment),'') is null then raise exception 'A rejection comment is required.'; end if;
 select * into current_result from public.daily_attendance_results where company_id=claim.company_id and staff_id=claim.staff_id and work_date=claim.work_date and is_current for update;
 if p_decision='approve' and (current_result.id is distinct from claim.result_id or current_result.worked_seconds is null or current_result.calculation_revision<>claim.calculation_revision or p_decided_minutes*60>current_result.overtime_candidate_seconds) then raise exception 'Attendance changed or punches need review; submit a current OT claim.'; end if;
 if p_decision='approve' and (coalesce(p_decided_minutes,0)<=0 or p_decided_minutes%30<>0 or p_decided_minutes>claim.requested_minutes) then raise exception 'Approved OT must be a 30-minute amount within the request.'; end if;
 update public.attendance_ot_claims set status=case when p_decision='approve' then 'approved' else 'rejected' end,decided_minutes=case when p_decision='approve' then p_decided_minutes else 0 end,decided_by=public.current_staff_id(),decided_at=now(),decision_comment=nullif(trim(p_comment),''),updated_at=now() where id=claim.id returning * into claim;
 if p_decision='approve' then
  insert into public.comp_time_transactions(company_id,staff_id,branch_id,work_date,transaction_kind,minutes,reason,note,source_result_id,source_ot_claim_id,status,submitted_by,decided_by,decided_at,decision_comment)
  values(claim.company_id,claim.staff_id,claim.branch_id,claim.work_date,'earned',p_decided_minutes,'Approved attendance OT',claim.reason,claim.result_id,claim.id,'approved',claim.submitted_by,public.current_staff_id(),now(),p_comment) returning id into transaction_id;
  select * into current_result from public.daily_attendance_results where company_id=claim.company_id and staff_id=claim.staff_id and work_date=claim.work_date and is_current for update;
  if current_result.id is not null then
   -- Approval changes payroll/RO metadata only, not employee-visible time evidence.
   update public.daily_attendance_results set overtime_seconds=p_decided_minutes*60,
     calculation=calculation||jsonb_build_object('overtime_approved_seconds',p_decided_minutes*60,'overtime_settlement','ro_credit_only')
   where id=current_result.id;
  end if;
  update public.attendance_ot_claims set status='credited',credited_transaction_id=transaction_id,updated_at=now() where id=claim.id returning * into claim;
 end if; return claim; end $$;


create or replace function public.adjust_attendance_result(p_result_id uuid,p_patch jsonb,p_reason text)
returns public.daily_attendance_results
language plpgsql security definer set search_path=public as $$
declare prior public.daily_attendance_results; revised public.daily_attendance_results;
  break_out timestamptz; break_in timestamptz; corrected_break integer; valid boolean; cap integer; ot_start timestamptz; candidate integer; employment text; grace integer; time_changed boolean;
begin
  perform public.attestation_lock((select staff_id from public.daily_attendance_results where id=p_result_id and company_id=public.current_staff_company_id()));
  select * into prior from public.daily_attendance_results
   where id=p_result_id and company_id=public.current_staff_company_id() and is_current for update;
  if prior.id is null then raise exception 'Current attendance result not found.'; end if;
  break_out:=coalesce((p_patch->>'actual_break_out')::timestamptz,prior.actual_break_out);
  break_in:=coalesce((p_patch->>'actual_break_in')::timestamptz,prior.actual_break_in);
  if (break_out is null)<>(break_in is null) then raise exception 'Break out and break in must be supplied together.'; end if;
  if break_out is not null and (break_in<=break_out or (coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in) is not null and break_out<=coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in)) or (coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out) is not null and break_in>=coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out))) then
    raise exception 'Break times must fall between clock in and clock out.';
  end if;
  time_changed:=coalesce((p_patch->>'actual_first_in')::timestamptz,prior.actual_first_in) is distinct from prior.actual_first_in
    or coalesce((p_patch->>'actual_last_out')::timestamptz,prior.actual_last_out) is distinct from prior.actual_last_out
    or break_out is distinct from prior.actual_break_out or break_in is distinct from prior.actual_break_in;
  if time_changed and exists(select 1 from public.attendance_ot_claims c where c.company_id=prior.company_id and c.staff_id=prior.staff_id and c.work_date=prior.work_date and c.status='credited') then
    raise exception 'This day has credited OT. People must reconcile its RO credit before changing punch times.';
  end if;
  select * into revised from public.adjust_attendance_result_before_ot_claims(p_result_id,p_patch-'overtime_seconds'-'actual_break_out'-'actual_break_in',p_reason);
  valid:=revised.actual_first_in is not null and revised.actual_last_out is not null and break_out is not null and break_in is not null
    and revised.actual_first_in<break_out and break_out<break_in and break_in<revised.actual_last_out;
  -- Existing anomalous raw evidence requires an explicit, audited time correction.
  if prior.statuses && array['duplicate_punch','impossible_ordering','unexpected_punch_count','odd_punch_count','system_inferred_break']
     and not (p_patch ?| array['actual_first_in','actual_last_out','actual_break_out','actual_break_in']) then valid:=false; end if;
  corrected_break:=case when valid then extract(epoch from break_in-break_out)::integer else 0 end;
  select employment_type into employment from public.staffs where id=prior.staff_id;
  grace:=greatest(0,coalesce(extract(epoch from prior.actual_first_in-prior.scheduled_start)::integer,0)-prior.late_seconds);
  cap:=coalesce((prior.calculation->>'normal_cap_seconds')::integer,30600);
  select coalesce(((prior.work_date+ar.ro_original_end+case when ar.ro_original_end<(prior.scheduled_start at time zone 'Asia/Kuala_Lumpur')::time then interval '1 day' else interval '0' end) at time zone 'Asia/Kuala_Lumpur'),prior.scheduled_end)
  into ot_start from public.shift_assignment_revisions ar where ar.id=prior.assignment_id;
  ot_start:=coalesce(ot_start,prior.scheduled_end);
  candidate:=case when valid and employment='full_time' and ot_start is not null then
    floor((greatest(0,extract(epoch from break_out-greatest(revised.actual_first_in,ot_start)))+greatest(0,extract(epoch from revised.actual_last_out-greatest(break_in,ot_start))))/1800)::integer*1800 else 0 end;
  update public.daily_attendance_results set
    actual_break_out=break_out,actual_break_in=break_in,break_seconds=corrected_break,
    presence_seconds=case when valid then extract(epoch from actual_last_out-actual_first_in)::integer end,
    late_seconds=greatest(0,coalesce(extract(epoch from actual_first_in-scheduled_start)::integer,0)-grace),
    early_leave_seconds=greatest(0,coalesce(extract(epoch from scheduled_end-actual_last_out)::integer,0)),
    post_shift_seconds=greatest(0,coalesce(extract(epoch from actual_last_out-scheduled_end)::integer,0)),
    worked_seconds=case when valid then extract(epoch from break_out-actual_first_in+actual_last_out-break_in)::integer end,
    raw_work_seconds=case when valid then extract(epoch from break_out-actual_first_in+actual_last_out-break_in)::integer else 0 end,
    unpaid_break_seconds=case when valid then corrected_break end,paid_break_seconds=case when valid then 0 end,
    payable_seconds=case when not valid then null when p_patch ? 'payable_seconds' then revised.payable_seconds when employment='full_time' then cap else floor(extract(epoch from break_out-actual_first_in+actual_last_out-break_in)/1800)::integer*1800 end,
    recognised_paid_seconds=case when not valid then 0 when p_patch ? 'payable_seconds' then coalesce(revised.payable_seconds,0) when employment='full_time' then cap else floor(extract(epoch from break_out-actual_first_in+actual_last_out-break_in)/1800)::integer*1800 end,
    expected_punch_count=4,actual_punch_count=case when valid then 4 else prior.actual_punch_count end,missing_punch_count=case when valid then 0 else greatest(0,4-prior.actual_punch_count) end,
    monthly_missing_punch_count=greatest(0,prior.monthly_missing_punch_count-prior.missing_punch_count+case when valid then 0 else greatest(0,4-prior.actual_punch_count) end),overtime_candidate_seconds=candidate,
    overtime_seconds=case when valid and not time_changed then prior.overtime_seconds else 0 end,holiday_normal_equivalent_seconds=null,holiday_normal_multiplier=null,holiday_ot_multiplier=null,
    statuses=case when valid then array(select x from unnest(prior.statuses) x where x not in ('duplicate_punch','impossible_ordering','unexpected_punch_count','odd_punch_count','system_inferred_break','missing_break_punch','missing_check_in','missing_check_out','missing_punches','late','early_leave')) || case when greatest(0,coalesce(extract(epoch from actual_first_in-scheduled_start)::integer,0)-grace)>0 then array['late'] else array[]::text[] end || case when scheduled_end>actual_last_out then array['early_leave'] else array[]::text[] end else prior.statuses end,
    calculation=calculation||jsonb_build_object('rules_version','four-punch-v1','manager_break_out',break_out,'manager_break_in',break_in,'manager_break_seconds',corrected_break,'overtime_candidate_seconds',candidate,'overtime_approved_seconds',case when valid and not time_changed then prior.overtime_seconds else 0 end,
      'punches',case when valid then jsonb_build_array(actual_first_in,break_out,break_in,actual_last_out) else coalesce(prior.calculation->'punches','[]'::jsonb) end,'inference',null)
  where id=revised.id returning * into revised;
  -- Corrections cannot leave resolved raw-punch blockers attached to the corrected revision.
  if valid then update public.attendance_exceptions set resolved_at=now(),resolved_by=public.current_staff_id(),resolution_note=p_reason
    where result_id=revised.id and exception_code in ('duplicate_punch','impossible_ordering','unexpected_punch_count','odd_punch_count','system_inferred_break','missing_break_punch','missing_check_in','missing_check_out','missing_punches') and resolved_at is null; end if;
  update public.attendance_adjustments set after_state=to_jsonb(revised)
   where id=(select id from public.attendance_adjustments where result_id=revised.id order by created_at desc limit 1);
  return revised;
end $$;


revoke all on function public.recalculate_attendance_week_pay_v1(uuid),public.recalculate_attendance_week_before_unpaid_leave(uuid) from public,anon,authenticated;
revoke all on function public.decide_attendance_ot_claim(uuid,text,integer,text) from public,anon;
grant execute on function public.decide_attendance_ot_claim(uuid,text,integer,text) to authenticated;
notify pgrst,'reload schema';
