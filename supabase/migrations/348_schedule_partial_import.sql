begin;

-- Explicit, non-destructive partial workbook imports. Existing roster functions
-- remain untouched. Each request is atomic and its stable receipt supports retry.
create table public.schedule_workbook_receipts (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 request_key text not null check(length(request_key)=64),
 week_start date not null,
 file_hash text not null check(length(file_hash)=64),
 source_metadata jsonb not null default '{}',
 outcome jsonb not null,
 imported_by uuid not null references public.staffs(id),
 created_at timestamptz not null default now(),
 unique(company_id,request_key)
);
alter table public.schedule_workbook_receipts enable row level security;
-- Access only through the permission-checked import RPC; no direct client writes.
revoke all on public.schedule_workbook_receipts from public,anon,authenticated;

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
  if not exists(select 1 from public.staff_branches sb where sb.staff_id=target_staff and sb.branch_id=p_branch_id) then raise exception 'Employee is outside this outlet catalogue.'; end if;
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

create function public.append_schedule_workbook_drafts(
 p_week_start date,p_file_name text,p_file_hash text,p_outlets jsonb,
 p_unresolved_count integer,p_source_metadata jsonb,p_request_key text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
 receipt public.schedule_workbook_receipts; outlet jsonb; saved public.schedule_weeks;
 outcomes jsonb:='[]'::jsonb;
begin
 if company is null or actor is null or not public.has_permission('schedule.draft') then raise exception 'Schedule draft import is not authorised.'; end if;
 if p_request_key is null or p_request_key !~ '^[0-9a-f]{64}$' or p_file_hash is null or p_file_hash !~ '^[0-9a-f]{64}$'
   or coalesce(length(trim(p_file_name)),0)=0 or p_week_start is null or extract(isodow from p_week_start)<>1
   or jsonb_typeof(p_outlets) is distinct from 'array' or jsonb_array_length(p_outlets)<>1
   or p_unresolved_count is distinct from 0 then raise exception 'Invalid selected workbook import.'; end if;
 -- Serialize every writer during the short append transaction. Existing rows are
 -- tested after the lock and are never retired, updated or reconstructed.
 lock table public.shift_assignment_revisions in share row exclusive mode;
 perform pg_advisory_xact_lock(hashtextextended('schedule-import:'||company::text||':'||p_week_start::text,0));
 outlet:=p_outlets->0;
 if not public.can_access_company_branch(company,(outlet->>'branch_id')::uuid) then raise exception 'Outlet is outside your access.'; end if;
 select * into receipt from public.schedule_workbook_receipts where company_id=company and request_key=p_request_key;
 if receipt.id is not null then
   if receipt.file_hash<>p_file_hash or receipt.week_start<>p_week_start or receipt.source_metadata->'selectedOutlets' is distinct from p_outlets then raise exception 'Import retry does not match the original selection.'; end if;
   return receipt.outcome||jsonb_build_object('idempotent',true);
 end if;
 if jsonb_typeof(outlet->'assignments') is distinct from 'array' or jsonb_array_length(outlet->'assignments')=0 then raise exception 'Select at least one assignment.'; end if;
 saved:=public.append_schedule_workbook_rows((outlet->>'branch_id')::uuid,p_week_start,outlet->'assignments');
 outcomes:=jsonb_build_array(jsonb_build_object('branch_id',saved.branch_id,'schedule_week_id',saved.id,'status',saved.status,'assignments',jsonb_array_length(outlet->'assignments')));
 insert into public.schedule_workbook_receipts(company_id,request_key,week_start,file_hash,source_metadata,outcome,imported_by)
 values(company,p_request_key,p_week_start,p_file_hash,coalesce(p_source_metadata,'{}')||jsonb_build_object('fileName',p_file_name,'selectedOutlets',p_outlets),jsonb_build_object('outcomes',outcomes,'idempotent',false),actor);
 return jsonb_build_object('outcomes',outcomes,'idempotent',false);
end $$;
revoke all on function public.append_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb,text) from public,anon;
grant execute on function public.append_schedule_workbook_drafts(date,text,text,jsonb,integer,jsonb,text) to authenticated;
notify pgrst,'reload schema';

create function public.get_schedule_workbook_import_history(p_week_start date)
returns jsonb language sql security definer set search_path=public stable as $$
 select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb) from (
  select r.created_at,jsonb_build_object('id',r.id,'fileName',r.source_metadata->>'fileName','createdAt',r.created_at,'outcomes',r.outcome->'outcomes') item
  from public.schedule_workbook_receipts r
  where r.company_id=public.current_staff_company_id() and r.week_start=p_week_start and public.has_permission('schedule.draft')
   and not exists(select 1 from jsonb_array_elements(r.outcome->'outcomes') o where not public.can_access_company_branch(r.company_id,(o->>'branch_id')::uuid))
  order by r.created_at desc limit 25
 ) recent
$$;
revoke all on function public.get_schedule_workbook_import_history(date) from public,anon;
grant execute on function public.get_schedule_workbook_import_history(date) to authenticated;
notify pgrst,'reload schema';

commit;
