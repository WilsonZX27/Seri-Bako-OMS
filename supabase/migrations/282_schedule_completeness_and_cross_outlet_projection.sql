-- Close schedule completeness gaps and expose a safe, read-only projection of
-- canonical shifts that are owned by another outlet roster.

alter table public.shift_assignment_revisions add column if not exists work_site_label text
  check(work_site_label is null or length(trim(work_site_label)) between 1 and 120);

create or replace function public.get_schedule_branches() returns table(id uuid,branch_name text)
language sql security definer set search_path=public stable as $$
 select b.id,b.branch_name from public.branches b
 where b.company_id=public.current_staff_company_id() and b.branch_type in ('outlet','central_kitchen')
   and b.status='active' and b.deleted_at is null and public.can_access_company_branch(b.company_id,b.id)
   and public.has_any_permission(array['schedule.read','schedule.draft','schedule.submit','schedule.approve','schedule.swap_review'])
 order by b.branch_name,b.id
$$;

create or replace function public.save_schedule_week(p_branch_id uuid,p_week_start date,p_assignments jsonb) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare result public.schedule_weeks; item jsonb; a public.shift_assignment_revisions; original_start time; original_end time; adjusted_start time; adjusted_end time; minutes integer; direction text; staff_type text; site_label text; begin
 for item in select value from jsonb_array_elements(p_assignments) loop
  minutes:=nullif(item->>'ro_minutes','')::integer;
  site_label:=nullif(trim(item->>'work_site_label'),'');
  if site_label is not null and length(site_label)>120 then raise exception 'Work location must be 120 characters or fewer.'; end if;
  if minutes is not null then
   if minutes<=0 or minutes%30<>0 or lower(item->>'assignment_kind')<>'shift' then raise exception 'RO must be attached to a working shift in 30-minute units.'; end if;
   select employment_type into staff_type from public.staffs where id=(item->>'staff_id')::uuid and company_id=public.current_staff_company_id();
   if staff_type<>'full_time' then raise exception 'Only Full-time employees can reserve RO.'; end if;
   select planned_start,planned_end into original_start,original_end from public.shift_templates where id=nullif(item->>'shift_template_id','')::uuid and company_id=public.current_staff_company_id();
   original_start:=coalesce(nullif(item->>'ro_original_start','')::time,original_start); original_end:=coalesce(nullif(item->>'ro_original_end','')::time,original_end);
   adjusted_start:=nullif(item->>'custom_start','')::time; adjusted_end:=nullif(item->>'custom_end','')::time;
   if original_start is null or original_end is null or adjusted_start is null or adjusted_end is null then raise exception 'Original and adjusted RO shift times are required.'; end if;
   direction:=case when adjusted_start>original_start and adjusted_end=original_end then 'late_start' when adjusted_start=original_start and adjusted_end<original_end then 'early_finish' end;
   if direction is null or (case direction when 'late_start' then extract(epoch from adjusted_start-original_start) else extract(epoch from original_end-adjusted_end) end)::integer<>minutes*60 then raise exception 'Adjusted shift must redeem exactly the selected RO minutes at one edge.'; end if;
  end if;
 end loop;
 result := public.save_schedule_week_before_ro(p_branch_id,p_week_start,p_assignments);
 for item in select value from jsonb_array_elements(p_assignments) loop
  minutes:=nullif(item->>'ro_minutes','')::integer;
  site_label:=nullif(trim(item->>'work_site_label'),'');
  select * into a from public.shift_assignment_revisions where schedule_week_id=result.id and staff_id=(item->>'staff_id')::uuid and work_date=(item->>'work_date')::date and is_current;
  if a.id is not null then
   update public.shift_assignment_revisions set work_site_label=case when assignment_kind='shift' then site_label else null end where id=a.id;
   if minutes is null then update public.shift_assignment_revisions set ro_minutes=null,ro_original_start=null,ro_original_end=null,ro_direction=null where id=a.id;
   else
    select planned_start,planned_end into original_start,original_end from public.shift_templates where id=a.shift_template_id;
    original_start:=coalesce(nullif(item->>'ro_original_start','')::time,original_start); original_end:=coalesce(nullif(item->>'ro_original_end','')::time,original_end);
    adjusted_start:=nullif(item->>'custom_start','')::time; adjusted_end:=nullif(item->>'custom_end','')::time;
    direction:=case when adjusted_start>original_start then 'late_start' else 'early_finish' end;
    update public.shift_assignment_revisions set ro_minutes=minutes,ro_original_start=original_start,ro_original_end=original_end,ro_direction=direction,
      template_snapshot=template_snapshot||jsonb_build_object('planned_start',adjusted_start,'planned_end',adjusted_end,'ro_original_start',original_start,'ro_original_end',original_end,'ro_minutes',minutes,'ro_direction',direction)
    where id=a.id;
   end if;
  end if;
 end loop; return result; end $$;

create or replace function public.copy_schedule_week(p_source_week_id uuid,p_target_week_start date) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare source public.schedule_weeks; result public.schedule_weeks; payload jsonb; begin
 select * into source from public.schedule_weeks where id=p_source_week_id and company_id=public.current_staff_company_id();
 if source.id is null or not public.can_access_company_branch(source.company_id,source.branch_id) or extract(isodow from p_target_week_start)<>1 then raise exception 'Schedule copy is not authorised.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('staff_id',a.staff_id,'work_date',p_target_week_start+(a.work_date-source.week_start),'assignment_kind',a.assignment_kind,'shift_template_id',a.shift_template_id,'custom_start',a.custom_start,'custom_end',a.custom_end,'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,'custom_reason',coalesce(a.custom_reason,'Copied from prior week'),'work_site_label',a.work_site_label,'ro_minutes',a.ro_minutes,'ro_original_start',a.ro_original_start,'ro_original_end',a.ro_original_end,'ro_direction',a.ro_direction)),'[]'::jsonb) into payload
 from public.shift_assignment_revisions a where a.schedule_week_id=source.id and a.is_current;
 result := public.save_schedule_week(source.branch_id,p_target_week_start,payload); return result; end $$;

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
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','unresolved_staff_day','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has no schedule for '||to_char(q.work_date,'Dy, DD Mon')||'. Add a shift, OFF or leave, or schedule the employee at the destination outlet.'))
   from (
    select s.id staff_id,s.full_name,d.work_date
    from public.staffs s
    join public.staff_branches sb on sb.staff_id=s.id and sb.branch_id=w.branch_id
    cross join lateral generate_series(w.week_start,w.week_start+6,interval '1 day') d(work_date)
    where s.company_id=w.company_id and s.employment_type='full_time' and s.status='active' and s.deleted_at is null
      and exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=d.work_date::date and (sr.effective_to is null or sr.effective_to>=d.work_date::date) and r.role_code in ('outlet_staff','outlet_supervisor'))
      and not exists(
        select 1 from public.shift_assignment_revisions a
        join public.schedule_weeks aw on aw.id=a.schedule_week_id
        where a.company_id=w.company_id and a.staff_id=s.id and a.work_date=d.work_date::date and a.is_current
          and ((a.schedule_week_id=w.id) or (a.assignment_kind='shift' and aw.week_start=w.week_start and aw.branch_id<>w.branch_id and aw.status in ('submitted','published','locked')))
      )
    order by s.full_name,d.work_date
   ) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','inactive_staff','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' is inactive and must be removed before submission.')) from (select distinct a.staff_id,s.full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and (s.status<>'active' or s.deleted_at is not null)) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','cross_branch_collision','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has another outlet shift on '||q.work_date::text||'.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id and other.branch_id<>a.branch_id and other.assignment_kind='shift' where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift') q),'[]'::jsonb);
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $$;

create or replace function public.get_schedule_external_assignments(p_branch_id uuid,p_week_start date)
returns table(staff_id uuid,work_date date,branch_id uuid,branch_name text,planned_start time,planned_end time)
language sql security definer set search_path=public stable as $$
 select a.staff_id,a.work_date,a.branch_id,b.branch_name,
   coalesce(a.custom_start,(a.template_snapshot->>'planned_start')::time),
   coalesce(a.custom_end,(a.template_snapshot->>'planned_end')::time)
 from public.shift_assignment_revisions a
 join public.schedule_weeks w on w.id=a.schedule_week_id
 join public.branches b on b.id=a.branch_id
 where a.company_id=public.current_staff_company_id() and a.is_current and a.assignment_kind='shift'
   and w.week_start=p_week_start and w.branch_id<>p_branch_id and w.status in ('submitted','published','locked')
   and public.has_permission('schedule.read') and public.can_access_company_branch(a.company_id,p_branch_id)
   and exists(select 1 from public.staff_branches sb where sb.staff_id=a.staff_id and sb.branch_id=p_branch_id)
 order by a.work_date,b.branch_name,a.staff_id
$$;

create or replace function public.edit_and_publish_schedule_week(p_week_id uuid,p_assignments jsonb,p_expected_updated_at timestamptz,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare roster public.schedule_weeks; saved_week public.schedule_weeks; published_week public.schedule_weeks; before_assignments jsonb; after_assignments jsonb; validation jsonb; source_status text;
begin
 if not public.has_permission('schedule.approve') or not public.has_permission('schedule.draft') then raise exception 'Schedule decision is not authorised.'; end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Manager correction reason is required.'; end if;
 select * into roster from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 if roster.id is null or not public.can_access_company_branch(roster.company_id,roster.branch_id) then raise exception 'Schedule decision is not authorised.'; end if;
 if roster.status not in ('submitted','published') or roster.locked_at is not null then raise exception 'Only a submitted or published unlocked roster may be corrected.'; end if;
 if p_expected_updated_at is not null and roster.updated_at<>p_expected_updated_at then raise exception 'Schedule changed since it was opened.'; end if;
 source_status:=roster.status;
 select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb) into before_assignments from public.shift_assignment_revisions a where a.schedule_week_id=roster.id and a.is_current;
 update public.schedule_weeks set status='amendment_pending',updated_at=now() where id=roster.id;
 select public.save_schedule_week(roster.branch_id,roster.week_start,p_assignments) into saved_week;
 validation:=public.validate_schedule_week(saved_week.id);
 if jsonb_array_length(coalesce(validation->'blockers','[]'::jsonb))>0 then raise exception '%',coalesce(validation->'blockers'->0->>'message','Schedule validation failed.'); end if;
 select coalesce(jsonb_agg(to_jsonb(a) order by a.staff_id,a.work_date),'[]'::jsonb) into after_assignments from public.shift_assignment_revisions a where a.schedule_week_id=roster.id and a.is_current;
 update public.schedule_weeks set status='submitted',updated_at=now() where id=roster.id;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment,before_state,after_state)
 values(roster.company_id,roster.id,'manager_edit',source_status,'submitted',public.current_staff_id(),trim(p_reason),jsonb_build_object('assignments',before_assignments),jsonb_build_object('assignments',after_assignments));
 select public.decide_schedule_week(roster.id,'approve',trim(p_reason)) into published_week;
 return jsonb_build_object('week',to_jsonb(published_week),'warnings',coalesce(validation->'warnings','[]'::jsonb));
end $$;

revoke all on function public.get_schedule_external_assignments(uuid,date) from public,anon;
grant execute on function public.get_schedule_external_assignments(uuid,date) to authenticated;
revoke all on function public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.edit_and_publish_schedule_week(uuid,jsonb,timestamptz,text) to authenticated;
notify pgrst,'reload schema';
