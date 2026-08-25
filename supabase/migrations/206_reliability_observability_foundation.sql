-- v8.65.0: tenant-scoped reliability observation and safe recovery registry.
-- This migration records what happened; it never changes inventory, money,
-- document workflow state, supplier identity, or permissions.

create table if not exists public.operation_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  operation_id uuid not null default gen_random_uuid(),
  idempotency_key uuid not null,
  request_fingerprint text not null,
  module text not null,
  action text not null,
  status text not null default 'started' check (status in ('started','succeeded','failed','unknown')),
  safe_result jsonb,
  error_code text,
  business_data_changed boolean not null default false,
  actor_staff_id uuid not null references public.staffs(id),
  branch_id uuid references public.branches(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, operation_id),
  unique (company_id, idempotency_key)
);

create table if not exists public.system_incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  fingerprint text not null,
  module text not null,
  route text,
  branch_id uuid references public.branches(id),
  severity text not null default 'error' check (severity in ('info','warning','error','critical')),
  status text not null default 'observed' check (status in ('observed','recovering','recovered','action_required','acknowledged')),
  safe_code text not null,
  safe_message text not null,
  recommended_action text,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  recovery_attempts integer not null default 0 check (recovery_attempts >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  recovered_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.staffs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, fingerprint)
);

create table if not exists public.system_incident_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  incident_id uuid not null references public.system_incidents(id) on delete cascade,
  operation_id uuid,
  event_type text not null check (event_type in ('detected','retrying','recovered','failed','acknowledged')),
  attempt_no integer check (attempt_no is null or attempt_no > 0),
  business_data_changed boolean not null default false,
  safe_metadata jsonb,
  actor_staff_id uuid references public.staffs(id),
  created_at timestamptz not null default now()
);

create table if not exists public.draft_revisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  actor_staff_id uuid not null references public.staffs(id),
  branch_id uuid references public.branches(id),
  draft_type text not null,
  draft_key text not null,
  scope_fingerprint text not null,
  revision integer not null default 1 check (revision > 0),
  safe_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, actor_staff_id, draft_type, draft_key)
);

create index if not exists operation_requests_company_status_idx on public.operation_requests(company_id, status, started_at desc);
create index if not exists system_incidents_company_status_idx on public.system_incidents(company_id, status, last_seen_at desc);
create index if not exists system_incident_events_incident_idx on public.system_incident_events(incident_id, created_at desc);
create index if not exists draft_revisions_actor_idx on public.draft_revisions(company_id, actor_staff_id, updated_at desc);

alter table public.operation_requests enable row level security;
alter table public.system_incidents enable row level security;
alter table public.system_incident_events enable row level security;
alter table public.draft_revisions enable row level security;

drop policy if exists operation_requests_actor_read on public.operation_requests;
create policy operation_requests_actor_read on public.operation_requests for select to authenticated
using (
  company_id = public.current_staff_company_id()
  and (actor_staff_id = public.current_staff_id() or 'super_admin' = any(public.current_staff_role_codes()))
);
drop policy if exists operation_requests_actor_insert on public.operation_requests;
create policy operation_requests_actor_insert on public.operation_requests for insert to authenticated
with check (company_id = public.current_staff_company_id() and actor_staff_id = public.current_staff_id());
drop policy if exists operation_requests_actor_update on public.operation_requests;
create policy operation_requests_actor_update on public.operation_requests for update to authenticated
using (company_id = public.current_staff_company_id() and actor_staff_id = public.current_staff_id())
with check (company_id = public.current_staff_company_id() and actor_staff_id = public.current_staff_id());

drop policy if exists system_incidents_owner_read on public.system_incidents;
create policy system_incidents_owner_read on public.system_incidents for select to authenticated
using (company_id = public.current_staff_company_id() and 'super_admin' = any(public.current_staff_role_codes()));
drop policy if exists system_incident_events_owner_read on public.system_incident_events;
create policy system_incident_events_owner_read on public.system_incident_events for select to authenticated
using (company_id = public.current_staff_company_id() and 'super_admin' = any(public.current_staff_role_codes()));

drop policy if exists draft_revisions_actor_all on public.draft_revisions;
create policy draft_revisions_actor_all on public.draft_revisions for all to authenticated
using (company_id = public.current_staff_company_id() and actor_staff_id = public.current_staff_id())
with check (company_id = public.current_staff_company_id() and actor_staff_id = public.current_staff_id());

create or replace function public.record_system_incident(
  p_fingerprint text,
  p_module text,
  p_safe_code text,
  p_safe_message text,
  p_route text default null,
  p_branch_id uuid default null,
  p_severity text default 'error',
  p_operation_id uuid default null,
  p_event_type text default 'detected',
  p_recommended_action text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_staff_company_id();
  v_staff_id uuid := public.current_staff_id();
  v_incident public.system_incidents%rowtype;
  v_previous_status text;
begin
  if v_company_id is null or v_staff_id is null then raise exception 'active_actor_required'; end if;
  if p_severity not in ('info','warning','error','critical') then raise exception 'invalid_incident_severity'; end if;
  if p_event_type not in ('detected','retrying','recovered','failed') then raise exception 'invalid_incident_event'; end if;

  select status into v_previous_status from public.system_incidents
  where company_id = v_company_id and fingerprint = left(p_fingerprint, 180);

  insert into public.system_incidents (
    company_id, fingerprint, module, route, branch_id, severity, status,
    safe_code, safe_message, recommended_action
  ) values (
    v_company_id, left(p_fingerprint, 180), left(p_module, 80), left(p_route, 240), p_branch_id,
    p_severity, case when p_event_type = 'recovered' then 'recovered' else 'observed' end,
    left(p_safe_code, 80), left(p_safe_message, 240), left(p_recommended_action, 240)
  )
  on conflict (company_id, fingerprint) do update set
    occurrence_count = public.system_incidents.occurrence_count + 1,
    recovery_attempts = public.system_incidents.recovery_attempts + case when p_event_type = 'retrying' then 1 else 0 end,
    last_seen_at = now(),
    route = coalesce(excluded.route, public.system_incidents.route),
    branch_id = coalesce(excluded.branch_id, public.system_incidents.branch_id),
    severity = excluded.severity,
    safe_code = excluded.safe_code,
    safe_message = excluded.safe_message,
    recommended_action = coalesce(excluded.recommended_action, public.system_incidents.recommended_action),
    status = case
      when p_event_type = 'recovered' then 'recovered'
      when public.system_incidents.occurrence_count + 1 >= 3
        or now() - public.system_incidents.first_seen_at >= interval '15 minutes' then 'action_required'
      when p_event_type = 'retrying' then 'recovering'
      else 'observed'
    end,
    recovered_at = case when p_event_type = 'recovered' then now() else null end,
    updated_at = now()
  returning * into v_incident;

  insert into public.system_incident_events (
    company_id, incident_id, operation_id, event_type, attempt_no,
    business_data_changed, actor_staff_id
  ) values (
    v_company_id, v_incident.id, p_operation_id, p_event_type,
    case when p_event_type = 'retrying' then v_incident.recovery_attempts else null end,
    false, v_staff_id
  );

  if v_incident.status = 'action_required' and coalesce(v_previous_status, '') <> 'action_required' then
    insert into public.notifications (
      company_id, recipient_staff_id, title, message, action_url, priority,
      entity_type, entity_id, created_by
    )
    select v_company_id, s.id, 'System attention required',
      left(v_incident.module || ': ' || v_incident.safe_message, 240),
      '/administration/system-health?incident=' || v_incident.id::text,
      case when v_incident.severity = 'critical' then 'critical' else 'urgent' end,
      'system_incident', v_incident.id, v_staff_id
    from public.staffs s
    where s.company_id = v_company_id and s.status = 'active' and s.deleted_at is null
      and exists (
        select 1 from public.staff_roles sr join public.roles r on r.id = sr.role_id
        where sr.staff_id = s.id and r.role_code = 'super_admin'
      );
  end if;
  return v_incident.id;
end;
$$;

create or replace function public.acknowledge_system_incident(p_incident_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_staff_id uuid := public.current_staff_id();
begin
  if not ('super_admin' = any(public.current_staff_role_codes())) then raise exception 'owner_required'; end if;
  update public.system_incidents set status = 'acknowledged', acknowledged_at = now(),
    acknowledged_by = v_staff_id, updated_at = now()
  where id = p_incident_id and company_id = public.current_staff_company_id();
  if not found then raise exception 'incident_not_found'; end if;
  insert into public.system_incident_events(company_id, incident_id, event_type, business_data_changed, actor_staff_id)
  values (public.current_staff_company_id(), p_incident_id, 'acknowledged', false, v_staff_id);
end;
$$;

revoke all on table public.operation_requests, public.system_incidents, public.system_incident_events, public.draft_revisions from anon;
grant select, insert, update on public.operation_requests to authenticated;
grant select on public.system_incidents, public.system_incident_events to authenticated;
grant select, insert, update, delete on public.draft_revisions to authenticated;
revoke all on function public.record_system_incident(text,text,text,text,text,uuid,text,uuid,text,text) from public, anon;
revoke all on function public.acknowledge_system_incident(uuid) from public, anon;
grant execute on function public.record_system_incident(text,text,text,text,text,uuid,text,uuid,text,text) to authenticated;
grant execute on function public.acknowledge_system_incident(uuid) to authenticated;
