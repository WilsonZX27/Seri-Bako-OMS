begin;
create table public.schedule_workbook_rules (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 rule_key text not null check(length(rule_key)<=1000),
 branch_id uuid not null references public.branches(id),
 rule_value jsonb not null,
 confirmed_by uuid not null references public.staffs(id),
 confirmed_at timestamptz not null default now(),
 unique(company_id,rule_key)
);
alter table public.schedule_workbook_rules enable row level security;
revoke all on public.schedule_workbook_rules from public,anon,authenticated;
create function public.get_schedule_workbook_rules() returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_object_agg(rule_key,rule_value),'{}') from public.schedule_workbook_rules
 where company_id=public.current_staff_company_id() and public.has_permission('schedule.draft')
 and public.can_access_company_branch(company_id,branch_id)
$$;
revoke all on function public.get_schedule_workbook_rules() from public,anon;
grant execute on function public.get_schedule_workbook_rules() to authenticated;

-- All selected locations commit together. Retire only reviewed, still-current
-- draft revisions; retain the old revisions and a receipt of the replacement.
create function public.reconcile_schedule_workbook_drafts(
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
  if rule_staff is not null and not exists(select 1 from public.staffs s join public.staff_branches sb on sb.staff_id=s.id where s.id=rule_staff and s.company_id=company and sb.branch_id=rule_branch) then raise exception 'Rule employee is outside this location.'; end if;
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
   or not exists(select 1 from public.staffs s join public.staff_branches sb on sb.staff_id=s.id where s.company_id=company and s.id=(item->>'staffId')::uuid and sb.branch_id=(item->>'branchId')::uuid)
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
