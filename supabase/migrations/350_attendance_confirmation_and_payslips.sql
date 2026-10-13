-- Local candidate only. New grants require separate production approval.
-- People prepares -> employee checks -> scoped supervisor verifies -> scoped
-- manager approves -> People calculates/approves/releases a payslip.
-- Existing salary/passport tables and grants retired by 316 stay retired.

create table public.attendance_confirmations (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 staff_id uuid not null references public.staffs(id), period_start date not null, period_end date not null,
 version integer not null, source_hash text not null, attendance jsonb not null,
 state text not null check(state in ('prepared','checked','verified','approved','disputed','superseded')),
 prepared_by uuid not null references public.staffs(id), prepared_at timestamptz not null default now(),
 check(period_end>=period_start and period_end-period_start<32),
 unique(company_id,staff_id,period_start,period_end,version)
);
create unique index attendance_confirmation_current on public.attendance_confirmations(company_id,staff_id,period_start,period_end)
 where state not in ('superseded','disputed');
create table public.attendance_confirmation_events (
 id uuid primary key default gen_random_uuid(), confirmation_id uuid not null references public.attendance_confirmations(id),
 actor_id uuid references public.staffs(id), action text not null,
 branch_id uuid references public.branches(id), source_hash text not null,
 reason text, recorded_at timestamptz not null default now()
);
create unique index attendance_confirmation_stage on public.attendance_confirmation_events(confirmation_id,action,branch_id)
 where action in ('verify','approve');
create table public.employee_payslips (
 id uuid primary key default gen_random_uuid(), confirmation_id uuid not null unique references public.attendance_confirmations(id),
 company_id uuid not null references public.companies(id), staff_id uuid not null references public.staffs(id),
 version integer not null default 1, calculation_hash text not null, currency text not null default 'MYR' check(currency='MYR'),
 earnings numeric(14,2) not null check(earnings>=0), deductions numeric(14,2) not null check(deductions>=0),
 detail jsonb not null, state text not null check(state in ('draft','approved','released','superseded')),
 calculated_by uuid not null references public.staffs(id), calculated_at timestamptz not null default now(),
 approved_by uuid references public.staffs(id), approved_at timestamptz,
 released_by uuid references public.staffs(id), released_at timestamptz
);
create table public.employee_payslip_events (
 id uuid primary key default gen_random_uuid(), payslip_id uuid not null references public.employee_payslips(id),
 actor_id uuid references public.staffs(id), action text not null, version integer not null,
 recorded_at timestamptz not null default now(), detail jsonb not null
);
alter table public.attendance_confirmations enable row level security;
alter table public.attendance_confirmation_events enable row level security;
alter table public.employee_payslips enable row level security;
alter table public.employee_payslip_events enable row level security;

insert into public.permissions(permission_code,module,action,description) values
 ('attendance.confirmation.prepare','attendance','confirmation_prepare','Prepare time-only employee confirmations'),
 ('payroll.payslip.manage','payroll','payslip_manage','Calculate, approve and release employee payslips') on conflict(permission_code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.role_code='people_operations' and r.status='active' and r.deleted_at is null
 and p.permission_code in ('attendance.confirmation.prepare','payroll.payslip.manage') on conflict do nothing;

create function public.attestation_role(p_role text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select public.current_staff_id() is not null and exists(
  select 1 from public.staff_roles sr join public.roles r on r.id=sr.role_id
  where sr.staff_id=public.current_staff_id() and r.company_id=public.current_staff_company_id()
   and r.role_code=p_role and r.status='active' and r.deleted_at is null
   and (sr.effective_from is null or sr.effective_from<=(now() at time zone 'Asia/Kuala_Lumpur')::date)
   and (sr.effective_to is null or sr.effective_to>=(now() at time zone 'Asia/Kuala_Lumpur')::date))
$$;
create function public.attestation_people(p_permission text) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select public.attestation_role('people_operations') and public.has_permission(p_permission)
$$;
create function public.attestation_lock(p_staff uuid) returns void
language sql volatile security definer set search_path=pg_catalog,public as $$
 select pg_advisory_xact_lock(hashtextextended('attendance-confirmation:'||p_staff::text,0))
$$;

-- No unrestricted calculation JSON, rates, PPH multipliers, employment salary,
-- passport, allowance, bank or monetary fields enter this projection.
create function public.attestation_source(p_staff uuid,p_start date,p_end date) returns jsonb
language sql volatile security definer set search_path=pg_catalog,public as $$
 with assignments as (
  select a.*, w.revision as week_revision from public.shift_assignment_revisions a
  join public.schedule_weeks w on w.id=a.schedule_week_id
  where a.staff_id=p_staff and a.is_current and w.status in ('published','locked')
   and a.work_date between p_start and p_end
 ), results as (
  select * from public.daily_attendance_results where staff_id=p_staff and is_current and work_date between p_start and p_end
 ) select coalesce(jsonb_agg(jsonb_build_object(
  'date',coalesce(r.work_date,a.work_date),'branch_id',coalesce(r.branch_id,a.branch_id),
  'result_id',r.id,'calculation_revision',r.calculation_revision,
  'source_revision',r.calculation->>'schedule_source_revision','source_hash',r.calculation->>'schedule_source_hash',
  'assignment_id',a.id,'schedule_revision',a.week_revision,
  'scheduled_start',coalesce(r.scheduled_start::text,a.custom_start::text,a.template_snapshot->>'planned_start'),
  'scheduled_end',coalesce(r.scheduled_end::text,a.custom_end::text,a.template_snapshot->>'planned_end'),
  'planned_start',coalesce(a.custom_start::text,a.template_snapshot->>'planned_start'),'planned_end',coalesce(a.custom_end::text,a.template_snapshot->>'planned_end'),
  'assignment_kind',a.assignment_kind,'first_in',r.actual_first_in,'last_out',r.actual_last_out,
  'break_out',r.actual_break_out,'break_in',r.actual_break_in,
  'worked_seconds',r.worked_seconds,'late_seconds',r.late_seconds,'early_leave_seconds',r.early_leave_seconds,
  'statuses',r.statuses,'punches',coalesce((select jsonb_agg(p order by ord) from jsonb_array_elements(case when jsonb_typeof(r.calculation->'punches')='array' then r.calculation->'punches' else '[]'::jsonb end) with ordinality x(p,ord) where jsonb_typeof(p)='string'),'[]'::jsonb)
 ) order by coalesce(r.work_date,a.work_date),coalesce(r.branch_id,a.branch_id)), '[]'::jsonb)
 from results r full join assignments a on a.staff_id=r.staff_id and a.work_date=r.work_date and a.branch_id=r.branch_id
$$;

-- Content acknowledgement excludes storage/recalculation lineage. Lineage stays
-- in the immutable snapshot for audit; payroll freshness has a separate digest.
create function public.attestation_content_hash(p_days jsonb) returns text
language sql immutable set search_path=pg_catalog,public as $$
 select encode(sha256(convert_to(coalesce(jsonb_agg(d-'result_id'-'calculation_revision'-'assignment_id'-'schedule_revision'-'source_revision'-'source_hash' order by d->>'date',d->>'branch_id'),'[]'::jsonb)::text,'UTF8')),'hex')
 from jsonb_array_elements(p_days) d
$$;
create function public.attestation_calculation_hash(p_staff uuid,p_start date,p_end date) returns text
language sql volatile security definer set search_path=pg_catalog,public as $$
 select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(r)-'review_status' order by r.work_date,r.id),'[]'::jsonb)::text,'UTF8')),'hex')
 from public.daily_attendance_results r where r.staff_id=p_staff and r.is_current and r.work_date between p_start and p_end
$$;
-- Fail closed until the separately owned schedule-refresh migration is present.
-- Lock queue rows before comparing its revision and the result's source stamps.
create function public.attestation_require_ready(p_staff uuid,p_start date,p_end date) returns void
language plpgsql volatile security definer set search_path=pg_catalog,public as $$
declare ready boolean;
begin
 if exists(select 1 from public.daily_attendance_results r where r.staff_id=p_staff and r.is_current and r.work_date between p_start and p_end and r.calculation ? 'punches' and r.calculation->'punches'<>'null'::jsonb and (jsonb_typeof(r.calculation->'punches')<>'array' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(r.calculation->'punches')='array' then r.calculation->'punches' else '[]'::jsonb end) p where jsonb_typeof(p)<>'string'))) then raise exception 'Invalid attendance punch shape' using errcode='40001'; end if;
 if to_regclass('public.attendance_schedule_refresh') is null then raise exception 'Attendance refresh integration is not installed'; end if;
 execute 'select 1 from public.attendance_schedule_refresh where staff_id=$1 and work_date between $2 and $3 for share' using p_staff,p_start,p_end;
 execute $query$select not exists(
  select 1 from public.daily_attendance_results r left join public.attendance_schedule_refresh q on q.staff_id=r.staff_id and q.company_id=r.company_id and q.work_date=r.work_date
  where r.staff_id=$1 and r.is_current and r.work_date between $2 and $3 and
   (q.status is distinct from 'ready' or q.calculated_revision is distinct from q.source_revision
    or r.calculation->>'schedule_source_revision' is distinct from q.source_revision::text
    or r.calculation->>'schedule_source_hash' is distinct from q.source_hash))
  and not exists(select 1 from public.attendance_schedule_refresh where staff_id=$1 and work_date between $2 and $3 and status<>'ready')$query$
 into ready using p_staff,p_start,p_end;
 if exists(select 1 from public.shift_assignment_revisions a join public.schedule_weeks w on w.id=a.schedule_week_id where a.staff_id=p_staff and a.work_date between p_start and p_end and a.is_current and a.assignment_kind='shift' and w.status in ('published','locked') and not exists(select 1 from public.daily_attendance_results r where r.staff_id=a.staff_id and r.work_date=a.work_date and r.branch_id=a.branch_id and r.is_current)) then ready:=false; end if;
 if not ready then raise exception 'Attendance calculation is not current' using errcode='40001'; end if;
end $$;

create policy confirmation_employee_people_read on public.attendance_confirmations for select to authenticated using(
 public.current_staff_id() is not null and company_id=public.current_staff_company_id()
 and (staff_id=public.current_staff_id() or public.attestation_people('attendance.confirmation.prepare')));
create policy confirmation_events_employee_people_read on public.attendance_confirmation_events for select to authenticated using(
 exists(select 1 from public.attendance_confirmations c where c.id=confirmation_id));
create policy payslip_scoped_read on public.employee_payslips for select to authenticated using(
 public.current_staff_id() is not null and company_id=public.current_staff_company_id()
 and (public.attestation_people('payroll.payslip.manage') or (staff_id=public.current_staff_id() and state='released')));
create policy payslip_audit_people_read on public.employee_payslip_events for select to authenticated using(
 public.attestation_people('payroll.payslip.manage') and exists(select 1 from public.employee_payslips p where p.id=payslip_id));
revoke all on public.attendance_confirmations,public.attendance_confirmation_events,public.employee_payslips,public.employee_payslip_events from anon,authenticated;
grant select on public.attendance_confirmations,public.attendance_confirmation_events,public.employee_payslips,public.employee_payslip_events to authenticated;

create function public.prepare_attendance_confirmation(p_staff uuid,p_start date,p_end date) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare payload jsonb; target public.staffs; existing public.attendance_confirmations; result uuid; revision integer;
begin
 if not public.attestation_people('attendance.confirmation.prepare') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_end-p_start>31 then raise exception 'Invalid period'; end if;
 select * into target from public.staffs where id=p_staff and company_id=public.current_staff_company_id();
 if target.id is null then raise exception 'Employee unavailable' using errcode='42501'; end if;
 perform public.attestation_lock(p_staff);
 perform public.attestation_require_ready(p_staff,p_start,p_end);
 payload:=public.attestation_source(p_staff,p_start,p_end);
 if jsonb_array_length(payload)=0 or exists(select 1 from jsonb_array_elements(payload) d where d->>'branch_id' is null) then raise exception 'No scoped attendance source'; end if;
 select * into existing from public.attendance_confirmations where company_id=target.company_id and staff_id=p_staff and period_start=p_start and period_end=p_end and state not in ('superseded','disputed') for update;
 if existing.id is not null and existing.source_hash=public.attestation_content_hash(payload) then return existing.id; end if;
 if existing.id is not null then
  update public.attendance_confirmations set state='superseded' where id=existing.id;
  update public.employee_payslips set state='superseded' where confirmation_id=existing.id;
 end if;
 select coalesce(max(version),0)+1 into revision from public.attendance_confirmations where company_id=target.company_id and staff_id=p_staff and period_start=p_start and period_end=p_end;
 insert into public.attendance_confirmations(company_id,staff_id,period_start,period_end,version,source_hash,attendance,state,prepared_by)
 values(target.company_id,p_staff,p_start,p_end,revision,public.attestation_content_hash(payload),payload,'prepared',public.current_staff_id()) returning id into result;
 insert into public.attendance_confirmation_events(confirmation_id,actor_id,action,source_hash) values(result,public.current_staff_id(),'prepare',public.attestation_content_hash(payload));
 return result;
end $$;

create function public.review_attendance_confirmation(p_id uuid,p_hash text,p_action text,p_branch uuid default null,p_reason text default null) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.attendance_confirmations; actor uuid:=public.current_staff_id(); next_state text; role_name text;
begin
 select * into c from public.attendance_confirmations where id=p_id and company_id=public.current_staff_company_id();
 if actor is null or c.id is null then raise exception 'Access denied' using errcode='42501'; end if;
 perform public.attestation_lock(c.staff_id);
 select * into c from public.attendance_confirmations where id=p_id for update;
 perform public.attestation_require_ready(c.staff_id,c.period_start,c.period_end);
 if c.state in ('superseded','disputed') or p_hash is distinct from c.source_hash or public.attestation_content_hash(public.attestation_source(c.staff_id,c.period_start,c.period_end))<>c.source_hash then raise exception 'Attendance changed; prepare a new version' using errcode='40001'; end if;
 if p_action in ('check','dispute') then
  if actor<>c.staff_id or c.state<>'prepared' or p_branch is not null then raise exception 'Employee confirmation required first' using errcode='42501'; end if;
  if p_action='dispute' and nullif(trim(p_reason),'') is null then raise exception 'Enter a dispute reason'; end if;
  next_state:=case when p_action='check' then 'checked' else 'disputed' end;
 elsif p_action in ('verify','approve') then
  role_name:=case when p_action='verify' then 'outlet_supervisor' else 'manager' end;
  if not public.attestation_role(role_name) or not public.can_access_company_branch(c.company_id,p_branch)
   or p_branch is null or not exists(select 1 from jsonb_array_elements(c.attendance) d where d->>'branch_id'=p_branch::text)
   or c.state<>(case when p_action='verify' then 'checked' else 'verified' end) then raise exception 'Review scope or sequence denied' using errcode='42501'; end if;
  next_state:=c.state;
 else raise exception 'Unknown attendance action'; end if;
 insert into public.attendance_confirmation_events(confirmation_id,actor_id,action,branch_id,source_hash,reason)
 values(c.id,actor,p_action,p_branch,c.source_hash,nullif(trim(p_reason),'')) on conflict do nothing;
 if p_action in ('verify','approve') and not exists(
  select 1 from jsonb_array_elements(c.attendance) d where not exists(select 1 from public.attendance_confirmation_events e
   where e.confirmation_id=c.id and e.action=p_action and e.branch_id::text=d->>'branch_id')) then
  next_state:=case when p_action='verify' then 'verified' else 'approved' end;
 end if;
 update public.attendance_confirmations set state=next_state where id=c.id;
 return next_state;
end $$;

-- Supervisors/managers receive only branch-authorized days. Direct table reads
-- are denied by RLS. People and the employee receive the complete time projection.
create function public.get_attendance_confirmations(p_offset integer default 0) returns jsonb
language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(item order by prepared_at desc),'[]'::jsonb) from (
  select c.prepared_at,jsonb_build_object('id',c.id,'staff_id',c.staff_id,'employee',s.full_name,
   'period_start',c.period_start,'period_end',c.period_end,'version',c.version,'source_hash',c.source_hash,'state',c.state,
   'own',c.staff_id=public.current_staff_id(),
   'days',(select jsonb_agg(d||jsonb_build_object('outlet',(select b.branch_name from public.branches b where b.id=(d->>'branch_id')::uuid))) from jsonb_array_elements(c.attendance) d where
     c.staff_id=public.current_staff_id() or public.attestation_people('attendance.confirmation.prepare')
     or public.can_access_company_branch(c.company_id,(d->>'branch_id')::uuid)),
   'events',(select coalesce(jsonb_agg(jsonb_build_object('action',e.action,'actor_id',e.actor_id,'actor',(select actor.full_name from public.staffs actor where actor.id=e.actor_id),'branch_id',e.branch_id,'recorded_at',e.recorded_at,'reason',e.reason) order by e.recorded_at),'[]'::jsonb)
    from public.attendance_confirmation_events e where e.confirmation_id=c.id and (e.branch_id is null or c.staff_id=public.current_staff_id()
     or public.attestation_people('attendance.confirmation.prepare') or public.can_access_company_branch(c.company_id,e.branch_id)))) as item
  from public.attendance_confirmations c join public.staffs s on s.id=c.staff_id
  where public.current_staff_id() is not null and c.company_id=public.current_staff_company_id() and (
   c.staff_id=public.current_staff_id() or public.attestation_people('attendance.confirmation.prepare') or
   ((public.attestation_role('outlet_supervisor') or public.attestation_role('manager')) and exists(
     select 1 from jsonb_array_elements(c.attendance) d where public.can_access_company_branch(c.company_id,(d->>'branch_id')::uuid))))
  order by c.prepared_at desc,c.id desc limit 200 offset greatest(0,least(coalesce(p_offset,0),100000))
 ) scoped
$$;

-- Values are explicitly entered by People. No inferred tax/OT/payroll policy.
create function public.save_employee_payslip(p_confirmation uuid,p_lines jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.attendance_confirmations; p public.employee_payslips; item jsonb; clean jsonb:='[]'; earning numeric:=0; deduction numeric:=0; amount numeric;
begin
 if not public.attestation_people('payroll.payslip.manage') then raise exception 'Access denied' using errcode='42501'; end if;
 select * into c from public.attendance_confirmations where id=p_confirmation and company_id=public.current_staff_company_id();
 if c.id is null then raise exception 'Attendance unavailable'; end if;
 perform public.attestation_lock(c.staff_id);
 select * into c from public.attendance_confirmations where id=p_confirmation for update;
 perform public.attestation_require_ready(c.staff_id,c.period_start,c.period_end);
 if c.state<>'approved' or public.attestation_content_hash(public.attestation_source(c.staff_id,c.period_start,c.period_end))<>c.source_hash then raise exception 'Current completed attendance approval required' using errcode='40001'; end if;
 if p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 50 then raise exception 'Enter 1–50 payroll lines'; end if;
 for item in select * from jsonb_array_elements(p_lines) loop
  if item->>'kind' is null or item->>'kind' not in ('earning','deduction') or nullif(trim(item->>'label'),'') is null or length(item->>'label')>120 or item->'amount' is null or jsonb_typeof(item->'amount')<>'number' then raise exception 'Invalid payroll line'; end if;
  amount:=(item->>'amount')::numeric;
  if amount<0 or amount>999999999 or round(amount,2)<>amount then raise exception 'Invalid monetary amount'; end if;
  clean:=clean||jsonb_build_array(jsonb_build_object('kind',item->>'kind','label',trim(item->>'label'),'amount',amount));
  if item->>'kind'='earning' then earning:=earning+amount; else deduction:=deduction+amount; end if;
 end loop;
 select * into p from public.employee_payslips where confirmation_id=c.id for update;
 if p.state='released' then raise exception 'Released payslip is immutable'; end if;
 insert into public.employee_payslips(confirmation_id,company_id,staff_id,earnings,deductions,detail,state,calculated_by,calculation_hash)
 values(c.id,c.company_id,c.staff_id,earning,deduction,clean,'draft',public.current_staff_id(),public.attestation_calculation_hash(c.staff_id,c.period_start,c.period_end))
 on conflict(confirmation_id) do update set earnings=excluded.earnings,deductions=excluded.deductions,detail=excluded.detail,state='draft',
 version=employee_payslips.version+1,calculation_hash=excluded.calculation_hash,calculated_by=excluded.calculated_by,calculated_at=now(),approved_by=null,approved_at=null returning * into p;
 insert into public.employee_payslip_events(payslip_id,actor_id,action,version,detail) values(p.id,public.current_staff_id(),'calculate',p.version,p.detail);
 return p.id;
end $$;
create function public.advance_employee_payslip(p_id uuid,p_version integer,p_action text) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.employee_payslips; c public.attendance_confirmations;
begin
 if not public.attestation_people('payroll.payslip.manage') then raise exception 'Access denied' using errcode='42501'; end if;
 select * into p from public.employee_payslips where id=p_id and company_id=public.current_staff_company_id();
 if p.id is null then raise exception 'Payslip unavailable'; end if;
 perform public.attestation_lock(p.staff_id);
 select * into p from public.employee_payslips where id=p_id for update;
 select * into c from public.attendance_confirmations where id=p.confirmation_id;
 perform public.attestation_require_ready(c.staff_id,c.period_start,c.period_end);
 if p.calculation_hash<>public.attestation_calculation_hash(c.staff_id,c.period_start,c.period_end) or p.version is distinct from p_version or c.state<>'approved' or public.attestation_content_hash(public.attestation_source(c.staff_id,c.period_start,c.period_end))<>c.source_hash then raise exception 'Version changed; review again' using errcode='40001'; end if;
 if p_action='approve' and p.state='draft' then
  update public.employee_payslips set state='approved',approved_by=public.current_staff_id(),approved_at=now() where id=p.id;
 elsif p_action='release' and p.state='approved' then
  if exists(select 1 from public.employee_payslips other join public.attendance_confirmations oc on oc.id=other.confirmation_id where other.staff_id=p.staff_id and other.id<>p.id and other.state='released' and oc.period_start<=c.period_end and oc.period_end>=c.period_start) then raise exception 'A released payslip already covers this period'; end if;
  update public.employee_payslips set state='released',released_by=public.current_staff_id(),released_at=now() where id=p.id;
 else raise exception 'Invalid payslip sequence'; end if;
 insert into public.employee_payslip_events(payslip_id,actor_id,action,version,detail) values(p.id,public.current_staff_id(),p_action,p.version,p.detail);
 return case when p_action='approve' then 'approved' else 'released' end;
end $$;

-- Serialize source writers before mutation; compare final content at transaction
-- end so a replacement result with identical time evidence does not reuse a
-- missing intermediate row as a reason to demand a new employee signature.
create function public.lock_attendance_confirmation_source() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if TG_OP<>'INSERT' then perform public.attestation_lock(OLD.staff_id); end if;
 if TG_OP<>'DELETE' then perform public.attestation_lock(NEW.staff_id); end if;
 return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
create function public.attestation_invalidate(p_staff uuid,p_date date) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.attendance_confirmations; time_changed boolean; pay_changed boolean;
begin
 for c in select * from public.attendance_confirmations where staff_id=p_staff and p_date between period_start and period_end
 loop
  time_changed:=c.source_hash<>public.attestation_content_hash(public.attestation_source(c.staff_id,c.period_start,c.period_end));
  pay_changed:=exists(select 1 from public.employee_payslips p where p.confirmation_id=c.id
    and p.calculation_hash<>public.attestation_calculation_hash(c.staff_id,c.period_start,c.period_end));
  if (time_changed or pay_changed) and exists(select 1 from public.employee_payslips p where p.confirmation_id=c.id and p.state='released') then
   raise exception 'Published payroll is locked; use an explicitly approved correction process' using errcode='55000';
  end if;
  if time_changed and c.state not in ('superseded','disputed') then
   update public.attendance_confirmations set state='superseded' where id=c.id;
   insert into public.attendance_confirmation_events(confirmation_id,actor_id,action,source_hash,reason)
    values(c.id,public.current_staff_id(),'supersede',c.source_hash,'Attendance content changed');
  end if;
  if time_changed or pay_changed then
   insert into public.employee_payslip_events(payslip_id,actor_id,action,version,detail) select p.id,public.current_staff_id(),'invalidate',p.version,p.detail from public.employee_payslips p where p.confirmation_id=c.id and p.state not in ('released','superseded');
   update public.employee_payslips set state='superseded' where confirmation_id=c.id and state<>'released';
  end if;
 end loop;
end $$;
create function public.invalidate_attendance_confirmation() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if TG_OP<>'INSERT' then perform public.attestation_invalidate(OLD.staff_id,OLD.work_date); end if;
 if TG_OP<>'DELETE' then perform public.attestation_invalidate(NEW.staff_id,NEW.work_date); end if;
 return null;
end $$;
create function public.attestation_week_changed() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare assignment record;
begin
 for assignment in select staff_id,work_date from public.shift_assignment_revisions where schedule_week_id=OLD.id order by staff_id,work_date loop
  if TG_WHEN='BEFORE' then perform public.attestation_lock(assignment.staff_id);
  else perform public.attestation_invalidate(assignment.staff_id,assignment.work_date); end if;
 end loop;
 return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
create trigger attendance_confirmation_week_lock before update or delete on public.schedule_weeks for each row execute function public.attestation_week_changed();
create constraint trigger attendance_confirmation_week_changed after update or delete on public.schedule_weeks deferrable initially deferred for each row execute function public.attestation_week_changed();
create trigger attendance_confirmation_result_lock before insert or update or delete on public.daily_attendance_results for each row execute function public.lock_attendance_confirmation_source();
create trigger attendance_confirmation_schedule_lock before insert or update or delete on public.shift_assignment_revisions for each row execute function public.lock_attendance_confirmation_source();
create constraint trigger attendance_confirmation_result_changed after insert or update or delete on public.daily_attendance_results deferrable initially deferred for each row execute function public.invalidate_attendance_confirmation();
create constraint trigger attendance_confirmation_schedule_changed after insert or update or delete on public.shift_assignment_revisions deferrable initially deferred for each row execute function public.invalidate_attendance_confirmation();

-- Private integration hook for the recalculation worker: return needs-review
-- before changing a released period, rather than waiting for the deferred guard.
create function public.attendance_payroll_locked(p_company uuid,p_staff uuid,p_date date) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.employee_payslips p join public.attendance_confirmations c on c.id=p.confirmation_id
  where p.company_id=p_company and p.staff_id=p_staff and p.state='released' and p_date between c.period_start and c.period_end)
$$;
revoke all on function public.attendance_payroll_locked(uuid,uuid,date) from public,anon,authenticated;

-- Private helpers must never expose unscoped evidence or acquire arbitrary locks.
revoke all on function public.attestation_source(uuid,date,date),public.attestation_lock(uuid),public.invalidate_attendance_confirmation(),public.lock_attendance_confirmation_source(),public.attestation_calculation_hash(uuid,date,date),public.attestation_content_hash(jsonb),public.attestation_require_ready(uuid,date,date),public.attestation_invalidate(uuid,date),public.attestation_week_changed() from public,anon,authenticated;
revoke all on function public.attestation_role(text),public.attestation_people(text),public.prepare_attendance_confirmation(uuid,date,date),public.review_attendance_confirmation(uuid,text,text,uuid,text),public.get_attendance_confirmations(integer),public.save_employee_payslip(uuid,jsonb),public.advance_employee_payslip(uuid,integer,text) from public,anon;
grant execute on function public.attestation_role(text),public.attestation_people(text),public.prepare_attendance_confirmation(uuid,date,date),public.review_attendance_confirmation(uuid,text,text,uuid,text),public.get_attendance_confirmations(integer),public.save_employee_payslip(uuid,jsonb),public.advance_employee_payslip(uuid,integer,text) to authenticated;
notify pgrst,'reload schema';
