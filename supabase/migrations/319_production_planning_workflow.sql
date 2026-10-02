-- Operational instructions only. Inventory continues through production-job posting.
-- No defaults are inferred from historic over-supply; rollout is disabled until configured.
insert into public.permissions(permission_code,module,action,description) values
 ('production_planning.view','production_planning','view','Read assigned production plans and delivery orders'),
 ('production_planning.manage','production_planning','manage','Configure and prepare production allocation plans'),
 ('production_planning.approve','production_planning','approve','Approve a version of a production plan'),
 ('production_planning.dispatch','production_planning','dispatch','Confirm or correct actual delivery orders')
on conflict(permission_code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where p.module='production_planning' and (r.role_code in ('super_admin','manager') or
 (p.action='view' and r.role_code in ('kitchen','outlet_supervisor','outlet_staff')))
on conflict do nothing;

create or replace function public.planning_manager() returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.staffs s join public.staff_roles sr on sr.staff_id=s.id
 join public.roles r on r.id=sr.role_id and r.company_id=s.company_id
 where s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null
 and sr.is_primary and sr.effective_from<=current_date and (sr.effective_to is null or sr.effective_to>=current_date)
 and (select count(*) from public.staff_roles active_role where active_role.staff_id=s.id and active_role.is_primary and active_role.effective_from<=current_date and (active_role.effective_to is null or active_role.effective_to>=current_date))=1
 and r.status='active' and r.deleted_at is null and r.role_code in ('super_admin','manager'))
$$;
create or replace function public.planning_branch_access(p_company uuid,p_branch uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.staffs s join public.branches b on b.id=p_branch and b.company_id=s.company_id
 where s.company_id=p_company and s.auth_user_id=auth.uid() and s.status='active' and s.deleted_at is null
 and public.has_permission('production_planning.view') and
 (public.planning_manager() or s.default_branch_id=p_branch or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=p_branch)))
$$;

create table public.production_planning_settings(
 company_id uuid not null references public.companies(id), kitchen_id uuid primary key references public.branches(id),
 enabled boolean not null default false, draft_time time not null default '20:00',
 buffer_percent numeric not null default 10 check(buffer_percent between 0 and 100),
 max_decrease_percent numeric not null default 10 check(max_decrease_percent between 0 and 100),
 recipients text[] not null default '{}', updated_by uuid references public.staffs(id), updated_at timestamptz not null default now()
);
create table public.production_batch_rules(
 company_id uuid not null references public.companies(id), kitchen_id uuid not null references public.branches(id),
 product_id uuid not null references public.products(id), yield_per_tray numeric not null check(yield_per_tray>0),
 updated_by uuid references public.staffs(id), updated_at timestamptz not null default now(), primary key(kitchen_id,product_id)
);
create table public.production_outlet_minimums(
 company_id uuid not null references public.companies(id), kitchen_id uuid not null references public.branches(id),
 branch_id uuid not null references public.branches(id), product_id uuid not null references public.products(id),
 minimum_qty numeric not null check(minimum_qty>=0), confirmed_by uuid not null references public.staffs(id), confirmed_at timestamptz not null default now(),
 primary key(kitchen_id,branch_id,product_id)
);
create table public.production_planning_events(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 kitchen_id uuid not null references public.branches(id), branch_id uuid references public.branches(id),
 event_date date not null, name text not null check(length(trim(name))>0), notes text not null default '',
 confirmed boolean not null default false, lines jsonb not null check(jsonb_typeof(lines)='array'),
 created_by uuid references public.staffs(id), created_at timestamptz not null default now()
);
create table public.production_plans(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 kitchen_id uuid not null references public.branches(id), delivery_date date not null, version integer not null check(version>0),
 revision integer not null default 1, status text not null default 'draft' check(status in ('draft','submitted','approved','superseded')),
 buffer_percent numeric not null check(buffer_percent between 0 and 100), max_decrease_percent numeric not null check(max_decrease_percent between 0 and 100),
 forecast_version text not null, events jsonb not null default '[]', holidays jsonb not null default '[]',
 created_by uuid references public.staffs(id), created_at timestamptz not null default now(),
 approved_by uuid references public.staffs(id), approved_at timestamptz, unique(kitchen_id,delivery_date,version)
);
create unique index production_plan_one_working on public.production_plans(kitchen_id,delivery_date) where status in ('draft','submitted');
create table public.production_plan_products(
 plan_id uuid not null references public.production_plans(id), product_id uuid not null references public.products(id),
 yield_per_tray numeric check(yield_per_tray>0), trays integer check(trays>=0), retained_qty numeric not null default 0 check(retained_qty>=0),
 actual_qty numeric check(actual_qty>=0), reason text not null default '', event_qty numeric not null default 0 check(event_qty>=0),
 production_job_id uuid references public.production_jobs(id), primary key(plan_id,product_id)
);
create table public.production_plan_allocations(
 plan_id uuid not null references public.production_plans(id), product_id uuid not null references public.products(id),
 branch_id uuid not null references public.branches(id), suggested_qty numeric check(suggested_qty>=0), approved_qty numeric check(approved_qty>=0),
 minimum_qty numeric check(minimum_qty>=0), event_qty numeric not null default 0 check(event_qty>=0),
 reason text not null default '', evidence jsonb not null, primary key(plan_id,product_id,branch_id)
);
create table public.production_delivery_orders(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 plan_id uuid not null references public.production_plans(id), kitchen_id uuid not null references public.branches(id),
 branch_id uuid references public.branches(id), event_id uuid references public.production_planning_events(id),
 delivery_date date not null, plan_version integer not null, do_no text not null,
 status text not null default 'confirmed' check(status in ('confirmed','void')),
 prepared_by text not null, driver text not null default '', vehicle text not null default '',
 yellow_trays integer not null default 0 check(yellow_trays>=0), silver_trays integer not null default 0 check(silver_trays>=0),
 reason text, daily_record_id uuid references public.outlet_daily_records(id),
 created_by uuid not null references public.staffs(id), created_at timestamptz not null default now(),
 voided_by uuid references public.staffs(id), voided_at timestamptz, void_reason text,
 unique(company_id,do_no),
 check((branch_id is not null)::integer+(event_id is not null)::integer=1), check(status<>'void' or length(trim(void_reason))>0)
);
create table public.production_delivery_sequences(
 company_id uuid not null references public.companies(id), delivery_date date not null, last_number integer not null, primary key(company_id,delivery_date)
);
create table public.production_delivery_order_lines(
 do_id uuid not null references public.production_delivery_orders(id), product_id uuid not null references public.products(id),
 qty numeric not null check(qty>=0), product_code text not null, product_name text not null, category text not null,
 unit text not null, display_order integer not null, primary key(do_id,product_id)
);
create index production_do_daily on public.production_delivery_orders(company_id,branch_id,delivery_date) where status='confirmed';
create table public.production_planning_requests(
 company_id uuid not null references public.companies(id), request_key uuid not null, operation text not null,
 request_payload jsonb not null, result jsonb not null, created_at timestamptz not null default now(), primary key(company_id,request_key)
);
create table public.production_planning_audit(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 plan_id uuid references public.production_plans(id), operation text not null, actor_id uuid references public.staffs(id),
 payload jsonb not null, created_at timestamptz not null default now()
);
create table public.production_planning_email_queue(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 plan_id uuid not null references public.production_plans(id), recipient text not null, dedupe_key text not null unique,
 subject text not null, body text not null, status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), locked_until timestamptz,
 provider_id text, last_error text, created_at timestamptz not null default now(), sent_at timestamptz
);
-- Stable immutable cursors keep all operational records in company backups.
do $$ declare t text; begin
 foreach t in array array['production_planning_settings','production_batch_rules','production_outlet_minimums','production_plan_products','production_plan_allocations','production_delivery_order_lines','production_delivery_sequences'] loop
  execute format('alter table public.%I add column id uuid not null default gen_random_uuid() unique, add column created_at timestamptz not null default now()',t);
 end loop;
 alter table public.production_planning_requests add column id uuid not null default gen_random_uuid() unique;
end $$;
alter table public.outlet_daily_record_lines add column do_managed boolean not null default false;
alter table public.outlet_daily_record_lines add column stockout boolean not null default false;
alter table public.outlet_daily_record_lines add column stockout_time time;
alter table public.outlet_daily_record_lines add column wastage_provided boolean not null default false;
-- Historical completed entries have an explicit completed wastage confirmation.
update public.outlet_daily_record_lines l set wastage_provided=true from public.outlet_daily_records r where r.id=l.record_id and r.status in ('evening_completed','reviewed');

-- Source-controlled quantities cannot be replaced by direct writes or the existing save RPC.
create function public.guard_do_managed_sent() returns trigger language plpgsql set search_path=public as $$
begin
 if old.do_managed and current_setting('seri.planning_sync',true) is distinct from 'on' then
  new.qty_sent:=old.qty_sent; new.qty_sent_confirmed:=old.qty_sent_confirmed;
  new.qty_sent_source:=old.qty_sent_source; new.do_managed:=true;
 end if;
 return new;
end $$;
create trigger guard_do_managed_sent before update on public.outlet_daily_record_lines for each row execute function public.guard_do_managed_sent();

-- All new tables are RPC-write-only. Plan visibility is kitchen scoped; DO visibility is destination scoped.
do $$ declare t text; begin
 foreach t in array array['production_planning_settings','production_batch_rules','production_outlet_minimums','production_planning_events','production_plans','production_plan_products','production_plan_allocations','production_delivery_orders','production_delivery_order_lines','production_delivery_sequences','production_planning_requests','production_planning_audit','production_planning_email_queue'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['production_planning_settings','production_batch_rules','production_outlet_minimums','production_planning_events','production_plans'] loop
  execute format('create policy planning_read on public.%I for select to authenticated using(public.planning_branch_access(company_id,kitchen_id))',t);
 end loop;
 foreach t in array array['production_plan_products','production_plan_allocations'] loop
  execute format('create policy planning_read on public.%I for select to authenticated using(exists(select 1 from public.production_plans p where p.id=plan_id))',t);
 end loop;
end $$;
drop policy planning_read on public.production_plans;
create policy planning_read on public.production_plans for select to authenticated using(public.planning_branch_access(company_id,kitchen_id) and (public.planning_manager() or status in ('approved','superseded')));
create policy delivery_read on public.production_delivery_orders for select to authenticated using(
 public.planning_branch_access(company_id,kitchen_id) or (branch_id is not null and public.planning_branch_access(company_id,branch_id)));
create policy delivery_lines_read on public.production_delivery_order_lines for select to authenticated using(exists(select 1 from public.production_delivery_orders d where d.id=do_id));
create policy planning_audit_read on public.production_planning_audit for select to authenticated using(exists(select 1 from public.production_plans p where p.id=plan_id));
create policy planning_email_read on public.production_planning_email_queue for select to authenticated using(public.planning_manager() and exists(select 1 from public.production_plans p where p.id=plan_id));

create function public.planning_require_manager(p_permission text) returns public.staffs
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; begin
 select * into a from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null;
 if a.id is null or not public.planning_manager() or not public.has_permission(p_permission) then raise exception 'Manager or Owner permission required: %',p_permission; end if;
 return a;
end $$;
create function public.planning_validate_kitchen(p_company uuid,p_kitchen uuid) returns void
language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from public.branches where id=p_kitchen and company_id=p_company and branch_type='central_kitchen' and status='active' and deleted_at is null) then raise exception 'Active kitchen required in your company.'; end if;
end $$;
create function public.planning_validate_route(p_company uuid,p_kitchen uuid,p_branch uuid,p_date date) returns void
language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from public.branch_supply_routes r join public.branches b on b.id=r.destination_branch_id
 where r.company_id=p_company and r.source_branch_id=p_kitchen and r.destination_branch_id=p_branch
 and r.status='active' and r.is_primary and r.effective_from<=p_date and (r.effective_to is null or r.effective_to>=p_date)
 and b.company_id=p_company and b.status='active' and b.deleted_at is null) then raise exception 'No active primary supply route for this kitchen and outlet.'; end if;
end $$;

create function public.configure_production_planning(p_payload jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; k uuid:=(p_payload->>'kitchen_id')::uuid; x jsonb; begin
 a:=public.planning_require_manager('production_planning.manage'); perform public.planning_validate_kitchen(a.company_id,k);
 insert into public.production_planning_settings(company_id,kitchen_id,enabled,draft_time,buffer_percent,max_decrease_percent,recipients,updated_by)
 values(a.company_id,k,coalesce((p_payload->>'enabled')::boolean,false),(p_payload->>'draft_time')::time,(p_payload->>'buffer_percent')::numeric,(p_payload->>'max_decrease_percent')::numeric,
 array(select jsonb_array_elements_text(p_payload->'recipients')),a.id)
 on conflict(kitchen_id) do update set enabled=excluded.enabled,draft_time=excluded.draft_time,buffer_percent=excluded.buffer_percent,max_decrease_percent=excluded.max_decrease_percent,recipients=excluded.recipients,updated_by=a.id,updated_at=now();
 if exists(select 1 from unnest(array(select jsonb_array_elements_text(p_payload->'recipients'))) email where email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$') then raise exception 'Invalid email recipient.'; end if;
 for x in select value from jsonb_array_elements(p_payload->'batches') loop
  if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=a.company_id and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
  insert into public.production_batch_rules(company_id,kitchen_id,product_id,yield_per_tray,updated_by) values(a.company_id,k,(x->>'product_id')::uuid,(x->>'yield_per_tray')::numeric,a.id)
  on conflict(kitchen_id,product_id) do update set yield_per_tray=excluded.yield_per_tray,updated_by=a.id,updated_at=now();
 end loop;
 for x in select value from jsonb_array_elements(p_payload->'minimums') loop
  perform public.planning_validate_route(a.company_id,k,(x->>'branch_id')::uuid,(now() at time zone 'Asia/Kuala_Lumpur')::date);
  if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=a.company_id and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
  insert into public.production_outlet_minimums(company_id,kitchen_id,branch_id,product_id,minimum_qty,confirmed_by)
  values(a.company_id,k,(x->>'branch_id')::uuid,(x->>'product_id')::uuid,(x->>'minimum_qty')::numeric,a.id)
  on conflict(kitchen_id,branch_id,product_id) do update set minimum_qty=excluded.minimum_qty,confirmed_by=a.id,confirmed_at=now();
 end loop;
 insert into public.production_planning_audit(company_id,operation,actor_id,payload) values(a.company_id,'configure',a.id,p_payload);
end $$;

create function public.save_production_event(p_payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; k uuid:=(p_payload->>'kitchen_id')::uuid; b uuid:=(p_payload->>'branch_id')::uuid; x jsonb; eid uuid; begin
 a:=public.planning_require_manager('production_planning.manage'); perform public.planning_validate_kitchen(a.company_id,k);
 if b is not null then perform public.planning_validate_route(a.company_id,k,b,(p_payload->>'event_date')::date); end if;
 if jsonb_typeof(p_payload->'lines')<>'array' or jsonb_array_length(p_payload->'lines')=0 then raise exception 'Event products required.'; end if;
 for x in select value from jsonb_array_elements(p_payload->'lines') loop
  if (x->>'qty')::numeric<=0 or not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=a.company_id and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid event product or quantity.'; end if;
 end loop;
 insert into public.production_planning_events(company_id,kitchen_id,branch_id,event_date,name,notes,confirmed,lines,created_by)
 values(a.company_id,k,b,(p_payload->>'event_date')::date,p_payload->>'name',coalesce(p_payload->>'notes',''),coalesce((p_payload->>'confirmed')::boolean,false),p_payload->'lines',a.id) returning id into eid;
 return eid;
end $$;

-- Forecast payloads are generated by the versioned server calculator. Original evidence is immutable on draft edits.
create function public.create_production_plan(p_payload jsonb,p_company_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; c uuid; k uuid:=(p_payload->>'kitchen_id')::uuid; dt date:=(p_payload->>'delivery_date')::date;
 pid uuid; v integer; x jsonb; begin
 if auth.role()='service_role' then c:=p_company_id; else a:=public.planning_require_manager('production_planning.manage'); c:=a.company_id; end if;
 perform public.planning_validate_kitchen(c,k);
 perform pg_advisory_xact_lock(hashtextextended(k::text||dt::text,0));
 select id into pid from public.production_plans where kitchen_id=k and delivery_date=dt and status in ('draft','submitted');
 if pid is not null then return pid; end if;
 if auth.role()='service_role' then
  select id into pid from public.production_plans where kitchen_id=k and delivery_date=dt order by version desc limit 1;
  if pid is not null then return pid; end if;
 end if;
 select coalesce(max(version),0)+1 into v from public.production_plans where kitchen_id=k and delivery_date=dt;
 insert into public.production_plans(company_id,kitchen_id,delivery_date,version,buffer_percent,max_decrease_percent,forecast_version,events,holidays,created_by)
 values(c,k,dt,v,(p_payload->>'buffer_percent')::numeric,(p_payload->>'max_decrease_percent')::numeric,p_payload->>'forecast_version',p_payload->'events',p_payload->'holidays',a.id) returning id into pid;
 for x in select value from jsonb_array_elements(p_payload->'product_lines') loop
  if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=c and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
  insert into public.production_plan_products(plan_id,product_id,yield_per_tray,trays,event_qty) values(pid,(x->>'product_id')::uuid,(x->>'yield_per_tray')::numeric,(x->>'trays')::integer,(x->>'event_qty')::numeric);
 end loop;
 for x in select value from jsonb_array_elements(p_payload->'allocations') loop
  perform public.planning_validate_route(c,k,(x->>'branch_id')::uuid,dt);
  if not exists(select 1 from public.production_plan_products where plan_id=pid and product_id=(x->>'product_id')::uuid) then raise exception 'Allocation product is not in this plan.'; end if;
  insert into public.production_plan_allocations(plan_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,event_qty,evidence)
  values(pid,(x->>'product_id')::uuid,(x->>'branch_id')::uuid,(x->>'suggested_qty')::numeric,(x->>'approved_qty')::numeric,(x->>'minimum_qty')::numeric,(x->>'event_qty')::numeric,x->'evidence');
 end loop;
 insert into public.production_planning_audit(company_id,plan_id,operation,actor_id,payload) values(c,pid,'generate',a.id,p_payload);
 return pid;
end $$;

create function public.planning_queue_release(p_plan uuid) returns void language plpgsql set search_path=public as $$
declare p public.production_plans%rowtype; email text; begin
 select * into p from public.production_plans where id=p_plan;
 for email in select unnest(recipients) from public.production_planning_settings where kitchen_id=p.kitchen_id loop
  insert into public.production_planning_email_queue(company_id,plan_id,recipient,dedupe_key,subject,body)
  values(p.company_id,p.id,email,p.id::text||':release:'||lower(email),
  'Production plan '||p.delivery_date||' · version '||p.version,
  'Approved production plan '||p.delivery_date||' · version '||p.version||E'\nUse the current approved system version.\nhttps://system.seribako.com.my/production/planning?date='||p.delivery_date||'&kitchen='||p.kitchen_id)
  on conflict(dedupe_key) do nothing;
 end loop;
 insert into public.notifications(company_id,recipient_role_id,branch_id,title,message,action_url,entity_type,entity_id,created_by)
 select p.company_id,r.id,p.kitchen_id,'Production plan approved',p.delivery_date||' · version '||p.version,
 '/production/planning?date='||p.delivery_date||'&kitchen='||p.kitchen_id,'production_plan',p.id,p.approved_by
 from public.roles r where r.company_id=p.company_id and r.role_code='kitchen' and r.status='active' and r.deleted_at is null;
end $$;

create function public.update_production_plan(p_plan_id uuid,p_revision integer,p_action text,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; p public.production_plans%rowtype; prior public.production_planning_requests%rowtype;
 x jsonb; al public.production_plan_allocations%rowtype; pr public.production_plan_products%rowtype; qty numeric; total numeric; result jsonb; new_id uuid;
begin
 a:=public.planning_require_manager(case when p_action='approve' then 'production_planning.approve' else 'production_planning.manage' end);
 if p_key is null then raise exception 'Idempotency key required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||p_key::text,1));
 select * into prior from public.production_planning_requests where company_id=a.company_id and request_key=p_key;
 if prior.request_key is not null then
  if prior.operation<>p_action or prior.request_payload<>jsonb_build_object('plan',p_plan_id,'revision',p_revision,'payload',p_payload) then raise exception 'Idempotency key already used for different input.'; end if;
  return prior.result;
 end if;
 select * into p from public.production_plans where id=p_plan_id and company_id=a.company_id for update;
 if p.id is null or p.revision<>p_revision then raise exception 'Plan changed. Reload before saving.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p.kitchen_id::text||p.delivery_date::text,0));
 if p_action='revise' then
  if p.status<>'approved' then raise exception 'Only approved plans need a new version.'; end if;
  if exists(select 1 from public.production_plans where kitchen_id=p.kitchen_id and delivery_date=p.delivery_date and status in ('draft','submitted')) then raise exception 'A working revision already exists.'; end if;
  insert into public.production_plans(company_id,kitchen_id,delivery_date,version,buffer_percent,max_decrease_percent,forecast_version,events,holidays,created_by)
  values(p.company_id,p.kitchen_id,p.delivery_date,(select max(version)+1 from public.production_plans where kitchen_id=p.kitchen_id and delivery_date=p.delivery_date),p.buffer_percent,p.max_decrease_percent,p.forecast_version,p.events,p.holidays,a.id) returning id into new_id;
  insert into public.production_plan_products select new_id,product_id,yield_per_tray,trays,retained_qty,null,reason,event_qty,production_job_id from public.production_plan_products where plan_id=p.id;
  insert into public.production_plan_allocations select new_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,event_qty,reason,evidence from public.production_plan_allocations where plan_id=p.id;
 elsif p_action in ('save','recalculate') then
  if p.status<>'draft' then raise exception 'Only draft plans can be edited.'; end if;
  if p_action='recalculate' then
   for x in select value from jsonb_array_elements(p_payload->'product_lines') loop
    if not exists(select 1 from public.products where id=(x->>'product_id')::uuid and company_id=p.company_id and status='active' and deleted_at is null and lower(category)<>'packaging') then raise exception 'Invalid food product.'; end if;
    insert into public.production_plan_products(plan_id,product_id,yield_per_tray,trays,event_qty)
    values(p.id,(x->>'product_id')::uuid,(x->>'yield_per_tray')::numeric,(x->>'trays')::integer,(x->>'event_qty')::numeric) on conflict do nothing;
   end loop;
   delete from public.production_plan_allocations al where al.plan_id=p.id and not exists(select 1 from jsonb_array_elements(p_payload->'allocations') x where (x->>'branch_id')::uuid=al.branch_id and (x->>'product_id')::uuid=al.product_id);
   delete from public.production_plan_products pr where pr.plan_id=p.id and not exists(select 1 from jsonb_array_elements(p_payload->'product_lines') x where (x->>'product_id')::uuid=pr.product_id);
   update public.production_plans set buffer_percent=(p_payload->>'buffer_percent')::numeric,max_decrease_percent=(p_payload->>'max_decrease_percent')::numeric where id=p.id;
  end if;
  for x in select value from jsonb_array_elements(p_payload->'allocations') loop
   select * into al from public.production_plan_allocations where plan_id=p.id and product_id=(x->>'product_id')::uuid and branch_id=(x->>'branch_id')::uuid for update;
   if al.plan_id is null and p_action='recalculate' then
    perform public.planning_validate_route(p.company_id,p.kitchen_id,(x->>'branch_id')::uuid,p.delivery_date);
    if not exists(select 1 from public.production_plan_products where plan_id=p.id and product_id=(x->>'product_id')::uuid) then raise exception 'Invalid plan product.'; end if;
    insert into public.production_plan_allocations(plan_id,product_id,branch_id,suggested_qty,approved_qty,minimum_qty,event_qty,evidence)
    values(p.id,(x->>'product_id')::uuid,(x->>'branch_id')::uuid,(x->>'suggested_qty')::numeric,(x->>'approved_qty')::numeric,(x->>'minimum_qty')::numeric,(x->>'event_qty')::numeric,x->'evidence') returning * into al;
   elsif al.plan_id is null then raise exception 'Invalid plan allocation.'; end if;
   perform public.planning_validate_route(p.company_id,p.kitchen_id,al.branch_id,p.delivery_date);
   if p_action='recalculate' then
    update public.production_plan_allocations set suggested_qty=(x->>'suggested_qty')::numeric,evidence=x->'evidence',
    approved_qty=case when reason='' then (x->>'approved_qty')::numeric else approved_qty end,
    minimum_qty=(x->>'minimum_qty')::numeric,event_qty=(x->>'event_qty')::numeric where plan_id=p.id and product_id=al.product_id and branch_id=al.branch_id;
   else
    qty:=(x->>'approved_qty')::numeric;
    if qty is null or qty<0 then raise exception 'Every allocation needs a non-negative quantity.'; end if;
    if qty is distinct from al.suggested_qty and length(trim(coalesce(x->>'reason','')))=0 then raise exception 'Give a reason for changing the system suggestion.'; end if;
    update public.production_plan_allocations set approved_qty=qty,reason=coalesce(x->>'reason','') where plan_id=p.id and product_id=al.product_id and branch_id=al.branch_id;
   end if;
  end loop;
  for x in select value from jsonb_array_elements(p_payload->'product_lines') loop
   if p_action='recalculate' then
    update public.production_plan_products set trays=case when reason='' then (x->>'trays')::integer else trays end,yield_per_tray=(x->>'yield_per_tray')::numeric,event_qty=(x->>'event_qty')::numeric where plan_id=p.id and product_id=(x->>'product_id')::uuid;
   else
    if (x->>'trays')::numeric<>trunc((x->>'trays')::numeric) then raise exception 'Trays must be whole numbers.'; end if;
    update public.production_plan_products set trays=(x->>'trays')::integer,retained_qty=(x->>'retained_qty')::numeric,reason=coalesce(x->>'reason','') where plan_id=p.id and product_id=(x->>'product_id')::uuid;
   end if;
  end loop;
  if p_action='recalculate' then update public.production_plans set events=p_payload->'events',holidays=p_payload->'holidays' where id=p.id; end if;
 elsif p_action in ('submit','approve') then
  if (p_action='submit' and p.status<>'draft') or (p_action='approve' and p.status<>'submitted') then raise exception 'Invalid approval state.'; end if;
  if p.events is distinct from coalesce((select jsonb_agg(to_jsonb(e) order by e.id) from public.production_planning_events e where e.company_id=p.company_id and e.kitchen_id=p.kitchen_id and e.event_date=p.delivery_date and e.confirmed),'[]'::jsonb) then raise exception 'Confirmed events changed. Recalculate before review.'; end if;
  if not exists(select 1 from public.production_plan_products where plan_id=p.id) then raise exception 'No products in plan.'; end if;
  for al in select * from public.production_plan_allocations where plan_id=p.id loop
   perform public.planning_validate_route(p.company_id,p.kitchen_id,al.branch_id,p.delivery_date);
   if al.approved_qty<al.event_qty then raise exception 'Allocation cannot be less than the confirmed event quantity.'; end if;
   if not exists(select 1 from public.production_outlet_minimums m where m.kitchen_id=p.kitchen_id and m.branch_id=al.branch_id and m.product_id=al.product_id and m.minimum_qty=al.minimum_qty) then raise exception 'Outlet minimum changed or is unconfirmed. Recalculate the draft.'; end if;
   if al.approved_qty is null or al.minimum_qty is null then raise exception 'Complete manual quantities and confirm outlet minimums first.'; end if;
   if (al.approved_qty<al.minimum_qty+al.event_qty or al.approved_qty<coalesce((al.evidence->>'reductionFloor')::numeric,0)+al.event_qty) and length(trim(al.reason))=0 then raise exception 'Below the minimum or gradual-reduction limit. A Manager reason is required.'; end if;
  end loop;
  for pr in select * from public.production_plan_products where plan_id=p.id loop
   if not exists(select 1 from public.production_batch_rules b where b.kitchen_id=p.kitchen_id and b.product_id=pr.product_id and b.yield_per_tray=pr.yield_per_tray) then raise exception 'Batch yield changed or is unconfigured. Recalculate the draft.'; end if;
   select coalesce(sum(approved_qty),0)+pr.event_qty into total from public.production_plan_allocations where plan_id=p.id and product_id=pr.product_id;
   if pr.yield_per_tray is null or pr.trays is null or pr.trays*pr.yield_per_tray<>total+pr.retained_qty then raise exception 'Allocate all whole-tray output or explicitly retain the remainder in the kitchen.'; end if;
   if pr.retained_qty>0 and length(trim(pr.reason))=0 then raise exception 'A reason is required for kitchen retention.'; end if;
  end loop;
  if p_action='approve' then
   if not exists(select 1 from public.production_planning_settings where kitchen_id=p.kitchen_id and cardinality(recipients)>0) then raise exception 'Configure kitchen email recipients before release.'; end if;
   update public.production_plans set status='superseded' where kitchen_id=p.kitchen_id and delivery_date=p.delivery_date and status='approved';
   update public.production_plans set status='approved',approved_by=a.id,approved_at=now() where id=p.id;
   perform public.planning_queue_release(p.id);
  else update public.production_plans set status='submitted' where id=p.id; end if;
 elsif p_action='return' then
  if p.status<>'submitted' or length(trim(coalesce(p_payload->>'reason','')))=0 then raise exception 'Submitted plan and return reason required.'; end if;
  update public.production_plans set status='draft' where id=p.id;
 else raise exception 'Invalid plan action.';
 end if;
 update public.production_plans set revision=revision+1 where id=p.id;
 result:=jsonb_build_object('id',coalesce(new_id,p.id));
 insert into public.production_planning_requests values(a.company_id,p_key,p_action,jsonb_build_object('plan',p_plan_id,'revision',p_revision,'payload',p_payload),result,now());
 insert into public.production_planning_audit(company_id,plan_id,operation,actor_id,payload) values(p.company_id,p.id,p_action,a.id,p_payload);
 return result;
end $$;

-- Serialize the outlet/date across kitchens, retries and concurrent outlet saves.
create function public.sync_production_do_daily(p_company uuid,p_branch uuid,p_date date,p_kitchen uuid,p_actor uuid,p_rebuild boolean default false,p_reason text default null) returns uuid
language plpgsql set search_path=public as $$
declare r public.outlet_daily_records%rowtype; old_id uuid; rid uuid; x record; begin
 perform pg_advisory_xact_lock(hashtextextended(p_company::text||p_branch::text||p_date::text,2));
 select * into r from public.outlet_daily_records where company_id=p_company and branch_id=p_branch and record_date=p_date and status<>'void' for update;
 if r.status='reviewed' then
  if not p_rebuild or not public.has_permission('outlet_daily_record.void') or not public.has_permission('outlet_daily_record.post') or length(trim(coalesce(p_reason,'')))=0 then raise exception 'Posted daily record is locked. Use controlled correction with a reason.'; end if;
  old_id:=r.id; rid:=gen_random_uuid();
  update public.outlet_daily_records set status='void',void_reason=p_reason,voided_by=p_actor,voided_at=now(),updated_by=p_actor where id=old_id;
  insert into public.outlet_daily_records select (jsonb_populate_record(null::public.outlet_daily_records,to_jsonb(r)||jsonb_build_object('id',rid,'status','evening_completed','reviewed_by',null,'reviewed_at',null,'created_by',p_actor,'updated_by',p_actor,'created_at',now(),'updated_at',now(),'void_reason',null,'voided_by',null,'voided_at',null))).*;
  insert into public.outlet_daily_record_lines select (jsonb_populate_record(null::public.outlet_daily_record_lines,to_jsonb(l)||jsonb_build_object('id',gen_random_uuid(),'record_id',rid,'created_at',now(),'updated_at',now()))).* from public.outlet_daily_record_lines l where record_id=old_id;
  insert into public.outlet_daily_sales_breakdowns select (jsonb_populate_record(null::public.outlet_daily_sales_breakdowns,to_jsonb(s)||jsonb_build_object('id',gen_random_uuid(),'record_id',rid,'created_at',now(),'updated_at',now()))).* from public.outlet_daily_sales_breakdowns s where record_id=old_id;
  -- Relink valid DOs, retaining the old daily record and its lines as audit evidence.
  update public.production_delivery_orders set daily_record_id=rid where company_id=p_company and branch_id=p_branch and delivery_date=p_date and status='confirmed';
 elsif r.id is null then
  insert into public.outlet_daily_records(company_id,branch_id,source_branch_id,record_date,status,created_by,updated_by)
  values(p_company,p_branch,p_kitchen,p_date,'draft',p_actor,p_actor) returning id into rid;
 else rid:=r.id; end if;
 perform set_config('seri.planning_sync','on',true);
 -- Include explicit zero sent for every active food product, so the outlet can confirm true zero receipts.
 for x in select p.id,coalesce(sum(dl.qty),0) qty from public.products p
 left join public.production_delivery_order_lines dl on dl.product_id=p.id and exists(select 1 from public.production_delivery_orders d where d.id=dl.do_id and d.company_id=p_company and d.branch_id=p_branch and d.delivery_date=p_date and d.status='confirmed')
 where p.company_id=p_company and p.deleted_at is null and (p.status='active' or exists(select 1 from public.outlet_daily_record_lines l where l.record_id=rid and l.product_id=p.id))
 and lower(p.category)<>'packaging' group by p.id loop
  insert into public.outlet_daily_record_lines(record_id,product_id,qty_sent,qty_sent_confirmed,qty_sent_source,do_managed,morning_received_qty,morning_received_provided)
  values(rid,x.id,x.qty,true,'authorized_confirmed',true,0,false)
  on conflict(record_id,product_id) do update set qty_sent=excluded.qty_sent,qty_sent_confirmed=true,qty_sent_source='authorized_confirmed',do_managed=true;
 end loop;
 perform set_config('seri.planning_sync','off',true);
 update public.production_delivery_orders set daily_record_id=rid where company_id=p_company and branch_id=p_branch and delivery_date=p_date and status='confirmed';
 return rid;
end $$;

create function public.confirm_production_dispatch(p_plan_id uuid,p_revision integer,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; p public.production_plans%rowtype; prior public.production_planning_requests%rowtype;
 dest jsonb; x jsonb; product public.products%rowtype; pr public.production_plan_products%rowtype; sequence_no integer;
 bid uuid; eid uuid; did uuid; rid uuid; total numeric; qty numeric; planned numeric; result jsonb:='[]'; reason text; begin
 a:=public.planning_require_manager('production_planning.dispatch');
 if p_key is null then raise exception 'Idempotency key required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||p_key::text,1));
 select * into prior from public.production_planning_requests where company_id=a.company_id and request_key=p_key;
 if prior.request_key is not null then
  if prior.operation<>'dispatch' or prior.request_payload<>jsonb_build_object('plan',p_plan_id,'revision',p_revision,'payload',p_payload) then raise exception 'Idempotency key already used for different input.'; end if;
  return prior.result;
 end if;
 select * into p from public.production_plans where id=p_plan_id and company_id=a.company_id for update;
 if p.id is null or p.status<>'approved' or p.revision<>p_revision then raise exception 'Current approved version required. Reload before confirming.'; end if;
 if jsonb_typeof(p_payload->'destinations')<>'array' or jsonb_array_length(p_payload->'destinations')=0 then raise exception 'At least one delivery required.'; end if;
 -- Lock all destinations in deterministic order before any mutation.
 for dest in select value from jsonb_array_elements(p_payload->'destinations') order by value->>'branch_id',value->>'event_id' loop
  bid:=(dest->>'branch_id')::uuid;
  if bid is not null then perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||bid::text||p.delivery_date::text,2)); end if;
 end loop;
 for x in select value from jsonb_array_elements(p_payload->'production') loop
  qty:=(x->>'actual_qty')::numeric;
  select * into pr from public.production_plan_products where plan_id=p.id and product_id=(x->>'product_id')::uuid;
  if pr.plan_id is null or qty is null or qty<0 then raise exception 'Invalid actual production.'; end if;
  if qty is distinct from pr.trays*pr.yield_per_tray and length(trim(coalesce(x->>'reason','')))=0 then raise exception 'Actual production differs from approved output. Give a reason.'; end if;
  update public.production_plan_products set actual_qty=qty where plan_id=p.id and product_id=pr.product_id;
 end loop;
 for dest in select value from jsonb_array_elements(p_payload->'destinations') order by value->>'branch_id',value->>'event_id' loop
  bid:=(dest->>'branch_id')::uuid; eid:=(dest->>'event_id')::uuid; reason:=nullif(trim(dest->>'reason'),'');
  if (bid is null)=(eid is null) then raise exception 'Select an outlet or an independent event.'; end if;
  if bid is not null then
   perform public.planning_validate_route(p.company_id,p.kitchen_id,bid,p.delivery_date);
   if exists(select 1 from public.outlet_daily_records r join public.outlet_daily_record_lines l on l.record_id=r.id where r.company_id=p.company_id and r.branch_id=bid and r.record_date=p.delivery_date and r.status<>'void' and l.qty_sent_confirmed and not l.do_managed and l.qty_sent>0) and reason is null then raise exception 'Existing manual Qty Sent must be reconciled in the first DO. Give a reason confirming the complete dispatch.'; end if;
  elsif not exists(select 1 from jsonb_array_elements(p.events) e where (e->>'id')::uuid=eid and (e->>'branch_id') is null and (e->>'confirmed')::boolean) then raise exception 'Confirmed independent event must be included in the approved version.'; end if;
  if length(trim(coalesce(dest->>'prepared_by','')))=0 then raise exception 'Prepared by is required.'; end if;
  insert into public.production_delivery_sequences(company_id,delivery_date,last_number) values(p.company_id,p.delivery_date,1)
  on conflict(company_id,delivery_date) do update set last_number=production_delivery_sequences.last_number+1 returning last_number into sequence_no;
  insert into public.production_delivery_orders(company_id,plan_id,kitchen_id,branch_id,event_id,delivery_date,plan_version,do_no,prepared_by,driver,vehicle,yellow_trays,silver_trays,reason,created_by)
  values(p.company_id,p.id,p.kitchen_id,bid,eid,p.delivery_date,p.version,
  'DO-'||to_char(p.delivery_date,'YYYYMMDD')||'-'||lpad(sequence_no::text,5,'0'),
  dest->>'prepared_by',coalesce(dest->>'driver',''),coalesce(dest->>'vehicle',''),coalesce((dest->>'yellow_trays')::integer,0),coalesce((dest->>'silver_trays')::integer,0),reason,a.id) returning id into did;
  if jsonb_typeof(dest->'lines')<>'array' or jsonb_array_length(dest->'lines')=0 then raise exception 'Delivery lines required.'; end if;
  for x in select value from jsonb_array_elements(dest->'lines') loop
   select * into product from public.products where id=(x->>'product_id')::uuid and company_id=p.company_id and deleted_at is null and lower(category)<>'packaging';
   qty:=(x->>'qty')::numeric;
   if product.id is null or qty is null or qty<0 or not exists(select 1 from public.production_plan_products where plan_id=p.id and product_id=product.id) then raise exception 'Invalid delivery product or quantity.'; end if;
   if bid is not null then select approved_qty into planned from public.production_plan_allocations where plan_id=p.id and branch_id=bid and product_id=product.id;
   else select (l->>'qty')::numeric into planned from jsonb_array_elements(p.events) e cross join lateral jsonb_array_elements(e->'lines') l where (e->>'id')::uuid=eid and (l->>'product_id')::uuid=product.id; end if;
   if planned is null then raise exception 'Product is not allocated to this destination.'; end if;
   select coalesce(sum(dl.qty),0) into total from public.production_delivery_orders d join public.production_delivery_order_lines dl on dl.do_id=d.id
   where d.company_id=p.company_id and d.kitchen_id=p.kitchen_id and d.delivery_date=p.delivery_date and d.status='confirmed' and dl.product_id=product.id and (d.branch_id=bid or d.event_id=eid);
   if (qty+total is distinct from planned or total>0) and reason is null then raise exception 'Actual or additional dispatch differs from the approved allocation. Give a reason.'; end if;
   insert into public.production_delivery_order_lines values(did,product.id,qty,product.product_code,product.product_name,product.category,product.selling_unit,product.display_order);
  end loop;
  if bid is not null then
   rid:=public.sync_production_do_daily(p.company_id,bid,p.delivery_date,p.kitchen_id,a.id,false,null);
   update public.production_delivery_orders set daily_record_id=rid where id=did;
  end if;
  insert into public.notifications(company_id,recipient_role_id,branch_id,title,message,action_url,entity_type,entity_id,created_by)
  select p.company_id,r.id,bid,'Delivery order confirmed','DO-'||to_char(p.delivery_date,'YYYYMMDD')||'-'||lpad(sequence_no::text,5,'0')||' · Confirm actual Received and Wastage independently.',
  '/production/delivery-orders/'||did,'production_delivery_order',did,a.id from public.roles r
  where bid is not null and r.company_id=p.company_id and r.role_code in ('outlet_staff','outlet_supervisor') and r.status='active' and r.deleted_at is null;
  result:=result||jsonb_build_array(did);
 end loop;
 -- Total valid dispatch for this day (including previous plan versions) cannot exceed actual output.
 for pr in select * from public.production_plan_products where plan_id=p.id loop
  select coalesce(sum(dl.qty),0) into total from public.production_delivery_orders d join public.production_delivery_order_lines dl on dl.do_id=d.id
  where d.company_id=p.company_id and d.kitchen_id=p.kitchen_id and d.delivery_date=p.delivery_date and d.status='confirmed' and dl.product_id=pr.product_id;
  if pr.actual_qty is null or total>pr.actual_qty then raise exception 'Confirm actual production; total dispatch cannot exceed actual output.'; end if;
 end loop;
 update public.production_plans set revision=revision+1 where id=p.id;
 insert into public.production_planning_requests values(a.company_id,p_key,'dispatch',jsonb_build_object('plan',p_plan_id,'revision',p_revision,'payload',p_payload),result,now());
 insert into public.production_planning_audit(company_id,plan_id,operation,actor_id,payload) values(p.company_id,p.id,'dispatch',a.id,p_payload);
 return result;
end $$;

create function public.void_production_delivery(p_do_id uuid,p_reason text,p_rebuild boolean,p_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; d public.production_delivery_orders%rowtype; prior public.production_planning_requests%rowtype; rid uuid; result jsonb; payload jsonb;
begin
 a:=public.planning_require_manager('production_planning.dispatch');
 if p_key is null or length(trim(coalesce(p_reason,'')))=0 then raise exception 'Correction reason and idempotency key required.'; end if;
 payload:=jsonb_build_object('do',p_do_id,'reason',p_reason,'rebuild',p_rebuild);
 perform pg_advisory_xact_lock(hashtextextended(a.company_id::text||p_key::text,1));
 select * into prior from public.production_planning_requests where company_id=a.company_id and request_key=p_key;
 if prior.request_key is not null then
  if prior.operation<>'void_delivery' or prior.request_payload<>payload then raise exception 'Idempotency key already used.'; end if;
  return prior.result;
 end if;
 select * into d from public.production_delivery_orders where id=p_do_id and company_id=a.company_id;
 if d.id is null then raise exception 'Delivery not found.'; end if;
 -- Same lock order as dispatch: plan, then outlet/day, then DO.
 perform 1 from public.production_plans where id=d.plan_id for update;
 if d.branch_id is not null then perform pg_advisory_xact_lock(hashtextextended(d.company_id::text||d.branch_id::text||d.delivery_date::text,2)); end if;
 select * into d from public.production_delivery_orders where id=p_do_id for update;
 if d.status<>'confirmed' then raise exception 'Delivery already void.'; end if;
 update public.production_delivery_orders set status='void',void_reason=trim(p_reason),voided_by=a.id,voided_at=now() where id=d.id;
 if d.branch_id is not null then rid:=public.sync_production_do_daily(d.company_id,d.branch_id,d.delivery_date,d.kitchen_id,a.id,p_rebuild,p_reason); end if;
 result:=jsonb_build_object('daily_record_id',rid);
 insert into public.production_planning_requests values(a.company_id,p_key,'void_delivery',payload,result,now());
 insert into public.production_planning_audit(company_id,plan_id,operation,actor_id,payload) values(d.company_id,d.plan_id,'void_delivery',a.id,payload||result);
 return result;
end $$;

-- Independent queue claims are service-only and lease-based for crash recovery.
create function public.claim_production_emails(p_limit integer default 20) returns setof public.production_planning_email_queue
language sql security definer set search_path=public as $$
 update public.production_planning_email_queue q set status='sending',attempts=attempts+1,locked_until=now()+interval '5 minutes'
 where id in(select id from public.production_planning_email_queue where
 ((status in ('pending','failed') and next_attempt_at<=now()) or (status='sending' and locked_until<now())) and attempts<10
 order by created_at for update skip locked limit least(greatest(p_limit,1),50)) returning q.*
$$;

-- Private helpers must never be callable directly through PostgREST.
revoke all on function public.planning_require_manager(text),public.planning_validate_kitchen(uuid,uuid),public.planning_validate_route(uuid,uuid,uuid,date),public.planning_queue_release(uuid),public.sync_production_do_daily(uuid,uuid,date,uuid,uuid,boolean,text),public.guard_do_managed_sent() from public,anon,authenticated;
revoke all on function public.configure_production_planning(jsonb),public.save_production_event(jsonb),public.create_production_plan(jsonb,uuid),public.update_production_plan(uuid,integer,text,jsonb,uuid),public.confirm_production_dispatch(uuid,integer,jsonb,uuid),public.void_production_delivery(uuid,text,boolean,uuid),public.claim_production_emails(integer) from public,anon,authenticated;
grant execute on function public.configure_production_planning(jsonb),public.save_production_event(jsonb),public.create_production_plan(jsonb,uuid),public.update_production_plan(uuid,integer,text,jsonb,uuid),public.confirm_production_dispatch(uuid,integer,jsonb,uuid),public.void_production_delivery(uuid,text,boolean,uuid) to authenticated;
grant execute on function public.create_production_plan(jsonb,uuid),public.claim_production_emails(integer) to service_role;
notify pgrst,'reload schema';
create function public.retry_production_emails(p_plan_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare a public.staffs%rowtype; begin
 a:=public.planning_require_manager('production_planning.manage');
 update public.production_planning_email_queue set status='pending',attempts=0,next_attempt_at=now(),locked_until=null
 where plan_id=p_plan_id and company_id=a.company_id and status='failed';
end $$;
revoke all on function public.retry_production_emails(uuid) from public,anon;
grant execute on function public.retry_production_emails(uuid) to authenticated;
