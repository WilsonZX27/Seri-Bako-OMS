-- Direct outlet roster times are a first-class schedule source. Supervisors may
-- save standard 30-minute times; only non-standard times require elevated authority.
create or replace function public.save_schedule_week(p_branch_id uuid,p_week_start date,p_assignments jsonb) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); w public.schedule_weeks;
 item jsonb; previous public.shift_assignment_revisions; next_revision integer; target_staff uuid; target_date date;
 target_kind text; template_id uuid; custom_start time; custom_end time; custom_break integer; custom_cap integer; non_standard boolean;
begin
 if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then raise exception 'Schedule draft is not authorised.'; end if;
 if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_assignments)<>'array' or jsonb_array_length(p_assignments)>1000 then raise exception 'Invalid schedule week payload.'; end if;
 select * into w from public.schedule_weeks where company_id=company and branch_id=p_branch_id and week_start=p_week_start and revision=1 for update;
 if w.id is null then insert into public.schedule_weeks(company_id,branch_id,week_start,created_by) values(company,p_branch_id,p_week_start,actor) returning * into w;
 elsif w.status not in ('draft','returned','rejected','amendment_pending') or w.locked_at is not null then raise exception 'This schedule week is not editable.'; end if;
 for item in select value from jsonb_array_elements(p_assignments) loop
  target_staff:=(item->>'staff_id')::uuid; target_date:=(item->>'work_date')::date; target_kind:=lower(item->>'assignment_kind'); template_id:=nullif(item->>'shift_template_id','')::uuid;
  custom_start:=nullif(item->>'custom_start','')::time; custom_end:=nullif(item->>'custom_end','')::time;
  custom_break:=nullif(item->>'custom_break_seconds','')::integer; custom_cap:=nullif(item->>'custom_maximum_recognised_seconds','')::integer;
  if target_date not between p_week_start and p_week_start+6 or target_kind not in ('shift','off','ph','al','mc','upl','ro','oil') then raise exception 'Invalid assignment row.'; end if;
  if not exists(select 1 from public.staffs s join public.staff_branches sb on sb.staff_id=s.id where s.id=target_staff and s.company_id=company and s.status='active' and s.deleted_at is null and sb.branch_id=p_branch_id) then raise exception 'Staff is not active in the selected outlet.'; end if;
  if template_id is not null and not exists(select 1 from public.shift_templates t where t.id=template_id and t.company_id=company and t.is_active and (cardinality(t.branch_ids)=0 or p_branch_id=any(t.branch_ids))) then raise exception 'Shift template is not valid for this outlet.'; end if;
  if target_kind='shift' and template_id is null then
   if custom_start is null or custom_end is null or nullif(trim(item->>'custom_reason'),'') is null or coalesce(custom_break,-1)<0 or coalesce(custom_cap,0)<=0 then raise exception 'Direct working times, break, paid cap and reason are required.'; end if;
   non_standard:=extract(minute from custom_start)::integer%30<>0 or extract(second from custom_start)<>0 or extract(minute from custom_end)::integer%30<>0 or extract(second from custom_end)<>0;
   if non_standard and not public.has_permission('shift_template.non_standard') then raise exception 'Non-standard working times require Owner authority.'; end if;
  end if;
  select * into previous from public.shift_assignment_revisions where schedule_week_id=w.id and staff_id=target_staff and work_date=target_date and is_current for update;
  next_revision:=coalesce(previous.revision,0)+1;
  if previous.id is not null then update public.shift_assignment_revisions set is_current=false where id=previous.id; end if;
  insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by)
  values(company,w.id,target_staff,p_branch_id,target_date,target_kind,template_id,custom_start,custom_end,coalesce((item->>'custom_crosses_midnight')::boolean,false),custom_break,custom_cap,nullif(trim(item->>'custom_reason'),''),next_revision,
   coalesce((select to_jsonb(t) from public.shift_templates t where t.id=template_id),jsonb_build_object('planned_start',custom_start,'planned_end',custom_end,'crosses_midnight',coalesce((item->>'custom_crosses_midnight')::boolean,false),'planned_break_seconds',custom_break,'maximum_recognised_seconds',custom_cap,'grace_seconds',0,'match_before_seconds',14400,'match_after_seconds',14400,'overtime_rule',jsonb_build_object('mode','approved_only','threshold_seconds',0,'maximum_seconds',0,'rounding_minutes',1))),previous.id,actor);
 end loop;
 update public.schedule_weeks set updated_at=now() where id=w.id returning * into w; return w;
end $$;

create or replace function public.recalculate_attendance_week(p_batch_id uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare
 batch public.attendance_import_batches; a record; points timestamptz[]; sources text[]; punch_types text[]; point_count integer;
 idx integer; raw_seconds integer; recognised integer; breaks integer; first_in timestamptz; last_out timestamptz;
 shift_start timestamptz; shift_end timestamptz; window_start timestamptz; window_end timestamptz; interval_start timestamptz; interval_end timestamptz;
 cap_seconds integer; revision_no integer; prior_id uuid; result_id uuid; exceptions text[]; expected_sources text[]; calculated integer:=0;
begin
 select * into batch from public.attendance_import_batches where id=p_batch_id and company_id=public.current_staff_company_id();
 if batch.id is null or batch.parser_profile<>'view_attendance_punch' or not public.has_any_permission(array['attendance.import','attendance.adjust']) then raise exception 'Attendance calculation is not authorised.'; end if;
 for a in
  select ar.*,coalesce((ar.template_snapshot->>'planned_start')::time,t.planned_start,ar.custom_start) planned_start,coalesce((ar.template_snapshot->>'planned_end')::time,t.planned_end,ar.custom_end) planned_end,coalesce((ar.template_snapshot->>'crosses_midnight')::boolean,t.crosses_midnight,ar.custom_crosses_midnight,false) crosses_midnight,coalesce((ar.template_snapshot->>'planned_break_seconds')::integer,t.planned_break_seconds,ar.custom_break_seconds,0) planned_break_seconds,coalesce((ar.template_snapshot->>'maximum_recognised_seconds')::integer,t.maximum_recognised_seconds,ar.custom_maximum_recognised_seconds,30600) maximum_recognised_seconds,coalesce((ar.template_snapshot->>'grace_seconds')::integer,t.grace_seconds,0) grace_seconds,coalesce((ar.template_snapshot->>'match_before_seconds')::integer,t.match_before_seconds,14400) match_before_seconds,coalesce((ar.template_snapshot->>'match_after_seconds')::integer,t.match_after_seconds,14400) match_after_seconds,s.employment_type,s.daily_recognised_cap_seconds
  from public.shift_assignment_revisions ar left join public.shift_templates t on t.id=ar.shift_template_id join public.staffs s on s.id=ar.staff_id
  where ar.company_id=batch.company_id and ar.work_date between batch.week_start and batch.week_start+6 and ar.assignment_kind='shift' and ar.is_current
 loop
  shift_start:=(a.work_date+a.planned_start) at time zone 'Asia/Kuala_Lumpur'; shift_end:=((a.work_date+case when a.crosses_midnight then 1 else 0 end)+a.planned_end) at time zone 'Asia/Kuala_Lumpur';
  window_start:=shift_start-make_interval(secs=>a.match_before_seconds); window_end:=shift_end+make_interval(secs=>a.match_after_seconds);
  select array_agg(e.occurred_at order by e.occurred_at),array_agg(e.source_code order by e.occurred_at),array_agg(lower(e.punch_type) order by e.occurred_at) into points,sources,punch_types
  from public.attendance_raw_punch_events e join public.ngteco_person_mappings pm on pm.company_id=e.company_id and pm.person_id=e.person_id and pm.staff_id=a.staff_id and pm.is_active join public.attendance_import_batch_events be on be.event_id=e.id and be.batch_id=batch.id where e.company_id=batch.company_id and e.occurred_at between window_start and window_end;
  point_count:=coalesce(cardinality(points),0); raw_seconds:=0; recognised:=0; breaks:=0; exceptions:='{}'; first_in:=points[1]; last_out:=points[point_count];
  if point_count=0 then exceptions:=array_append(exceptions,'missing_punches'); end if; if point_count%2=1 then exceptions:=array_append(exceptions,'odd_punch_count'); end if;
  idx:=1;
  while idx+1<=point_count loop
   interval_start:=points[idx]; interval_end:=points[idx+1];
   if (punch_types[idx] is not null and punch_types[idx] not in ('in','check in','check-in')) or (punch_types[idx+1] is not null and punch_types[idx+1] not in ('out','check out','check-out')) or interval_end<=interval_start then exceptions:=array_append(exceptions,'impossible_ordering');
   else raw_seconds:=raw_seconds+extract(epoch from interval_end-interval_start)::integer; recognised:=recognised+greatest(0,extract(epoch from least(interval_end,shift_end)-greatest(interval_start,shift_start))::integer); if idx>1 then breaks:=breaks+greatest(0,extract(epoch from interval_start-points[idx-1])::integer); end if; end if;
   idx:=idx+2;
  end loop;
  if a.planned_break_seconds>0 and point_count<4 then exceptions:=array_append(exceptions,'missing_break_punch'); end if;
  select array_agg(dm.source_code) into expected_sources from public.ngteco_device_mappings dm where dm.company_id=batch.company_id and dm.branch_id=a.branch_id and dm.is_active;
  if cardinality(expected_sources)>0 and exists(select 1 from unnest(sources) source where not(source=any(expected_sources))) then exceptions:=array_append(exceptions,'wrong_branch_device'); end if;
  cap_seconds:=least(a.maximum_recognised_seconds,coalesce(a.daily_recognised_cap_seconds,case when a.employment_type='part_time' then a.maximum_recognised_seconds else 30600 end)); recognised:=least(recognised,cap_seconds);
  select id,calculation_revision into prior_id,revision_no from public.daily_attendance_results where company_id=batch.company_id and staff_id=a.staff_id and work_date=a.work_date and is_current for update;
  revision_no:=coalesce(revision_no,0)+1; if prior_id is not null then update public.daily_attendance_results set is_current=false where id=prior_id; end if;
  insert into public.daily_attendance_results(company_id,staff_id,branch_id,work_date,assignment_id,import_batch_id,calculation_revision,scheduled_start,scheduled_end,actual_first_in,actual_last_out,raw_work_seconds,recognised_paid_seconds,break_seconds,late_seconds,early_leave_seconds,pre_shift_seconds,post_shift_seconds,statuses,calculation)
  values(batch.company_id,a.staff_id,a.branch_id,a.work_date,a.id,batch.id,revision_no,shift_start,shift_end,first_in,last_out,raw_seconds,recognised,breaks,greatest(0,coalesce(extract(epoch from first_in-shift_start)::integer,0)-a.grace_seconds),greatest(0,coalesce(extract(epoch from shift_end-last_out)::integer,0)),greatest(0,coalesce(extract(epoch from shift_start-first_in)::integer,0)),greatest(0,coalesce(extract(epoch from last_out-shift_end)::integer,0)),exceptions,jsonb_build_object('punches',coalesce(to_jsonb(points),'[]'::jsonb),'cap_seconds',cap_seconds,'seconds_precise',true)) returning id into result_id;
  insert into public.attendance_exceptions(company_id,result_id,batch_id,exception_code,severity) select batch.company_id,result_id,batch.id,code,case when code in ('missing_punches','odd_punch_count','missing_break_punch','impossible_ordering') then 'blocker' else 'warning' end from unnest(exceptions) code; calculated:=calculated+1;
 end loop; return calculated;
end $$;

revoke all on function public.save_schedule_week(uuid,date,jsonb),public.recalculate_attendance_week(uuid) from public,anon;
grant execute on function public.save_schedule_week(uuid,date,jsonb),public.recalculate_attendance_week(uuid) to authenticated;
notify pgrst, 'reload schema';
