-- Reprocess an older parser's idempotent workbook batch exactly once when a
-- newer parser can remove collisions with immutable rosters. Assignment
-- revisions and the prior batch metadata retain the audit trail.

create or replace function public.import_schedule_workbook_drafts(
  p_week_start date,p_file_name text,p_file_hash text,p_outlets jsonb,
  p_unresolved_count integer default 0,p_source_metadata jsonb default '{}'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
 existing public.schedule_import_batches; batch public.schedule_import_batches; outlet jsonb;
 current_week public.schedule_weeks; saved public.schedule_weeks; outcomes jsonb:='[]'::jsonb;
 assignment_total integer:=0; requested_parser integer:=coalesce((p_source_metadata->>'parserVersion')::integer,0);
begin
 if not public.has_permission('schedule.draft') then raise exception 'Schedule draft import is not authorised.'; end if;
 if extract(isodow from p_week_start)<>1 or coalesce(length(trim(p_file_name)),0)=0 or coalesce(length(p_file_hash),0)<>64 or jsonb_typeof(p_outlets)<>'array' or jsonb_array_length(p_outlets)=0 or jsonb_array_length(p_outlets)>50 then raise exception 'Invalid schedule workbook import payload.'; end if;
 if p_unresolved_count<>0 then raise exception 'Resolve or explicitly remove every unresolved workbook value before importing drafts.'; end if;
 select * into existing from public.schedule_import_batches where company_id=company and week_start=p_week_start and file_hash=p_file_hash for update;
 if existing.id is not null and coalesce((existing.source_metadata->>'parserVersion')::integer,0)>=requested_parser then
  return jsonb_build_object('batch',to_jsonb(existing),'idempotent',true,'outcomes',existing.source_metadata->'outcomes');
 end if;
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  if jsonb_typeof(outlet->'assignments')<>'array' then raise exception 'Each outlet requires an assignments array.'; end if;
  select * into current_week from public.schedule_weeks where company_id=company and branch_id=(outlet->>'branch_id')::uuid and week_start=p_week_start order by revision desc limit 1 for update;
  if current_week.status in ('submitted','published','locked') then raise exception 'Published or locked schedules cannot be replaced by workbook import.'; end if;
  saved:=public.save_schedule_week((outlet->>'branch_id')::uuid,p_week_start,outlet->'assignments');
  assignment_total:=assignment_total+jsonb_array_length(outlet->'assignments');
  outcomes:=outcomes||jsonb_build_array(jsonb_build_object('branch_id',saved.branch_id,'schedule_week_id',saved.id,'status',saved.status,'assignments',jsonb_array_length(outlet->'assignments')));
 end loop;
 if existing.id is null then
  insert into public.schedule_import_batches(company_id,week_start,file_name,file_hash,outlet_count,assignment_count,unresolved_count,source_metadata,imported_by)
  values(company,p_week_start,left(trim(p_file_name),255),lower(p_file_hash),jsonb_array_length(p_outlets),assignment_total,p_unresolved_count,coalesce(p_source_metadata,'{}'::jsonb)||jsonb_build_object('outcomes',outcomes),actor)
  returning * into batch;
  return jsonb_build_object('batch',to_jsonb(batch),'idempotent',false,'reprocessed',false,'outcomes',outcomes);
 end if;
 update public.schedule_import_batches set
  outlet_count=jsonb_array_length(p_outlets),assignment_count=assignment_total,unresolved_count=p_unresolved_count,
  source_metadata=coalesce(p_source_metadata,'{}'::jsonb)||jsonb_build_object('outcomes',outcomes,'reprocessed_at',now(),'reprocessed_by',actor,'previous_source_metadata',existing.source_metadata)
 where id=existing.id returning * into batch;
 return jsonb_build_object('batch',to_jsonb(batch),'idempotent',false,'reprocessed',true,'outcomes',outcomes);
end $$;

-- Invited staff are deliberately schedulable throughout catalog, save and
-- validation. Deleted and genuinely inactive staff remain blocked.
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
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','unresolved_staff_day','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has no schedule for '||to_char(q.work_date,'Dy, DD Mon')||'. Add a shift, OFF or leave, or schedule the employee at the destination outlet.')) from (
  select s.id staff_id,s.full_name,d.work_date from public.staffs s join public.staff_branches sb on sb.staff_id=s.id and sb.branch_id=w.branch_id cross join lateral generate_series(w.week_start,w.week_start+6,interval '1 day') d(work_date)
  where s.company_id=w.company_id and s.employment_type='full_time' and s.status='active' and s.deleted_at is null
   and exists(select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id where sr.staff_id=s.id and sr.is_primary and sr.effective_from<=d.work_date::date and (sr.effective_to is null or sr.effective_to>=d.work_date::date) and r.role_code in ('outlet_staff','outlet_supervisor'))
   and not exists(select 1 from public.shift_assignment_revisions a join public.schedule_weeks aw on aw.id=a.schedule_week_id where a.company_id=w.company_id and a.staff_id=s.id and a.work_date=d.work_date::date and a.is_current and ((a.schedule_week_id=w.id) or (a.assignment_kind='shift' and aw.week_start=w.week_start and aw.branch_id<>w.branch_id and aw.status in ('submitted','published','locked'))))
  order by s.full_name,d.work_date
 ) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','inactive_staff','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' is inactive and must be removed before submission.')) from (select distinct a.staff_id,s.full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and (s.status not in ('active','invited') or s.deleted_at is not null)) q),'[]'::jsonb);
 blockers:=blockers||coalesce((select jsonb_agg(jsonb_build_object('code','cross_branch_collision','staffId',q.staff_id,'staffName',q.full_name,'workDate',q.work_date,'message',q.full_name||' has another outlet shift on '||q.work_date::text||'.')) from (select distinct a.staff_id,s.full_name,a.work_date from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id and other.branch_id<>a.branch_id and other.assignment_kind='shift' where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift') q),'[]'::jsonb);
 warnings:=coalesce((select jsonb_agg(jsonb_build_object('code','no_weekly_rest','staffId',q.staff_id,'staffName',q.full_name,'message',q.full_name||' has no OFF, public holiday, leave, or off-in-lieu day this week.')) from (select a.staff_id,max(s.full_name) full_name from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','ph','al','mc','upl','ro','oil'))=0) q),'[]'::jsonb);
 return jsonb_build_object('status',case when jsonb_array_length(blockers)>0 then 'blocked' when jsonb_array_length(warnings)>0 then 'warning' else 'ready' end,'blockers',blockers,'warnings',warnings);
end $$;

revoke all on function public.import_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb),public.validate_schedule_week(uuid) from public,anon;
grant execute on function public.import_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb),public.validate_schedule_week(uuid) to authenticated;
notify pgrst,'reload schema';
