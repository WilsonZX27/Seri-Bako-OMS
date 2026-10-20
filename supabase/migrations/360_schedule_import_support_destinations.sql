begin;
-- Align workbook imports with company-wide scheduling eligibility already used
-- by the roster editor (281/304). Destination permissions, dated eligibility,
-- tenant checks, draft protection and optimistic concurrency remain enforced.
-- This never creates staff_branches memberships or grants destination app access.
create or replace function public.append_schedule_workbook_rows(p_branch_id uuid,p_week_start date,p_assignments jsonb) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); w public.schedule_weeks;
 item jsonb; previous public.shift_assignment_revisions; next_revision integer; target_staff uuid; target_date date;
 target_kind text; template_id uuid; custom_start time; custom_end time; custom_break integer; custom_cap integer; non_standard boolean;

begin
 if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then raise exception 'Schedule draft is not authorised.'; end if;
 if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_assignments)<>'array' or jsonb_array_length(p_assignments)>1000 then raise exception 'Invalid schedule week payload.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-import:'||company::text||':'||p_week_start::text,0));
 select * into w from public.schedule_weeks where company_id=company and branch_id=p_branch_id and week_start=p_week_start and revision=1 for update;
 if w.id is null then insert into public.schedule_weeks(company_id,branch_id,week_start,created_by) values(company,p_branch_id,p_week_start,actor) returning * into w;
 elsif w.status not in ('draft','returned','rejected','amendment_pending') or w.locked_at is not null then raise exception 'This schedule week is not editable.'; end if;
 for item in select value from jsonb_array_elements(p_assignments) loop
  target_staff:=(item->>'staff_id')::uuid; target_date:=(item->>'work_date')::date; target_kind:=lower(item->>'assignment_kind'); template_id:=nullif(item->>'shift_template_id','')::uuid;
  custom_start:=nullif(item->>'custom_start','')::time; custom_end:=nullif(item->>'custom_end','')::time;
  custom_break:=nullif(item->>'custom_break_seconds','')::integer; custom_cap:=nullif(item->>'custom_maximum_recognised_seconds','')::integer;
  if target_date not between p_week_start and p_week_start+6 or target_kind not in ('shift','off','ph','al','mc','upl','ro','oil') then raise exception 'Invalid assignment row.'; end if;
  if not exists(select 1 from public.staffs s where s.id=target_staff and s.company_id=company) then raise exception 'Employee is outside this company catalogue.'; end if;
  if not public.is_staff_schedule_eligible(target_staff,target_date) then raise exception 'Staff is not eligible for outlet scheduling.'; end if;
  if template_id is not null and not exists(select 1 from public.shift_templates t where t.id=template_id and t.company_id=company and t.is_active and (cardinality(t.branch_ids)=0 or p_branch_id=any(t.branch_ids))) then raise exception 'Shift template is not valid for this outlet.'; end if;
  if target_kind='shift' and template_id is null then
   if custom_start is null or custom_end is null or nullif(trim(item->>'custom_reason'),'') is null or coalesce(custom_break,-1)<0 or coalesce(custom_cap,0)<=0 then raise exception 'Direct working times, break, paid cap and reason are required.'; end if;
   non_standard:=extract(minute from custom_start)::integer%30<>0 or extract(second from custom_start)<>0 or extract(minute from custom_end)::integer%30<>0 or extract(second from custom_end)<>0;
   if non_standard and not public.has_permission('shift_template.non_standard') then raise exception 'Non-standard working times require Owner authority.'; end if;
  end if;
  if exists(select 1 from public.shift_assignment_revisions where company_id=company and staff_id=target_staff and work_date=target_date and is_current) then raise exception 'An existing employee day cannot be replaced by workbook import.'; end if;
  if item ? 'ro_minutes' or item ? 'destination_branch_id' then raise exception 'RO and destination corrections require the schedule editor.'; end if;
  select * into previous from public.shift_assignment_revisions where schedule_week_id=w.id and staff_id=target_staff and work_date=target_date order by revision desc limit 1 for update;
  next_revision:=coalesce(previous.revision,0)+1;

  insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by,work_site_label)
  values(company,w.id,target_staff,p_branch_id,target_date,target_kind,template_id,custom_start,custom_end,coalesce((item->>'custom_crosses_midnight')::boolean,false),custom_break,custom_cap,nullif(trim(item->>'custom_reason'),''),next_revision,
   coalesce((select to_jsonb(t) from public.shift_templates t where t.id=template_id),jsonb_build_object('planned_start',custom_start,'planned_end',custom_end,'crosses_midnight',coalesce((item->>'custom_crosses_midnight')::boolean,false),'planned_break_seconds',custom_break,'maximum_recognised_seconds',custom_cap,'grace_seconds',0,'match_before_seconds',14400,'match_after_seconds',14400,'overtime_rule',jsonb_build_object('mode','approved_only','threshold_seconds',0,'maximum_seconds',0,'rounding_minutes',1))),previous.id,actor,nullif(trim(item->>'work_site_label'),''));
 end loop;
 update public.schedule_weeks set updated_at=now() where id=w.id returning * into w; return w;
end $$;

revoke all on function public.append_schedule_workbook_rows(uuid,date,jsonb) from public,anon,authenticated;

create or replace function public.reconcile_schedule_workbook_drafts(
 p_week_start date,p_file_name text,p_file_hash text,p_outlets jsonb,
 p_unresolved_count integer,p_source_metadata jsonb,p_request_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
 receipt public.schedule_workbook_receipts; outlet jsonb; item jsonb; prior record;
 saved public.schedule_weeks; outcomes jsonb:='[]'; actual_ids jsonb; expected_ids jsonb;
 rule record; rule_branch uuid; rule_staff uuid; key_parts jsonb;
begin
 if company is null or actor is null or not public.has_permission('schedule.draft') then raise exception 'Schedule draft import is not authorised.'; end if;
 if p_request_key is null or p_request_key !~ '^[0-9a-f]{64}$' or p_file_hash is null or p_file_hash !~ '^[0-9a-f]{64}$'
 or p_week_start is null or extract(isodow from p_week_start)<>1 or coalesce(length(trim(p_file_name)),0)=0
 or jsonb_typeof(p_outlets) is distinct from 'array' or jsonb_array_length(p_outlets) not between 1 and 50
 or p_unresolved_count is distinct from 0 then raise exception 'Invalid workbook selection.'; end if;
 lock table public.shift_assignment_revisions in share row exclusive mode;
 perform pg_advisory_xact_lock(hashtextextended('schedule-import:'||company::text||':'||p_week_start::text,0));
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  if not public.can_access_company_branch(company,(outlet->>'branch_id')::uuid) then raise exception 'Outlet is outside your access.'; end if;
  if jsonb_typeof(outlet->'assignments') is distinct from 'array' or jsonb_array_length(outlet->'assignments') not between 1 and 1000 then raise exception 'Invalid assignment selection.'; end if;

 end loop;
 select * into receipt from public.schedule_workbook_receipts where company_id=company and request_key=p_request_key;
 if receipt.id is not null then
  if receipt.file_hash<>p_file_hash or receipt.week_start<>p_week_start or receipt.source_metadata->'selectedOutlets' is distinct from p_outlets then raise exception 'Import retry does not match its receipt.'; end if;
  return receipt.outcome||jsonb_build_object('idempotent',true);
 end if;
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  perform 1 from public.schedule_weeks where company_id=company and branch_id=(outlet->>'branch_id')::uuid and week_start=p_week_start for update;
  if exists(select 1 from public.schedule_weeks where company_id=company and branch_id=(outlet->>'branch_id')::uuid and week_start=p_week_start and (revision<>1 or status not in ('draft','returned','rejected') or locked_at is not null)) then raise exception 'A selected schedule is protected. Preview again.'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') a group by a->>'staff_id',a->>'work_date' having count(*)>1) then raise exception 'Choose one assignment per employee day.'; end if;
 select coalesce(jsonb_agg(a.id::text order by a.id::text),'[]') into actual_ids
 from public.shift_assignment_revisions a
 where a.company_id=company and a.is_current and exists(select 1 from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') x where (x->>'staff_id')::uuid=a.staff_id and (x->>'work_date')::date=a.work_date);
 select coalesce(jsonb_agg(value order by value),'[]') into expected_ids from jsonb_array_elements_text(coalesce(p_source_metadata->'expectedAssignments','[]'));
 if actual_ids is distinct from expected_ids then raise exception 'The draft changed since preview. Check changes again before importing.'; end if;
 for prior in select a.id,a.branch_id,to_jsonb(a) assignment,w.status,w.revision,w.locked_at
 from public.shift_assignment_revisions a join public.schedule_weeks w on w.id=a.schedule_week_id
 where a.company_id=company and a.is_current and a.id::text in(select jsonb_array_elements_text(actual_ids)) for update of w loop
  if coalesce((prior.assignment->>'ro_minutes')::integer,0)>0 then raise exception 'An existing employee day is protected.'; end if;
  if not public.can_access_company_branch(company,prior.branch_id) or prior.status not in ('draft','returned','rejected') or prior.revision<>1 or prior.locked_at is not null then raise exception 'An existing employee day is protected.'; end if;
 end loop;
 update public.shift_assignment_revisions set is_current=false where company_id=company and is_current and id::text in(select jsonb_array_elements_text(actual_ids));
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  saved:=public.append_schedule_workbook_rows((outlet->>'branch_id')::uuid,p_week_start,outlet->'assignments');
  outcomes:=outcomes||jsonb_build_array(jsonb_build_object('branch_id',saved.branch_id,'schedule_week_id',saved.id,'status',saved.status,'assignments',jsonb_array_length(outlet->'assignments')));
 end loop;
 if jsonb_typeof(coalesce(p_source_metadata->'reusableRules','{}'))<>'object' or (select count(*) from jsonb_object_keys(coalesce(p_source_metadata->'reusableRules','{}')))>1000 then raise exception 'Invalid import rules.'; end if;
 for rule in select key,value from jsonb_each(coalesce(p_source_metadata->'reusableRules','{}')) loop
  key_parts:=rule.key::jsonb;rule_branch:=(rule.value->>'branchId')::uuid;rule_staff:=nullif(rule.value->>'staffId','')::uuid;
  if jsonb_typeof(key_parts)<>'array' or jsonb_array_length(key_parts)<>4 or key_parts->>1 not in ('branch','employee','shift','end','destination') or length(rule.key)>1000
  or jsonb_typeof(rule.value)<>'object' or rule_branch is null then raise exception 'Invalid reusable import rule.'; end if;
  if not exists(select 1 from jsonb_array_elements(p_outlets) o where (o->>'branch_id')::uuid=rule_branch) then continue; end if;
  if not public.can_access_company_branch(company,rule_branch) then raise exception 'Rule location is outside your access.'; end if;
  if rule_staff is not null and not exists(select 1 from public.staffs s where s.id=rule_staff and s.company_id=company) then raise exception 'Rule employee is outside this location.'; end if;
  if key_parts->>1<>'branch' and key_parts->>2<>rule_branch::text then raise exception 'Rule key location does not match its scope.'; end if;
  if exists(select 1 from public.schedule_workbook_rules r where r.company_id=company and r.rule_key=rule.key and not public.can_access_company_branch(company,r.branch_id)) then raise exception 'Existing rule is outside your access.'; end if;
  if rule.value ? 'destinationId' and not public.can_access_company_branch(company,(rule.value->>'destinationId')::uuid) then raise exception 'Rule destination is outside your access.'; end if;
  if key_parts->>1='shift' and (key_parts->>3) ~* '(^|[^a-z])ot([^a-z]|$)' then raise exception 'OT conditions must be confirmed for each source employee day.'; end if;
  if rule.value ? 'kind' and rule.value->>'kind' not in ('off','ph','al','mc','upl','ro','oil') then raise exception 'Invalid leave rule.'; end if;
  if rule.value ? 'start' then perform (rule.value->>'start')::time; end if;
  if rule.value ? 'end' then perform (rule.value->>'end')::time; end if;
  insert into public.schedule_workbook_rules(company_id,rule_key,branch_id,rule_value,confirmed_by)
  values(company,rule.key,rule_branch,rule.value,actor) on conflict(company_id,rule_key) do update set branch_id=excluded.branch_id,rule_value=excluded.rule_value,confirmed_by=excluded.confirmed_by,confirmed_at=now();
 end loop;
 if jsonb_typeof(coalesce(p_source_metadata->'untimedDuties','[]'))<>'array' or jsonb_array_length(coalesce(p_source_metadata->'untimedDuties','[]'))>1000 then raise exception 'Invalid untimed roster notes.'; end if;
 for item in select value from jsonb_array_elements(coalesce(p_source_metadata->'untimedDuties','[]')) loop
  if item->>'date' is null or item->>'branchId' is null or item->>'staffId' is null or item->>'label' not in ('MORNING','AFTERNOON','NIGHT') or item->>'label' is null or (item->>'date')::date not between p_week_start and p_week_start+6
   or not exists(select 1 from jsonb_array_elements(p_outlets) o where o->>'branch_id'=item->>'branchId')
   or not exists(select 1 from public.staffs s where s.company_id=company and s.id=(item->>'staffId')::uuid)
   or public.staff_requires_fingerprint(company,(item->>'staffId')::uuid,(item->>'date')::date)
   or not public.is_staff_schedule_eligible((item->>'staffId')::uuid,(item->>'date')::date) then raise exception 'An untimed duty requires a dated staff fingerprint exception and authorised location.'; end if;
 end loop;
 insert into public.schedule_workbook_receipts(company_id,request_key,week_start,file_hash,source_metadata,outcome,imported_by)
 values(company,p_request_key,p_week_start,p_file_hash,coalesce(p_source_metadata,'{}')||jsonb_build_object('fileName',p_file_name,'selectedOutlets',p_outlets,'retiredAssignmentIds',actual_ids),jsonb_build_object('outcomes',outcomes,'idempotent',false),actor);
 return jsonb_build_object('outcomes',outcomes,'idempotent',false);
end $$;
revoke all on function public.reconcile_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb,text) from public,anon;
grant execute on function public.reconcile_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
