-- Dynamic Scheduling: branch-scoped rosters, approvals, immutable revisions, and staff requests.
insert into public.permissions(permission_code,module,action,description) values
 ('schedule.read','attendance','read','View authorised schedules'),
 ('schedule.draft','attendance','create','Prepare branch roster drafts'),
 ('schedule.submit','attendance','submit','Submit branch rosters'),
 ('schedule.approve','attendance','approve','Approve or return rosters'),
 ('schedule.request','attendance','request','Request a shift change'),
 ('schedule.swap_review','attendance','review','Review pure outlet swaps'),
 ('schedule.lock','attendance','lock','Lock completed schedule periods'),
 ('schedule.unlock','attendance','unlock','Owner unlock with reason'),
 ('shift_template.manage','attendance','manage','Maintain shift templates'),
 ('shift_template.non_standard','attendance','manage','Authorise non-30-minute shift times')
on conflict(permission_code) do update set module=excluded.module,action=excluded.action,description=excluded.description;

insert into public.roles(company_id,role_code,role_name,description,status)
select id,'outlet_supervisor','Outlet Supervisor','Outlet staff capabilities plus assigned-outlet roster preparation and swap review.','active'
from public.companies on conflict(company_id,role_code) do update set role_name=excluded.role_name,description=excluded.description,status='active',deleted_at=null;

-- Supervisor is a strict superset of Outlet Staff, never Manager.
insert into public.role_permissions(role_id,permission_id)
select supervisor.id,rp.permission_id from public.roles supervisor
join public.roles outlet on outlet.company_id=supervisor.company_id and outlet.role_code='outlet_staff'
join public.role_permissions rp on rp.role_id=outlet.id
where supervisor.role_code='outlet_supervisor' on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.permission_code in
 ('schedule.read','schedule.draft','schedule.submit','schedule.request','schedule.swap_review')
where r.role_code='outlet_supervisor' on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on
 (r.role_code='super_admin') or
 (r.role_code='manager' and p.permission_code in ('schedule.read','schedule.approve')) or
 (r.role_code='people_operations' and p.permission_code in ('schedule.read','shift_template.manage')) or
 (r.role_code='outlet_staff' and p.permission_code in ('schedule.read','schedule.request'))
where p.permission_code like 'schedule.%' or p.permission_code like 'shift_template.%'
on conflict do nothing;

alter table public.staffs add column if not exists employment_type text not null default 'full_time'
  check(employment_type in ('full_time','part_time'));
alter table public.staffs add column if not exists daily_recognised_cap_seconds integer
  check(daily_recognised_cap_seconds is null or daily_recognised_cap_seconds > 0);

create table public.shift_templates(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), code text not null,
 name text not null, check_in_start time not null, planned_start time not null, planned_end time not null, check_out_end time not null, crosses_midnight boolean not null default false,
 planned_break_seconds integer not null default 0 check(planned_break_seconds>=0), maximum_recognised_seconds integer not null check(maximum_recognised_seconds>0),
 employment_types text[] not null default '{}', branch_ids uuid[] not null default '{}', is_active boolean not null default true,
 colour text not null default '#247a4a', ot_eligible boolean not null default false, grace_seconds integer not null default 0 check(grace_seconds>=0),
 match_before_seconds integer not null default 14400, match_after_seconds integer not null default 14400, overtime_rule jsonb not null default '{"mode":"approved_only","threshold_seconds":0,"maximum_seconds":0,"rounding_minutes":1}',
 created_by uuid not null references public.staffs(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,code)
);
create table public.schedule_weeks(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), branch_id uuid not null references public.branches(id),
 week_start date not null check(extract(isodow from week_start)=1), status text not null default 'draft' check(status in ('draft','submitted','published','returned','rejected','amendment_pending','locked')),
 revision integer not null default 1, created_by uuid not null references public.staffs(id), submitted_by uuid references public.staffs(id), submitted_at timestamptz,
 published_by uuid references public.staffs(id), published_at timestamptz, locked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,branch_id,week_start,revision)
);
create table public.shift_assignment_revisions(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), schedule_week_id uuid not null references public.schedule_weeks(id),
 staff_id uuid not null references public.staffs(id), branch_id uuid not null references public.branches(id), work_date date not null,
 assignment_kind text not null check(assignment_kind in ('shift','off','al','mc','upl','ro')),
 shift_template_id uuid references public.shift_templates(id), custom_start time, custom_end time, custom_crosses_midnight boolean not null default false,
 custom_break_seconds integer, custom_maximum_recognised_seconds integer, custom_reason text, revision integer not null default 1,
 template_snapshot jsonb not null default '{}', supersedes_id uuid references public.shift_assignment_revisions(id), is_current boolean not null default true,
 created_by uuid not null references public.staffs(id), created_at timestamptz not null default now(),
 check((assignment_kind='shift' and (shift_template_id is not null or (custom_start is not null and custom_end is not null and length(trim(custom_reason))>0))) or (assignment_kind<>'shift' and shift_template_id is null and custom_start is null and custom_end is null)),
 unique(schedule_week_id,staff_id,work_date,revision)
);
create unique index schedule_assignment_one_current on public.shift_assignment_revisions(schedule_week_id,staff_id,work_date) where is_current;
create table public.schedule_approval_events(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), schedule_week_id uuid not null references public.schedule_weeks(id),
 event_type text not null, from_status text, to_status text not null, actor_staff_id uuid not null references public.staffs(id), comment text,
 before_state jsonb not null default '{}', after_state jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.shift_change_requests(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), assignment_id uuid not null references public.shift_assignment_revisions(id),
 requester_staff_id uuid not null references public.staffs(id), proposed_staff_id uuid references public.staffs(id), proposed_template_id uuid references public.shift_templates(id),
 proposed_start time, proposed_end time, reason text not null check(length(trim(reason))>0), note text,
 status text not null default 'pending_supervisor' check(status in ('pending_supervisor','pending_manager','approved','rejected','cancelled')),
 material_change boolean not null default true, reviewed_by uuid references public.staffs(id), review_comment text, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.shift_templates enable row level security; alter table public.schedule_weeks enable row level security;
alter table public.shift_assignment_revisions enable row level security; alter table public.schedule_approval_events enable row level security;
alter table public.shift_change_requests enable row level security;

create policy "shift templates authorised read" on public.shift_templates for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('schedule.read'));
create policy "shift templates authorised manage" on public.shift_templates for all to authenticated
using(company_id=public.current_staff_company_id() and public.has_permission('shift_template.manage'))
with check(company_id=public.current_staff_company_id() and public.has_permission('shift_template.manage') and created_by=public.current_staff_id()
 and not exists(select 1 from unnest(branch_ids) requested_id left join public.branches b on b.id=requested_id and b.company_id=public.current_staff_company_id() where b.id is null));
create policy "schedule weeks scoped read" on public.schedule_weeks for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('schedule.read') and public.can_access_company_branch(company_id,branch_id) and (status in ('published','locked') or public.has_any_permission(array['schedule.draft','schedule.submit','schedule.approve','schedule.swap_review']) or public.has_permission('shift_template.manage')));
create policy "assignments scoped read" on public.shift_assignment_revisions for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('schedule.read') and ((staff_id=public.current_staff_id() and exists(select 1 from public.schedule_weeks own_week where own_week.id=schedule_week_id and own_week.status in ('published','locked'))) or (public.has_any_permission(array['schedule.draft','schedule.submit','schedule.approve','schedule.swap_review']) and public.can_access_company_branch(company_id,branch_id)) or public.has_permission('shift_template.manage')));
create policy "approval events scoped read" on public.schedule_approval_events for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.schedule_weeks w where w.id=schedule_week_id and public.can_access_company_branch(w.company_id,w.branch_id)));
create policy "requests self or scoped read" on public.shift_change_requests for select to authenticated using(company_id=public.current_staff_company_id() and (requester_staff_id=public.current_staff_id() or exists(select 1 from public.shift_assignment_revisions a where a.id=assignment_id and public.can_access_company_branch(a.company_id,a.branch_id))));

create or replace function public.submit_schedule_week(p_week_id uuid,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare w public.schedule_weeks; actor uuid:=public.current_staff_id(); prior_status text; begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 if w.id is null or not public.has_permission('schedule.submit') or not public.can_access_company_branch(w.company_id,w.branch_id) then raise exception 'Schedule submission is not authorised.'; end if;
 if w.status not in ('draft','returned','rejected','amendment_pending') then raise exception 'Only an editable roster may be submitted.'; end if;
 if not exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current) then raise exception 'A roster cannot be submitted without assignments.'; end if;
 if exists(select 1 from public.shift_assignment_revisions a join public.staffs s on s.id=a.staff_id where a.schedule_week_id=w.id and a.is_current and (s.status<>'active' or s.deleted_at is not null)) then raise exception 'Inactive staff cannot be scheduled.'; end if;
 if exists(select 1 from public.shift_assignment_revisions a where a.schedule_week_id=w.id and a.is_current group by a.staff_id having count(*) filter(where a.assignment_kind in ('off','al','mc','upl','ro'))=0) then raise exception 'Every scheduled employee requires at least one weekly OFF or leave day.'; end if;
 if exists(select 1 from public.shift_assignment_revisions a join public.shift_assignment_revisions other on other.company_id=a.company_id and other.staff_id=a.staff_id and other.work_date=a.work_date and other.is_current and other.schedule_week_id<>a.schedule_week_id where a.schedule_week_id=w.id and a.is_current and a.assignment_kind='shift' and other.assignment_kind='shift' and other.branch_id<>a.branch_id) then raise exception 'Cross-branch schedule collision detected.'; end if;
 prior_status:=w.status; update public.schedule_weeks set status='submitted',submitted_by=actor,submitted_at=now(),updated_at=now() where id=w.id returning * into w;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment) values(w.company_id,w.id,'submit',prior_status,'submitted',actor,p_comment);
 return w; end $$;
create or replace function public.decide_schedule_week(p_week_id uuid,p_decision text,p_comment text default null) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$ declare w public.schedule_weeks; actor uuid:=public.current_staff_id(); target text; begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 if w.id is null or not public.has_permission('schedule.approve') or not public.can_access_company_branch(w.company_id,w.branch_id) then raise exception 'Schedule decision is not authorised.'; end if;
 if w.submitted_by=actor then raise exception 'A roster submitter cannot approve their own roster.'; end if;
 if w.status<>'submitted' then raise exception 'Only a submitted roster may be decided.'; end if;
 target:=case p_decision when 'approve' then 'published' when 'return' then 'returned' when 'reject' then 'rejected' else null end;
 if target is null or (target<>'published' and coalesce(length(trim(p_comment)),0)=0) then raise exception 'A valid decision and comment are required.'; end if;
 update public.schedule_weeks set status=target,published_by=case when target='published' then actor else published_by end,published_at=case when target='published' then now() else published_at end,updated_at=now() where id=w.id returning * into w;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment) values(w.company_id,w.id,p_decision,'submitted',target,actor,p_comment);
 return w; end $$;

create or replace function public.save_schedule_week(
  p_branch_id uuid,
  p_week_start date,
  p_assignments jsonb
) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare
  company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id();
  w public.schedule_weeks; item jsonb; previous public.shift_assignment_revisions; next_revision integer;
  target_staff uuid; target_date date; target_kind text; template_id uuid;
begin
  if not public.has_permission('schedule.draft') or not public.can_access_company_branch(company,p_branch_id) then raise exception 'Schedule draft is not authorised.'; end if;
  if extract(isodow from p_week_start)<>1 or jsonb_typeof(p_assignments)<>'array' or jsonb_array_length(p_assignments)>1000 then raise exception 'Invalid schedule week payload.'; end if;
  select * into w from public.schedule_weeks where company_id=company and branch_id=p_branch_id and week_start=p_week_start and revision=1 for update;
  if w.id is null then
    insert into public.schedule_weeks(company_id,branch_id,week_start,created_by) values(company,p_branch_id,p_week_start,actor) returning * into w;
  elsif w.status not in ('draft','returned','rejected','amendment_pending') or w.locked_at is not null then raise exception 'This schedule week is not editable.';
  end if;
  for item in select value from jsonb_array_elements(p_assignments) loop
    target_staff:=(item->>'staff_id')::uuid; target_date:=(item->>'work_date')::date; target_kind:=lower(item->>'assignment_kind');
    template_id:=nullif(item->>'shift_template_id','')::uuid;
    if target_date not between p_week_start and p_week_start+6 or target_kind not in ('shift','off','al','mc','upl','ro') then raise exception 'Invalid assignment row.'; end if;
    if not exists(select 1 from public.staffs s join public.staff_branches sb on sb.staff_id=s.id where s.id=target_staff and s.company_id=company and s.status='active' and s.deleted_at is null and sb.branch_id=p_branch_id) then raise exception 'Staff is not active in the selected outlet.'; end if;
    if template_id is not null and not exists(select 1 from public.shift_templates t where t.id=template_id and t.company_id=company and t.is_active and (cardinality(t.branch_ids)=0 or p_branch_id=any(t.branch_ids))) then raise exception 'Shift template is not valid for this outlet.'; end if;
    if target_kind='shift' and template_id is null and (not public.has_permission('shift_template.manage') or nullif(trim(item->>'custom_reason'),'') is null) then raise exception 'A custom shift requires authority and a reason.'; end if;
    select * into previous from public.shift_assignment_revisions where schedule_week_id=w.id and staff_id=target_staff and work_date=target_date and is_current for update;
    next_revision:=coalesce(previous.revision,0)+1;
    if previous.id is not null then update public.shift_assignment_revisions set is_current=false where id=previous.id; end if;
    insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by)
    values(company,w.id,target_staff,p_branch_id,target_date,target_kind,template_id,nullif(item->>'custom_start','')::time,nullif(item->>'custom_end','')::time,coalesce((item->>'custom_crosses_midnight')::boolean,false),nullif(item->>'custom_break_seconds','')::integer,nullif(item->>'custom_maximum_recognised_seconds','')::integer,nullif(trim(item->>'custom_reason'),''),next_revision,coalesce((select to_jsonb(t) from public.shift_templates t where t.id=template_id),jsonb_build_object('planned_start',item->>'custom_start','planned_end',item->>'custom_end','crosses_midnight',coalesce((item->>'custom_crosses_midnight')::boolean,false),'planned_break_seconds',nullif(item->>'custom_break_seconds','')::integer,'maximum_recognised_seconds',nullif(item->>'custom_maximum_recognised_seconds','')::integer)),previous.id,actor);
  end loop;
  update public.schedule_weeks set updated_at=now() where id=w.id returning * into w;
  return w;
end $$;

create or replace function public.copy_schedule_week(p_source_week_id uuid,p_target_week_start date) returns public.schedule_weeks
language plpgsql security definer set search_path=public as $$
declare source public.schedule_weeks; result public.schedule_weeks; payload jsonb;
begin
  select * into source from public.schedule_weeks where id=p_source_week_id and company_id=public.current_staff_company_id();
  if source.id is null or not public.can_access_company_branch(source.company_id,source.branch_id) or extract(isodow from p_target_week_start)<>1 then raise exception 'Schedule copy is not authorised.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('staff_id',a.staff_id,'work_date',p_target_week_start+(a.work_date-source.week_start),'assignment_kind',a.assignment_kind,'shift_template_id',a.shift_template_id,'custom_start',a.custom_start,'custom_end',a.custom_end,'custom_crosses_midnight',a.custom_crosses_midnight,'custom_break_seconds',a.custom_break_seconds,'custom_maximum_recognised_seconds',a.custom_maximum_recognised_seconds,'custom_reason',coalesce(a.custom_reason,'Copied from prior week'))),'[]'::jsonb) into payload from public.shift_assignment_revisions a where a.schedule_week_id=source.id and a.is_current;
  select public.save_schedule_week(source.branch_id,p_target_week_start,payload) into result; return result;
end $$;

create or replace function public.create_shift_change_request(p_assignment_id uuid,p_proposed_staff_id uuid,p_proposed_template_id uuid,p_proposed_start time,p_proposed_end time,p_reason text) returns public.shift_change_requests
language plpgsql security definer set search_path=public as $$
declare a public.shift_assignment_revisions; result public.shift_change_requests;
begin
  select * into a from public.shift_assignment_revisions where id=p_assignment_id and company_id=public.current_staff_company_id() and is_current;
  if a.id is null or not public.has_permission('schedule.request') or a.staff_id<>public.current_staff_id() or nullif(trim(p_reason),'') is null then raise exception 'Shift request is not authorised.'; end if;
  insert into public.shift_change_requests(company_id,assignment_id,requester_staff_id,proposed_staff_id,proposed_template_id,proposed_start,proposed_end,reason)
  values(a.company_id,a.id,public.current_staff_id(),p_proposed_staff_id,p_proposed_template_id,p_proposed_start,p_proposed_end,trim(p_reason)) returning * into result; return result;
end $$;

create or replace function public.review_shift_change_request(p_request_id uuid,p_decision text,p_comment text default null) returns public.shift_change_requests
language plpgsql security definer set search_path=public as $$
declare request public.shift_change_requests; source public.shift_assignment_revisions; target public.shift_assignment_revisions; source_template public.shift_templates; target_template public.shift_templates; actor uuid:=public.current_staff_id(); pure boolean:=false; next_source integer; next_target integer;
begin
 select * into request from public.shift_change_requests where id=p_request_id and company_id=public.current_staff_company_id() for update;
 if request.id is null or request.status not in ('pending_supervisor','pending_manager') or p_decision not in ('approve','reject') then raise exception 'Pending shift request not found.'; end if;
 select * into source from public.shift_assignment_revisions where id=request.assignment_id and is_current for update;
 if source.id is null or not public.can_access_company_branch(source.company_id,source.branch_id) then raise exception 'Shift request is outside your scope.'; end if;
 if request.proposed_staff_id is not null then select * into target from public.shift_assignment_revisions where schedule_week_id=source.schedule_week_id and staff_id=request.proposed_staff_id and work_date=source.work_date and is_current for update; end if;
 if target.id is not null and source.assignment_kind='shift' and target.assignment_kind='shift' then
   select * into source_template from public.shift_templates where id=source.shift_template_id; select * into target_template from public.shift_templates where id=target.shift_template_id;
   pure:=source.branch_id=target.branch_id and source_template.maximum_recognised_seconds=target_template.maximum_recognised_seconds and source_template.planned_break_seconds=target_template.planned_break_seconds and source_template.ot_eligible=target_template.ot_eligible and extract(epoch from ((case when source_template.crosses_midnight then interval '1 day' else interval '0' end)+source_template.planned_end-source_template.planned_start))=extract(epoch from ((case when target_template.crosses_midnight then interval '1 day' else interval '0' end)+target_template.planned_end-target_template.planned_start));
 end if;
 if request.status='pending_supervisor' and not pure then update public.shift_change_requests set status='pending_manager',material_change=true,reviewed_by=actor,review_comment='Automatically escalated: material schedule change.',reviewed_at=now(),updated_at=now() where id=request.id returning * into request; return request; end if;
 if request.status='pending_supervisor' and not public.has_permission('schedule.swap_review') then raise exception 'Supervisor swap-review permission is required.'; end if;
 if request.status='pending_manager' and not public.has_permission('schedule.approve') then raise exception 'Manager schedule approval is required.'; end if;
 if p_decision='reject' then if nullif(trim(p_comment),'') is null then raise exception 'A rejection reason is required.'; end if; update public.shift_change_requests set status='rejected',reviewed_by=actor,review_comment=trim(p_comment),reviewed_at=now(),updated_at=now() where id=request.id returning * into request; return request; end if;
 if target.id is null then raise exception 'An available same-day swap target is required.'; end if;
 next_source:=source.revision+1; next_target:=target.revision+1; update public.shift_assignment_revisions set is_current=false where id in(source.id,target.id);
 insert into public.shift_assignment_revisions(company_id,schedule_week_id,staff_id,branch_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,revision,template_snapshot,supersedes_id,created_by)
 values(source.company_id,source.schedule_week_id,source.staff_id,source.branch_id,source.work_date,target.assignment_kind,target.shift_template_id,target.custom_start,target.custom_end,target.custom_crosses_midnight,target.custom_break_seconds,target.custom_maximum_recognised_seconds,'Approved swap',next_source,target.template_snapshot,source.id,actor),
 (target.company_id,target.schedule_week_id,target.staff_id,target.branch_id,target.work_date,source.assignment_kind,source.shift_template_id,source.custom_start,source.custom_end,source.custom_crosses_midnight,source.custom_break_seconds,source.custom_maximum_recognised_seconds,'Approved swap',next_target,source.template_snapshot,target.id,actor);
 update public.shift_change_requests set status='approved',material_change=not pure,reviewed_by=actor,review_comment=nullif(trim(p_comment),''),reviewed_at=now(),updated_at=now() where id=request.id returning * into request; return request;
end $$;

create or replace function public.lock_schedule_week(p_week_id uuid) returns public.schedule_weeks language plpgsql security definer set search_path=public as $$ declare w public.schedule_weeks; begin
 select * into w from public.schedule_weeks where id=p_week_id and company_id=public.current_staff_company_id() for update;
 if w.id is null or not public.has_permission('schedule.lock') or w.status<>'published' or not public.can_access_company_branch(w.company_id,w.branch_id) then raise exception 'Schedule lock is not authorised.'; end if;
 update public.schedule_weeks set status='locked',locked_at=now(),updated_at=now() where id=w.id returning * into w;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id) values(w.company_id,w.id,'lock','published','locked',public.current_staff_id()); return w; end $$;

create or replace function public.unlock_schedule_week(p_week_id uuid,p_reason text) returns public.schedule_weeks language plpgsql security definer set search_path=public as $$ declare w public.schedule_weeks; begin
 if not public.has_permission('schedule.unlock') or nullif(trim(p_reason),'') is null then raise exception 'Owner unlock permission and reason are required.'; end if;
 update public.schedule_weeks set status='amendment_pending',locked_at=null,updated_at=now() where id=p_week_id and company_id=public.current_staff_company_id() and status='locked' returning * into w;
 if w.id is null then raise exception 'Locked schedule week not found.'; end if;
 insert into public.schedule_approval_events(company_id,schedule_week_id,event_type,from_status,to_status,actor_staff_id,comment) values(w.company_id,w.id,'unlock','locked','amendment_pending',public.current_staff_id(),trim(p_reason)); return w; end $$;

create or replace function public.upsert_shift_template(p_id uuid,p_code text,p_name text,p_check_in_start time,p_start time,p_end time,p_check_out_end time,p_crosses_midnight boolean,p_break_seconds integer,p_cap_seconds integer,p_branch_ids uuid[],p_colour text,p_ot_eligible boolean,p_grace_seconds integer,p_match_before_seconds integer,p_match_after_seconds integer,p_overtime_rule jsonb,p_reason text default null) returns public.shift_templates language plpgsql security definer set search_path=public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); result public.shift_templates; non_standard boolean;
begin
 if not public.has_permission('shift_template.manage') or nullif(trim(p_code),'') is null or nullif(trim(p_name),'') is null then raise exception 'Template management is not authorised.'; end if;
 non_standard:=extract(minute from p_check_in_start)::integer%30<>0 or extract(second from p_check_in_start)<>0 or extract(minute from p_start)::integer%30<>0 or extract(second from p_start)<>0 or extract(minute from p_end)::integer%30<>0 or extract(second from p_end)<>0 or extract(minute from p_check_out_end)::integer%30<>0 or extract(second from p_check_out_end)<>0;
 if non_standard and (not public.has_permission('shift_template.non_standard') or nullif(trim(p_reason),'') is null) then raise exception 'Non-standard shift times require Owner authority and a reason.'; end if;
 if p_break_seconds<0 or p_cap_seconds<=0 or p_grace_seconds<0 or p_match_before_seconds<0 or p_match_after_seconds<0 or p_check_in_start>p_start or (not p_crosses_midnight and p_check_out_end<p_end) or coalesce(p_overtime_rule->>'mode','') not in ('disabled','approved_only') or coalesce((p_overtime_rule->>'threshold_seconds')::integer,-1)<0 or coalesce((p_overtime_rule->>'maximum_seconds')::integer,-1)<0 or coalesce((p_overtime_rule->>'rounding_minutes')::integer,0) not in (1,5,10,15,30) or exists(select 1 from unnest(coalesce(p_branch_ids,'{}')) branch_id left join public.branches b on b.id=branch_id and b.company_id=company where b.id is null) then raise exception 'Invalid shift template configuration.'; end if;
 insert into public.shift_templates(id,company_id,code,name,check_in_start,planned_start,planned_end,check_out_end,crosses_midnight,planned_break_seconds,maximum_recognised_seconds,branch_ids,colour,ot_eligible,grace_seconds,match_before_seconds,match_after_seconds,overtime_rule,created_by)
 values(coalesce(p_id,gen_random_uuid()),company,upper(trim(p_code)),trim(p_name),p_check_in_start,p_start,p_end,p_check_out_end,p_crosses_midnight,p_break_seconds,p_cap_seconds,coalesce(p_branch_ids,'{}'),p_colour,p_ot_eligible,p_grace_seconds,p_match_before_seconds,p_match_after_seconds,p_overtime_rule,actor)
 on conflict(id) do update set code=excluded.code,name=excluded.name,check_in_start=excluded.check_in_start,planned_start=excluded.planned_start,planned_end=excluded.planned_end,check_out_end=excluded.check_out_end,crosses_midnight=excluded.crosses_midnight,planned_break_seconds=excluded.planned_break_seconds,maximum_recognised_seconds=excluded.maximum_recognised_seconds,branch_ids=excluded.branch_ids,colour=excluded.colour,ot_eligible=excluded.ot_eligible,grace_seconds=excluded.grace_seconds,match_before_seconds=excluded.match_before_seconds,match_after_seconds=excluded.match_after_seconds,overtime_rule=excluded.overtime_rule,updated_at=now() where shift_templates.company_id=company returning * into result;
 insert into public.audit_logs(company_id,table_name,record_id,entity_type,entity_id,action,old_values,new_values,changed_by,created_by) values(company,'shift_templates',result.id,'shift_templates',result.id,case when p_id is null then 'create' else 'update' end,null,jsonb_build_object('code',result.code,'non_standard',non_standard,'reason',p_reason),actor,actor); return result;
end $$;
create or replace function public.get_schedule_staff(p_branch_id uuid) returns table(id uuid,full_name text,staff_code text,status public.record_status,employment_type text)
language sql security definer set search_path=public stable as $$
 select s.id,s.full_name,s.staff_code,s.status,s.employment_type from public.staffs s join public.staff_branches sb on sb.staff_id=s.id where sb.branch_id=p_branch_id and s.company_id=public.current_staff_company_id() and s.deleted_at is null and public.can_access_company_branch(s.company_id,p_branch_id) and public.has_permission('schedule.read') and (s.id=public.current_staff_id() or public.has_any_permission(array['schedule.draft','schedule.submit','schedule.approve','schedule.swap_review'])) order by s.full_name,s.id
$$;
create or replace function public.get_schedule_branches() returns table(id uuid,branch_name text)
language sql security definer set search_path=public stable as $$
 select b.id,b.branch_name from public.branches b where b.company_id=public.current_staff_company_id() and b.branch_type='outlet' and b.status='active' and b.deleted_at is null and public.can_access_company_branch(b.company_id,b.id) and public.has_any_permission(array['schedule.read','schedule.draft','schedule.submit','schedule.approve','schedule.swap_review']) order by b.branch_name,b.id
$$;
grant select on public.shift_templates,public.schedule_weeks,public.shift_assignment_revisions,public.schedule_approval_events,public.shift_change_requests to authenticated;
revoke all on function public.submit_schedule_week(uuid,text),public.decide_schedule_week(uuid,text,text),public.save_schedule_week(uuid,date,jsonb),public.get_schedule_staff(uuid),public.get_schedule_branches(),public.copy_schedule_week(uuid,date),public.create_shift_change_request(uuid,uuid,uuid,time,time,text),public.review_shift_change_request(uuid,text,text),public.lock_schedule_week(uuid),public.unlock_schedule_week(uuid,text),public.upsert_shift_template(uuid,text,text,time,time,time,time,boolean,integer,integer,uuid[],text,boolean,integer,integer,integer,jsonb,text) from public,anon;
grant execute on function public.submit_schedule_week(uuid,text),public.decide_schedule_week(uuid,text,text),public.save_schedule_week(uuid,date,jsonb),public.get_schedule_staff(uuid),public.get_schedule_branches(),public.copy_schedule_week(uuid,date),public.create_shift_change_request(uuid,uuid,uuid,time,time,text),public.review_shift_change_request(uuid,text,text),public.lock_schedule_week(uuid),public.unlock_schedule_week(uuid,text),public.upsert_shift_template(uuid,text,text,time,time,time,time,boolean,integer,integer,uuid[],text,boolean,integer,integer,integer,jsonb,text) to authenticated;
notify pgrst,'reload schema';
