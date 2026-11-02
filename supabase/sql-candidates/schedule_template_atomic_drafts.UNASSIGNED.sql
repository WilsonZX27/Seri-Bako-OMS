-- Candidate only; production installation requires integration review/approval.
-- Protect only current revisions actually created by template import.
-- Every writer participates; unrelated legacy overlaps remain permitted.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

set local search_path=pg_catalog,public,extensions;
lock table public.shift_assignment_revisions in share row exclusive mode;

create function public.schedule_assignment_work_span(a public.shift_assignment_revisions)
returns tsrange language plpgsql immutable security invoker set search_path=pg_catalog,public as $$
declare starts time; ends time; overnight boolean; first_at timestamp; last_at timestamp;
begin
 if not a.is_current or a.assignment_kind<>'shift' then return null; end if;
 starts:=coalesce(a.custom_start,nullif(a.template_snapshot->>'planned_start','')::time);
 ends:=coalesce(a.custom_end,nullif(a.template_snapshot->>'planned_end','')::time);
 overnight:=case when a.custom_start is not null then a.custom_crosses_midnight
  else coalesce((a.template_snapshot->>'crosses_midnight')::boolean,a.custom_crosses_midnight,false) end;
 if starts is null or ends is null then raise exception 'Schedule interval unavailable.'; end if;
 first_at:=a.work_date+starts; last_at:=a.work_date+ends+case when overnight then interval '1 day' else interval '0 day' end;
 if last_at<=first_at or last_at-first_at>interval '1 day' then raise exception 'Schedule interval unavailable.'; end if;
 return tsrange(first_at,last_at,'[)');
exception when others then raise exception using errcode='23514',message='Schedule interval unavailable or invalid.';
end $$;
revoke all on function public.schedule_assignment_work_span(public.shift_assignment_revisions) from public,anon,authenticated,service_role;

create table public.schedule_assignment_interval_guards(
 assignment_id uuid primary key references public.shift_assignment_revisions(id) on delete cascade,
 company_id uuid not null references public.companies(id),
 staff_id uuid not null references public.staffs(id),
 work_span tsrange not null,
 protected boolean not null default false
);
alter table public.schedule_assignment_interval_guards enable row level security;
revoke all on table public.schedule_assignment_interval_guards from public,anon,authenticated,service_role;
create table public.schedule_template_sources(assignment_id uuid primary key references public.shift_assignment_revisions(id) on delete cascade);
alter table public.schedule_template_sources enable row level security;
revoke all on table public.schedule_template_sources from public,anon,authenticated,service_role;
create table public.schedule_interval_serials(company_id uuid not null,staff_id uuid not null,version bigint not null default 0,primary key(company_id,staff_id));
alter table public.schedule_interval_serials enable row level security;
revoke all on table public.schedule_interval_serials from public,anon,authenticated,service_role;

create table public.schedule_interval_guard_jobs(
 transaction_id bigint not null,company_id uuid not null,staff_id uuid not null,
 primary key(transaction_id,company_id,staff_id)
);
alter table public.schedule_interval_guard_jobs enable row level security;
revoke all on table public.schedule_interval_guard_jobs from public,anon,authenticated,service_role;
create function public.queue_schedule_assignment_interval_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if tg_op<>'INSERT' then insert into public.schedule_interval_guard_jobs values(txid_current(),old.company_id,old.staff_id) on conflict do nothing; end if;
 if tg_op<>'DELETE' then insert into public.schedule_interval_guard_jobs values(txid_current(),new.company_id,new.staff_id) on conflict do nothing; end if;
 return coalesce(new,old);
end $$;
revoke all on function public.queue_schedule_assignment_interval_guard() from public,anon,authenticated,service_role;
create trigger schedule_assignment_interval_01_queue after insert or update or delete
 on public.shift_assignment_revisions for each row execute function public.queue_schedule_assignment_interval_guard();

create function public.validate_schedule_assignment_intervals_deferred()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare job record;
begin
 -- Physical serialization writes force stale-snapshot competitors to abort.
 for job in select company_id,staff_id from public.schedule_interval_guard_jobs where transaction_id=txid_current() order by company_id,staff_id loop
  insert into public.schedule_interval_serials values(job.company_id,job.staff_id,1)
   on conflict(company_id,staff_id) do update set version=public.schedule_interval_serials.version+1;
  delete from public.schedule_assignment_interval_guards where company_id=job.company_id and staff_id=job.staff_id;
  if exists(select 1 from public.shift_assignment_revisions a join public.schedule_template_sources src on src.assignment_id=a.id where a.company_id=job.company_id and a.staff_id=job.staff_id and a.is_current and a.assignment_kind='shift') then
   insert into public.schedule_assignment_interval_guards(assignment_id,company_id,staff_id,work_span,protected)
    select a.id,a.company_id,a.staff_id,public.schedule_assignment_work_span(a),exists(select 1 from public.schedule_template_sources src where src.assignment_id=a.id)
    from public.shift_assignment_revisions a where a.company_id=job.company_id and a.staff_id=job.staff_id and a.is_current and a.assignment_kind='shift';
   if exists(select 1 from public.schedule_assignment_interval_guards a join public.schedule_assignment_interval_guards b on a.company_id=b.company_id and a.staff_id=b.staff_id and a.assignment_id<b.assignment_id and a.work_span&&b.work_span where a.company_id=job.company_id and a.staff_id=job.staff_id and(a.protected or b.protected)) then
    raise exception using errcode='23P01',message='Schedule interval conflict. Reload and review the selected employee days.';
   end if;
  end if;
 end loop;
 delete from public.schedule_interval_guard_jobs where transaction_id=txid_current();
 return null;
end $$;
revoke all on function public.validate_schedule_assignment_intervals_deferred() from public,anon,authenticated,service_role;
create constraint trigger schedule_assignment_interval_02_guard after insert or update or delete
 on public.shift_assignment_revisions deferrable initially deferred for each row
 execute function public.validate_schedule_assignment_intervals_deferred();

-- Marker changes must validate even when the caller set constraints IMMEDIATE.
create function public.queue_schedule_template_source_guard()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare a record;
begin
 select company_id,staff_id into a from public.shift_assignment_revisions where id=coalesce(new.assignment_id,old.assignment_id);
 if found then insert into public.schedule_interval_guard_jobs values(txid_current(),a.company_id,a.staff_id) on conflict do nothing; end if;
 return coalesce(new,old);
end $$;
revoke all on function public.queue_schedule_template_source_guard() from public,anon,authenticated,service_role;
create trigger schedule_template_source_01_queue after insert or delete on public.schedule_template_sources
 for each row execute function public.queue_schedule_template_source_guard();
create constraint trigger schedule_template_source_02_guard after insert or delete on public.schedule_template_sources
 deferrable initially deferred for each row execute function public.validate_schedule_assignment_intervals_deferred();

create function public.get_schedule_template_eligibility(p_week_start date,p_branch_ids uuid[])
returns table(staff_id uuid,branch_id uuid,eligible_dates date[])
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id();
begin
 if company is null or public.current_staff_id() is null or not public.has_permission('schedule.draft')
  or p_week_start is null or extract(isodow from p_week_start)<>1 or p_branch_ids is null or cardinality(p_branch_ids)>1000 then
  raise exception using errcode='42501',message='Template catalogue is not authorised.';
 end if;
 if exists(select 1 from unnest(p_branch_ids) b(id) where b.id is null or not exists(select 1 from public.branches owned where owned.id=b.id and owned.company_id=company and owned.status='active' and owned.deleted_at is null) or not public.can_access_company_branch(company,b.id)) then
  raise exception using errcode='42501',message='Template location is not authorised.';
 end if;
 -- Same explicit mapped employee scope as the existing authorised roster RPC;
 -- return date flags only, not hidden role rows or a broader staff directory.
 return query select person.id,b.id,
  coalesce(array_agg((p_week_start+d.day)::date order by d.day) filter(where public.is_staff_schedule_eligible(person.id,p_week_start+d.day)),array[]::date[])
 from (select distinct unnest(p_branch_ids) id) b
 cross join lateral public.get_schedule_staff(b.id,null) person
 cross join generate_series(0,6) d(day) group by person.id,b.id;
end $$;
revoke all on function public.get_schedule_template_eligibility(date,uuid[]) from public,anon,service_role;
grant execute on function public.get_schedule_template_eligibility(date,uuid[]) to authenticated;

create function public.import_schedule_template_drafts_atomic(
 p_week_start date,p_file_name text,p_file_hash text,p_outlets jsonb,
 p_unresolved_count integer,p_source_metadata jsonb,p_request_key text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
 outlet jsonb; item jsonb; branch uuid; person uuid; work_day date; kind text;
 starts time; ends time; crosses boolean; duration numeric; outcome jsonb;
begin
 if actor is null or company is null or not public.has_permission('schedule.draft') then raise exception using errcode='42501',message='Schedule draft is not authorised.'; end if;
 if p_week_start is null or extract(isodow from p_week_start)<>1 or p_file_name is null or length(trim(p_file_name)) not between 1 and 255
  or p_file_hash is null or p_file_hash !~ '^[0-9a-f]{64}$' or p_request_key is null or p_request_key !~ '^[0-9a-f]{64}$'
  or p_unresolved_count is distinct from 0 or jsonb_typeof(p_outlets) is distinct from 'array' or jsonb_array_length(p_outlets) not between 1 and 50
  or p_source_metadata->>'source' is distinct from 'oms_schedule_template_v1' or p_source_metadata->>'parserVersion' is distinct from '1'
  or p_source_metadata->'expectedAssignments' is distinct from '[]'::jsonb then raise exception 'Invalid template request.'; end if;
 -- Same lock order as the existing reconciliation writer. The private serialization
 -- invariant additionally covers concurrent legacy writes and adjacent weeks.
 lock table public.shift_assignment_revisions in share row exclusive mode;
 perform pg_advisory_xact_lock(hashtextextended('schedule-import:'||company::text||':'||p_week_start::text,0));
 perform 1 from public.staffs where id=actor and company_id=company and status='active' and deleted_at is null for share;
 if not found or not public.has_permission('schedule.draft') then raise exception using errcode='42501',message='Schedule draft is not authorised.'; end if;
 if (select count(*) from jsonb_array_elements(p_outlets))<>(select count(distinct value->>'branch_id') from jsonb_array_elements(p_outlets))
  or exists(select 1 from jsonb_array_elements(p_outlets) o where jsonb_typeof(o->'assignments') is distinct from 'array' or jsonb_array_length(o->'assignments') not between 1 and 1000)
  or (select count(*) from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') a)>1000
  or exists(select 1 from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') a group by a->>'staff_id',a->>'work_date' having count(*)>1) then raise exception 'Choose one assignment per employee day.'; end if;
 for outlet in select value from jsonb_array_elements(p_outlets) loop
  branch:=(outlet->>'branch_id')::uuid;
  perform 1 from public.branches b where b.id=branch and b.company_id=company and b.status='active' and b.deleted_at is null and b.branch_type in ('outlet','central_kitchen') for share;
  if not found or not public.can_access_company_branch(company,branch) then raise exception using errcode='42501',message='Template location is not authorised.'; end if;
  for item in select value from jsonb_array_elements(outlet->'assignments') loop
   person:=(item->>'staff_id')::uuid; work_day:=(item->>'work_date')::date; kind:=item->>'assignment_kind';
   if jsonb_typeof(item)<>'object' or work_day is null or work_day not between p_week_start and p_week_start+6 or kind is null or kind not in ('shift','off','ph','al','mc','upl','oil','el')
    or nullif(item->>'shift_template_id','') is not null or exists(select 1 from jsonb_object_keys(item) k where k not in ('staff_id','work_date','assignment_kind','shift_template_id','custom_start','custom_end','custom_crosses_midnight','custom_break_seconds','custom_maximum_recognised_seconds','custom_reason')) then raise exception 'Invalid template employee day.'; end if;
   perform 1 from public.staffs s where s.id=person and s.company_id=company and s.status in ('active','invited') and s.deleted_at is null for share;
   if not found or not public.is_staff_schedule_eligible(person,work_day) then raise exception using errcode='42501',message='Template employee is not eligible.'; end if;
   perform 1 from public.staff_roles sr where sr.staff_id=person and sr.is_primary and sr.effective_from<=work_day and (sr.effective_to is null or sr.effective_to>=work_day) for share;
   perform 1 from public.staff_branches sb where sb.staff_id=person and sb.branch_id=branch for share;
   if not found then raise exception using errcode='42501',message='Template employee location mapping is not authorised.'; end if;
   if not public.is_staff_schedule_eligible(person,work_day) then raise exception using errcode='42501',message='Template employee is not eligible.'; end if;
   if kind='el' and (public.schedule_leave_capabilities()->>'revision' is distinct from '1' or public.schedule_leave_capabilities()->>'paid_emergency_leave' is distinct from 'true') then raise exception 'Emergency Leave is not active.'; end if;
   if kind='shift' then
    starts:=(item->>'custom_start')::time; ends:=(item->>'custom_end')::time; crosses:=(item->>'custom_crosses_midnight')::boolean;
    if starts is null or ends is null or crosses is null or extract(minute from starts)::integer%30<>0 or extract(second from starts)<>0 or extract(minute from ends)::integer%30<>0 or extract(second from ends)<>0
     or coalesce((item->>'custom_break_seconds')::integer,-1)<0 or (item->>'custom_break_seconds')::integer%60<>0
     or coalesce((item->>'custom_maximum_recognised_seconds')::integer,0) not between 60 and 86400 or (item->>'custom_maximum_recognised_seconds')::integer%60<>0
     or coalesce(length(trim(item->>'custom_reason')),0) not between 1 and 500 then raise exception 'Invalid template shift inputs.'; end if;
    duration:=extract(epoch from(ends-starts))+case when crosses then 86400 else 0 end;
    if duration<=0 or duration>86400 or (item->>'custom_break_seconds')::integer>=duration then raise exception 'Invalid template shift duration or break.'; end if;
   elsif exists(select 1 from jsonb_each(item) e where e.key in ('custom_start','custom_end','custom_crosses_midnight','custom_break_seconds','custom_maximum_recognised_seconds','custom_reason') and e.value<>'null'::jsonb) then raise exception 'Non-shift template day has working inputs.';
   end if;
  end loop;
 end loop;
 -- Even an identical retry revalidates all current access/membership above.
 -- Existing receipt binds the selection. Sanitised metadata prevents replacing
 -- prior assignments, reusing rules, changing fingerprint policies or notes.
 outcome:=public.reconcile_schedule_workbook_drafts(p_week_start,p_file_name,p_file_hash,p_outlets,0,
  jsonb_build_object('source','oms_schedule_template_v1','parserVersion',1,'expectedAssignments','[]'::jsonb),p_request_key);
 if not coalesce((outcome->>'idempotent')::boolean,false) then
  insert into public.schedule_template_sources(assignment_id)
  select a.id from public.shift_assignment_revisions a where a.company_id=company and a.is_current and a.assignment_kind='shift'
   and exists(select 1 from jsonb_array_elements(p_outlets) o cross join lateral jsonb_array_elements(o->'assignments') x where a.branch_id=(o->>'branch_id')::uuid and a.staff_id=(x->>'staff_id')::uuid and a.work_date=(x->>'work_date')::date)
  on conflict do nothing;
 end if;
 return outcome;
end $$;
revoke all on function public.import_schedule_template_drafts_atomic(date,text,text,jsonb,integer,jsonb,text) from public,anon,service_role;
grant execute on function public.import_schedule_template_drafts_atomic(date,text,text,jsonb,integer,jsonb,text) to authenticated;

create function public.schedule_template_import_capabilities() returns jsonb
language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object('version',1,'atomic_interval_conflicts',
  public.current_staff_id() is not null and public.has_permission('schedule.draft')
  and exists(select 1 from pg_trigger where tgrelid='public.shift_assignment_revisions'::regclass and tgname='schedule_assignment_interval_02_guard' and tgenabled in ('O','A'))
  and to_regprocedure('public.get_schedule_template_eligibility(date,uuid[])') is not null
  and exists(select 1 from pg_trigger where tgrelid='public.shift_assignment_revisions'::regclass and tgname='schedule_assignment_interval_01_queue' and tgenabled in ('O','A'))
  and to_regclass('public.schedule_template_sources') is not null and to_regclass('public.schedule_interval_serials') is not null,
 'explicit_membership',public.current_staff_id() is not null and public.has_permission('schedule.draft'))
$$;
revoke all on function public.schedule_template_import_capabilities() from public,anon,service_role;
grant execute on function public.schedule_template_import_capabilities() to authenticated;
notify pgrst,'reload schema';
commit;
