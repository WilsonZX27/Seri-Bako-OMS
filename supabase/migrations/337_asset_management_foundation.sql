-- Independent asset ledger. No stock, procurement or production quantities change.
insert into public.permissions(permission_code,module,action,description) values
 ('assets.view','assets','view','Read assets at accessible locations'),
 ('assets.view_all','assets','view_all','Read all company asset locations'),
 ('assets.manage','assets','manage','Maintain asset master data'),
 ('assets.check','assets','check','Submit checks for accessible asset locations'),
 ('assets.maintenance','assets','maintenance','Report and update asset maintenance'),
 ('assets.transfer','assets','transfer','Request, dispatch and receive asset transfers'),
 ('assets.approve','assets','approve','Approve or reject asset transfers')
on conflict(permission_code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where p.module='assets'
 and (r.role_code in ('super_admin','manager') or
 (r.role_code in ('kitchen','outlet_supervisor','outlet_staff') and p.action in ('view','check','maintenance','transfer')) or
 (r.role_code in ('finance','purchasing') and p.action in ('view','view_all')))
on conflict do nothing;

create table public.asset_import_batches (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 source_sha256 text not null, imported_at timestamptz not null default now(),
 reconciliation jsonb not null, state text not null default 'rehearsal' check(state in ('rehearsal','verified','live','superseded')),
 unique(company_id,source_sha256), unique(company_id,id)
);
create table public.asset_locations (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 created_at timestamptz not null default now(), source_name text not null, branch_id uuid references public.branches(id),
 kind text not null check(kind in ('branch','event')), unique(company_id,source_name), unique(company_id,id),
 check((kind='branch' and branch_id is not null) or (kind='event' and branch_id is null))
);
create table public.assets (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 asset_code text not null, item_name text not null, source_data jsonb not null default '{}', current_details jsonb not null default '{}',
 import_batch_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,asset_code), unique(company_id,id),
 foreign key(company_id,import_batch_id) references public.asset_import_batches(company_id,id)
);
create unique index asset_code_case_unique on public.assets(company_id,lower(asset_code));
create table public.asset_master_updates (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,asset_id uuid not null,
 source_id text not null,author_name text not null,source_data jsonb not null,created_at timestamptz not null default now(),
 unique(company_id,source_id),foreign key(company_id,asset_id) references public.assets(company_id,id)
);
create table public.asset_holdings (
 id uuid not null unique default gen_random_uuid(), created_at timestamptz not null default now(),
 company_id uuid not null, asset_id uuid not null, location_id uuid not null,
 quantity integer check(quantity>=0), condition text, status text,
 latest_check_date date, latest_check_result text, latest_check_remark text,
 updated_at timestamptz not null default now(),
 primary key(asset_id,location_id),
 foreign key(company_id,asset_id) references public.assets(company_id,id),
 foreign key(company_id,location_id) references public.asset_locations(company_id,id)
);
create table public.asset_maintenance (
 id uuid primary key default gen_random_uuid(),company_id uuid not null, asset_id uuid not null, location_id uuid not null,
 source_id text not null, status text not null, priority text not null, description text not null,
 author_name text not null, source_data jsonb not null default '{}', created_at timestamptz not null default now(),
 unique(company_id,source_id),unique(company_id,id),
 foreign key(company_id,asset_id) references public.assets(company_id,id),
 foreign key(company_id,location_id) references public.asset_locations(company_id,id)
);
create table public.asset_maintenance_updates (
 id uuid primary key default gen_random_uuid(),company_id uuid not null, maintenance_id uuid not null,
 source_id text not null, author_name text not null, source_data jsonb not null, created_at timestamptz not null default now(),
 unique(company_id,source_id),foreign key(company_id,maintenance_id) references public.asset_maintenance(company_id,id)
);
create table public.asset_daily_checks (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,asset_id uuid not null,location_id uuid not null,
 source_key text not null, submission_id text not null, check_date date not null, result text not null,
 quantity integer check(quantity>=0),author_name text not null,source_data jsonb not null default '{}',
 created_at timestamptz not null default now(),unique(company_id,source_key),
 foreign key(company_id,asset_id) references public.assets(company_id,id),
 foreign key(company_id,location_id) references public.asset_locations(company_id,id)
);
create table public.asset_transfers (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,asset_id uuid not null,
 from_location_id uuid not null,to_location_id uuid not null,quantity integer not null check(quantity>0),
 status text not null default 'requested' check(status in ('requested','approved','rejected','dispatched','received')),
 reason text not null,requested_by uuid references public.staffs(id),author_name text not null,
 approved_by uuid references public.staffs(id),dispatched_by uuid references public.staffs(id),received_by uuid references public.staffs(id),
 source_id text,client_key uuid,source_data jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(company_id,source_id),unique(company_id,client_key),unique(company_id,id),check(from_location_id<>to_location_id),
 foreign key(company_id,asset_id) references public.assets(company_id,id),
 foreign key(company_id,from_location_id) references public.asset_locations(company_id,id),
 foreign key(company_id,to_location_id) references public.asset_locations(company_id,id)
);
create table public.asset_transfer_updates (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,transfer_id uuid not null,
 source_id text not null,author_name text not null,source_data jsonb not null,created_at timestamptz not null default now(),
 unique(company_id,source_id),foreign key(company_id,transfer_id) references public.asset_transfers(company_id,id)
);
create table public.asset_attachments (
 id uuid primary key default gen_random_uuid(),company_id uuid not null,asset_id uuid not null,
 maintenance_id uuid, location_id uuid,
 created_at timestamptz not null default now(), source_key text not null,source_data jsonb not null,url text not null,storage_path text,
 verified_at timestamptz,content_sha256 text,unique(company_id,source_key),
 foreign key(company_id,asset_id) references public.assets(company_id,id),
 foreign key(company_id,maintenance_id) references public.asset_maintenance(company_id,id),
 foreign key(company_id,location_id) references public.asset_locations(company_id,id)
);
create function public.asset_attachment_parent_guard() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$ begin
 if new.maintenance_id is not null and not exists(select 1 from public.asset_maintenance m where m.company_id=new.company_id and m.id=new.maintenance_id and m.asset_id=new.asset_id and m.location_id=new.location_id) then raise exception 'Attachment maintenance, asset or location mismatch'; end if;
 return new;
end $$;
revoke all on function public.asset_attachment_parent_guard() from public,anon,authenticated;
create trigger asset_attachment_parent before insert or update on public.asset_attachments for each row execute function public.asset_attachment_parent_guard();
create index asset_attachments_asset_idx on public.asset_attachments(company_id,asset_id);
create index asset_attachments_maintenance_idx on public.asset_attachments(company_id,maintenance_id);
create table public.asset_suppliers (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),
 created_at timestamptz not null default now(), source_id text not null,source_data jsonb not null,unique(company_id,source_id)
);
create table public.asset_calendar_days (
 id uuid primary key default gen_random_uuid(), company_id uuid not null, location_id uuid not null,
 business_date date not null, is_open boolean not null, reason text not null check(length(trim(reason))>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid not null references public.staffs(id), updated_by uuid not null references public.staffs(id), history jsonb not null default '[]',
 unique(company_id,location_id,business_date),
 foreign key(company_id,location_id) references public.asset_locations(company_id,id)
);
create index asset_holdings_location_idx on public.asset_holdings(company_id,location_id);
create index asset_checks_location_date_idx on public.asset_daily_checks(company_id,location_id,check_date desc);
create index asset_checks_company_date_idx on public.asset_daily_checks(company_id,check_date desc,id desc);
create index asset_maintenance_source_date_idx on public.asset_maintenance(company_id,(source_data->>'Created Date') desc,id desc);
create index asset_maintenance_location_idx on public.asset_maintenance(company_id,location_id,status);
create index asset_transfer_reservations_idx on public.asset_transfers(asset_id,from_location_id,status);

create function public.asset_company_live(p_company uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select p_company=public.current_staff_company_id() and exists(select 1 from public.asset_import_batches b where b.company_id=p_company and b.state='live') $$;
revoke all on function public.asset_company_live(uuid) from public,anon;
grant execute on function public.asset_company_live(uuid) to authenticated;

create function public.asset_location_access(p_location uuid) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.asset_locations l where l.id=p_location and l.company_id=public.current_staff_company_id()
 and exists(select 1 from public.asset_import_batches b where b.company_id=l.company_id and b.state='live')
 and public.has_permission('assets.view') and (public.has_permission('assets.view_all') or
 (l.kind='branch' and exists(select 1 from public.staffs s where s.id=public.current_staff_id()
 and s.company_id=l.company_id and (s.default_branch_id=l.branch_id or exists(select 1 from public.staff_branches sb where sb.staff_id=s.id and sb.branch_id=l.branch_id))))))
$$;
-- Locations may only point into the same company, including privileged imports.
create function public.asset_location_company_guard() returns trigger
language plpgsql set search_path=pg_catalog,public as $$ begin
 if new.branch_id is not null and not exists(select 1 from public.branches b where b.id=new.branch_id and b.company_id=new.company_id) then raise exception 'Asset branch company mismatch'; end if;
 return new; end $$;
create trigger asset_location_company before insert or update on public.asset_locations for each row execute function public.asset_location_company_guard();

do $$ declare t text; begin
 foreach t in array array['asset_import_batches','asset_locations','assets','asset_master_updates','asset_holdings','asset_maintenance','asset_maintenance_updates','asset_daily_checks','asset_transfers','asset_transfer_updates','asset_attachments','asset_suppliers','asset_calendar_days'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create policy asset_locations_read on public.asset_locations for select to authenticated using(public.asset_location_access(id));
create policy asset_holdings_read on public.asset_holdings for select to authenticated using(company_id=public.current_staff_company_id() and public.asset_location_access(location_id));
create policy assets_read on public.assets for select to authenticated using(company_id=public.current_staff_company_id() and public.asset_company_live(company_id)
 and public.has_permission('assets.view') and (public.has_permission('assets.view_all') or exists(select 1 from public.asset_holdings h where h.asset_id=assets.id) or exists(select 1 from public.asset_transfers t where t.asset_id=assets.id)));
create policy asset_maintenance_read on public.asset_maintenance for select to authenticated using(company_id=public.current_staff_company_id() and public.asset_location_access(location_id));
create policy asset_maintenance_updates_read on public.asset_maintenance_updates for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.asset_maintenance m where m.id=maintenance_id));
create policy asset_checks_read on public.asset_daily_checks for select to authenticated using(company_id=public.current_staff_company_id() and public.asset_location_access(location_id));
create policy asset_transfers_read on public.asset_transfers for select to authenticated using(company_id=public.current_staff_company_id() and (public.asset_location_access(from_location_id) or public.asset_location_access(to_location_id)));
create policy asset_transfer_updates_read on public.asset_transfer_updates for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.asset_transfers t where t.id=transfer_id));
create policy asset_attachments_read on public.asset_attachments for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.assets a where a.id=asset_id) and (location_id is null or public.asset_location_access(location_id)) and (maintenance_id is null or exists(select 1 from public.asset_maintenance m where m.id=maintenance_id)));
create policy asset_suppliers_read on public.asset_suppliers for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('assets.manage'));
create policy asset_batches_read on public.asset_import_batches for select to authenticated using(company_id=public.current_staff_company_id() and public.has_permission('assets.manage'));
create policy asset_calendar_read on public.asset_calendar_days for select to authenticated using(company_id=public.current_staff_company_id() and public.asset_location_access(location_id));
create policy asset_master_updates_read on public.asset_master_updates for select to authenticated using(company_id=public.current_staff_company_id() and exists(select 1 from public.assets a where a.id=asset_id));

create function public.asset_master_details_valid(p_details jsonb) returns boolean
language plpgsql immutable set search_path=pg_catalog,public as $$
declare e record; v text;
begin
 if p_details is null or jsonb_typeof(p_details)<>'object' then return false; end if;
 for e in select * from jsonb_each(p_details) loop
  if e.key not in ('Department / Area','Category','Subcategory','Responsible Person','Brand','Model','Serial Number','Purchase Date','Purchase Price','Supplier Name','Supplier Contact','Invoice No','Warranty Start Date','Warranty End Date') or jsonb_typeof(e.value)<>'string' then return false; end if;
  v:=e.value#>>'{}';
  if length(v)>1000 then return false; end if;
  if v<>'' and e.key in ('Purchase Date','Warranty Start Date','Warranty End Date') then
   if v!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or to_char(v::date,'YYYY-MM-DD')<>v then return false; end if;
  end if;
  if v<>'' and e.key='Purchase Price' and v!~'^[0-9]+([.][0-9]{1,2})?$' then return false; end if;
 end loop;
 if coalesce(p_details->>'Warranty Start Date','')<>'' and coalesce(p_details->>'Warranty End Date','')<>'' and p_details->>'Warranty Start Date'>p_details->>'Warranty End Date' then return false; end if;
 return true;
exception when invalid_datetime_format or datetime_field_overflow then return false;
end $$;
create function public.create_asset_master(p_code text,p_name text,p_location uuid,p_quantity integer,p_details jsonb,p_reason text,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); result uuid; existing public.asset_master_updates;
begin
 if not public.has_permission('assets.manage') or not public.asset_location_access(p_location) then raise exception 'Asset master permission denied'; end if;
 if trim(coalesce(p_code,''))!~'^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$' or length(trim(coalesce(p_name,''))) not between 1 and 200 or p_quantity<0 or not public.asset_master_details_valid(p_details) or length(trim(coalesce(p_reason,''))) not between 1 and 2000 or p_client_key is null then raise exception 'Invalid asset master details'; end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||':master:'||p_client_key::text,0));
 select * into existing from public.asset_master_updates where company_id=company and source_id='OMS-'||p_client_key;
 if found then
  if existing.source_data->>'Operation'<>'create' or existing.source_data->>'Code'<>trim(p_code) or existing.source_data->>'Name'<>trim(p_name) or existing.source_data->>'Location'<>p_location::text or existing.source_data->'Quantity' is distinct from coalesce(to_jsonb(p_quantity),'null'::jsonb) or existing.source_data->'Details' is distinct from p_details or existing.source_data->>'Reason'<>trim(p_reason) then raise exception 'Asset creation key reused with different details'; end if;
  return existing.asset_id;
 end if;
 insert into public.assets(company_id,asset_code,item_name,current_details) values(company,trim(p_code),trim(p_name),p_details) returning id into result;
 insert into public.asset_holdings(company_id,asset_id,location_id,quantity,status) values(company,result,p_location,p_quantity,'Active');
 insert into public.asset_master_updates(company_id,asset_id,source_id,author_name,source_data) values(company,result,'OMS-'||p_client_key,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),jsonb_build_object('Operation','create','Code',trim(p_code),'Name',trim(p_name),'Location',p_location,'Location Name',(select source_name from public.asset_locations where id=p_location and company_id=company),'Quantity',p_quantity,'Details',p_details,'Reason',trim(p_reason),'Actor ID',actor));
 return result;
end $$;
create function public.update_asset_master(p_asset uuid,p_name text,p_details jsonb,p_reason text,p_client_key uuid,p_expected_updated_at timestamptz) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare a public.assets; actor uuid:=public.current_staff_id(); existing public.asset_master_updates;
begin
 select * into a from public.assets where id=p_asset and company_id=public.current_staff_company_id() for update;
 if not found or not public.has_permission('assets.manage') or not exists(select 1 from public.asset_holdings h where h.asset_id=a.id and public.asset_location_access(h.location_id)) then raise exception 'Asset master unavailable'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 200 or not public.asset_master_details_valid(p_details) or length(trim(coalesce(p_reason,''))) not between 1 and 2000 or p_client_key is null then raise exception 'Invalid asset master details'; end if;
 select * into existing from public.asset_master_updates where company_id=a.company_id and source_id='OMS-'||p_client_key;
 if found then
  if existing.asset_id<>a.id or existing.source_data->>'Operation'<>'update' or existing.source_data->>'Name After'<>trim(p_name) or existing.source_data->'Details After' is distinct from p_details or existing.source_data->>'Reason'<>trim(p_reason) then raise exception 'Asset update key reused with different details'; end if;
  return a.id;
 end if;
 if p_expected_updated_at is distinct from a.updated_at then raise exception 'Asset master changed; refresh before updating'; end if;
 insert into public.asset_master_updates(company_id,asset_id,source_id,author_name,source_data) values(a.company_id,a.id,'OMS-'||p_client_key,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),jsonb_build_object('Operation','update','Name Before',a.item_name,'Name After',trim(p_name),'Details Before',a.current_details,'Details After',p_details,'Reason',trim(p_reason),'Actor ID',actor));
 update public.assets set item_name=trim(p_name),current_details=p_details,updated_at=clock_timestamp() where id=a.id;
 return a.id;
end $$;
revoke all on function public.create_asset_master(text,text,uuid,integer,jsonb,text,uuid),public.update_asset_master(uuid,text,jsonb,text,uuid,timestamptz) from public,anon;
grant execute on function public.create_asset_master(text,text,uuid,integer,jsonb,text,uuid),public.update_asset_master(uuid,text,jsonb,text,uuid,timestamptz) to authenticated;

create function public.set_asset_operating_day(p_location uuid,p_date date,p_open boolean,p_reason text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result uuid; actor uuid:=public.current_staff_id(); company uuid:=public.current_staff_company_id();
begin
 if not public.has_permission('assets.manage') or not public.asset_location_access(p_location) then raise exception 'Operating day permission denied'; end if;
 if p_date is null or p_date<(now() at time zone 'Asia/Kuala_Lumpur')::date or p_open is null or length(trim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'Choose today or a future date and enter the reason'; end if;
 -- Current override keeps the prior decision and author in its append-only history.
 insert into public.asset_calendar_days(company_id,location_id,business_date,is_open,reason,created_by,updated_by)
 values(company,p_location,p_date,p_open,trim(p_reason),actor,actor)
 on conflict(company_id,location_id,business_date) do update set
 history=public.asset_calendar_days.history||jsonb_build_array(jsonb_build_object('is_open',public.asset_calendar_days.is_open,'reason',public.asset_calendar_days.reason,'updated_at',public.asset_calendar_days.updated_at,'updated_by',public.asset_calendar_days.updated_by)),
 is_open=excluded.is_open,reason=excluded.reason,updated_at=now(),updated_by=actor
 where public.asset_calendar_days.is_open is distinct from excluded.is_open or public.asset_calendar_days.reason is distinct from excluded.reason returning id into result;
 if result is null then select id into result from public.asset_calendar_days where company_id=company and location_id=p_location and business_date=p_date; end if;
 return result;
end $$;
revoke all on function public.set_asset_operating_day(uuid,date,boolean,text) from public,anon;
grant execute on function public.set_asset_operating_day(uuid,date,boolean,text) to authenticated;

create function public.request_asset_transfer(p_asset uuid,p_from uuid,p_to uuid,p_quantity integer,p_reason text,p_client_key uuid default null) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); available integer; reserved bigint; result uuid; existing public.asset_transfers;
begin
 if not public.has_permission('assets.transfer') or not public.asset_location_access(p_from) then raise exception 'Asset transfer permission denied'; end if;
 if p_quantity is null or p_quantity<=0 or p_from=p_to or length(trim(coalesce(p_reason,'')))=0 then raise exception 'Invalid transfer quantity or reason'; end if;
 if not exists(select 1 from public.asset_locations where id=p_to and company_id=company) then raise exception 'Invalid destination'; end if;
 -- Asset-wide transaction lock also prevents opposite-direction receipts from
 -- taking source/destination holding locks in conflicting orders.
 perform pg_advisory_xact_lock(hashtextextended(company::text||':'||p_asset::text,0));
 -- Serialise every reservation and dispatch against the same holding row.
 select quantity into available from public.asset_holdings where company_id=company and asset_id=p_asset and location_id=p_from for update;
 if p_client_key is not null then
  select * into existing from public.asset_transfers where company_id=company and client_key=p_client_key;
  if found then
   if existing.asset_id<>p_asset or existing.from_location_id<>p_from or existing.to_location_id<>p_to or existing.quantity<>p_quantity or existing.reason<>trim(p_reason) or existing.requested_by<>public.current_staff_id() then raise exception 'Transfer request key was reused with different values'; end if;
   return existing.id;
  end if;
 end if;
 -- FOUND may have changed after the idempotence lookup.
 if not exists(select 1 from public.asset_holdings where company_id=company and asset_id=p_asset and location_id=p_from) then raise exception 'Confirm the physical quantity before transferring'; end if;
 if available is null then raise exception 'Confirm the physical quantity before transferring'; end if;
 select coalesce(sum(quantity),0) into reserved from public.asset_transfers where company_id=company and asset_id=p_asset and from_location_id=p_from and status in ('requested','approved');
 if p_quantity>available-reserved then raise exception 'Quantity exceeds unreserved holding'; end if;
 insert into public.asset_transfers(company_id,asset_id,from_location_id,to_location_id,quantity,reason,requested_by,author_name,client_key)
 values(company,p_asset,p_from,p_to,p_quantity,trim(p_reason),public.current_staff_id(),coalesce((select full_name from public.staffs where id=public.current_staff_id()),'OMS staff'),p_client_key) returning id into result;
 return result;
end $$;
create function public.advance_asset_transfer(p_transfer uuid,p_action text,p_note text default '') returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare t public.asset_transfers; previous text; next_status text; actor uuid:=public.current_staff_id(); available integer;
begin
 if length(coalesce(p_note,''))>2000 then raise exception 'Invalid transfer update note'; end if;
 -- Lock holding first to match request lock order; transfer's immutable locations
 -- are read only to locate the lock, then re-read under its own row lock.
 select * into t from public.asset_transfers where id=p_transfer and company_id=public.current_staff_company_id();
 if not found then raise exception 'Asset transfer unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended(t.company_id::text||':'||t.asset_id::text,0));
 perform 1 from public.asset_holdings where asset_id=t.asset_id and location_id=t.from_location_id for update;
 select * into t from public.asset_transfers where id=p_transfer and company_id=public.current_staff_company_id() for update;
 previous:=t.status;
 if p_action in ('approve','reject') then
  if not public.has_permission('assets.approve') or not public.asset_location_access(t.from_location_id) or t.status<>'requested' then raise exception 'Transfer approval unavailable'; end if;
  next_status:=case when p_action='approve' then 'approved' else 'rejected' end;
 elsif p_action='dispatch' then
  if not public.has_permission('assets.transfer') or not public.asset_location_access(t.from_location_id) or t.status<>'approved' then raise exception 'Transfer dispatch unavailable'; end if;
  select quantity into available from public.asset_holdings where asset_id=t.asset_id and location_id=t.from_location_id;
  if available is null or available<t.quantity then raise exception 'Insufficient confirmed holding'; end if;
  update public.asset_holdings set quantity=quantity-t.quantity,updated_at=now() where asset_id=t.asset_id and location_id=t.from_location_id;
  next_status:='dispatched';
 elsif p_action='receive' then
  if not public.has_permission('assets.transfer') or not public.asset_location_access(t.to_location_id) or t.status<>'dispatched' then raise exception 'Transfer receipt unavailable'; end if;
  -- An unknown destination count must not be replaced by the transferred amount.
  if exists(select 1 from public.asset_holdings where asset_id=t.asset_id and location_id=t.to_location_id and quantity is null) then raise exception 'Confirm destination physical quantity before receiving'; end if;
  insert into public.asset_holdings(company_id,asset_id,location_id,quantity) values(t.company_id,t.asset_id,t.to_location_id,t.quantity)
  on conflict(asset_id,location_id) do update set quantity=public.asset_holdings.quantity+excluded.quantity,updated_at=now();
  next_status:='received';
 else raise exception 'Invalid transfer action'; end if;
 update public.asset_transfers set status=next_status,updated_at=now(),approved_by=case when p_action='approve' then actor else approved_by end,dispatched_by=case when p_action='dispatch' then actor else dispatched_by end,received_by=case when p_action='receive' then actor else received_by end where id=t.id;
 insert into public.asset_transfer_updates(company_id,transfer_id,source_id,author_name,source_data) values(t.company_id,t.id,gen_random_uuid()::text,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),jsonb_build_object('Status Before',previous,'Status After',next_status,'Comment',p_note,'Actor ID',actor));
 return t.id;
end $$;
revoke all on function public.asset_location_access(uuid),public.asset_location_company_guard(),public.request_asset_transfer(uuid,uuid,uuid,integer,text,uuid),public.advance_asset_transfer(uuid,text,text) from public,anon;
grant execute on function public.asset_location_access(uuid),public.request_asset_transfer(uuid,uuid,uuid,integer,text,uuid),public.advance_asset_transfer(uuid,text,text) to authenticated;
create function public.get_asset_overview(p_date date default (now() at time zone 'Asia/Kuala_Lumpur')::date) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object(
 'assetCount',(select count(*) from public.assets),
 'knownQuantity',(select coalesce(sum(quantity),0) from public.asset_holdings),
 'unknownHoldings',(select count(*) from public.asset_holdings where quantity is null),
 'attentionAssets',(select count(distinct asset_id) from public.asset_holdings where condition in ('Damaged','Review Required','Needs Maintenance','Missing')),
 'openMaintenance',(select count(*) from public.asset_maintenance where lower(status) not in ('closed','resolved','cancelled')),
 'inTransitQuantity',(select coalesce(sum(quantity),0) from public.asset_transfers where status='dispatched'),
 'checkDate',p_date,
 'checklist',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.source_name,'kind',l.kind,
  'open',coalesce((select d.is_open from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),l.kind='branch'),
  'reason',(select d.reason from public.asset_calendar_days d where d.location_id=l.id and d.business_date=p_date),
  'expected',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0)),
  'checked',(select count(*) from public.asset_holdings h where h.location_id=l.id and (h.quantity is null or h.quantity>0) and exists(select 1 from public.asset_daily_checks c where c.location_id=l.id and c.asset_id=h.asset_id and c.check_date=p_date)))) from public.asset_locations l),'[]'::jsonb),
 'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.source_name,'assetCount',(select count(*) from public.asset_holdings h where h.location_id=l.id),'quantity',(select sum(quantity) from public.asset_holdings h where h.location_id=l.id))) from public.asset_locations l),'[]'::jsonb),
 'maintenanceTrend',coalesce((select jsonb_agg(jsonb_build_object('date',day::date,'count',(select count(*) from public.asset_maintenance m where left(m.source_data->>'Created Date',10)=day::date::text)) order by day) from generate_series((now() at time zone 'Asia/Kuala_Lumpur')::date-13,(now() at time zone 'Asia/Kuala_Lumpur')::date,interval '1 day') day),'[]'::jsonb),
 'issueTrend',coalesce((select jsonb_agg(jsonb_build_object('date',day::date,'checked',(select count(*) from public.asset_daily_checks c where c.check_date=day::date),'count',(select case when count(*)=0 then null else count(*) filter(where c.result<>'Checked') end from public.asset_daily_checks c where c.check_date=day::date)) order by day) from generate_series((now() at time zone 'Asia/Kuala_Lumpur')::date-13,(now() at time zone 'Asia/Kuala_Lumpur')::date,interval '1 day') day),'[]'::jsonb),
 'maintenanceByStatus',coalesce((select jsonb_agg(jsonb_build_object('status',status,'count',n)) from (select status,count(*) n from public.asset_maintenance group by status) s),'[]'::jsonb)
 )
$$;
revoke all on function public.get_asset_overview(date) from public,anon;
grant execute on function public.get_asset_overview(date) to authenticated;
create function public.report_asset_maintenance(p_asset uuid,p_location uuid,p_description text,p_priority text,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); result uuid; existing public.asset_maintenance;
begin
 if not public.has_permission('assets.maintenance') or not public.asset_location_access(p_location) then raise exception 'Maintenance permission denied'; end if;
 if not exists(select 1 from public.asset_holdings where company_id=company and asset_id=p_asset and location_id=p_location and (quantity is null or quantity>0)) then raise exception 'Asset not held at this location'; end if;
 if length(trim(coalesce(p_description,''))) not between 1 and 4000 or p_priority is null or p_priority not in ('Low','Normal','High','Urgent') or p_client_key is null then raise exception 'Invalid maintenance details'; end if;
 select * into existing from public.asset_maintenance where company_id=company and source_id='OMS-'||p_client_key;
 if found then
  if existing.asset_id<>p_asset or existing.location_id<>p_location or existing.description<>trim(p_description) or existing.priority<>p_priority then raise exception 'Maintenance key was reused with different details'; end if;
  return existing.id;
 end if;
 insert into public.asset_maintenance(company_id,asset_id,location_id,source_id,status,priority,description,author_name,source_data)
 values(company,p_asset,p_location,'OMS-'||p_client_key,'Open',p_priority,trim(p_description),coalesce((select full_name from public.staffs where id=public.current_staff_id()),'OMS staff'),jsonb_build_object('Actor ID',public.current_staff_id(),'Created Date',(now() at time zone 'Asia/Kuala_Lumpur')::text)) returning id into result;
 return result;
end $$;
create function public.update_asset_maintenance(p_request uuid,p_status text,p_comment text,p_client_key uuid,p_expected_status text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare m public.asset_maintenance; existing public.asset_maintenance_updates; actor uuid:=public.current_staff_id();
begin
 select * into m from public.asset_maintenance where id=p_request and company_id=public.current_staff_company_id() for update;
 if not found or not public.has_permission('assets.maintenance') or not public.asset_location_access(m.location_id) then raise exception 'Maintenance request unavailable'; end if;
 if p_status is null or p_status not in ('Open','Assigned','Closed','Resolved','Cancelled') or length(trim(coalesce(p_comment,''))) not between 1 and 4000 then raise exception 'Enter a status and update note'; end if;
 if p_client_key is null then raise exception 'Maintenance update key required'; end if;
 select * into existing from public.asset_maintenance_updates where company_id=m.company_id and source_id='OMS-'||p_client_key;
 if found then
  if existing.maintenance_id<>m.id or existing.source_data->>'Status After'<>p_status or existing.source_data->>'Comment'<>trim(p_comment) then raise exception 'Maintenance update key reused with different details'; end if;
  return m.id;
 end if;
 if p_expected_status is distinct from m.status then raise exception 'Maintenance status changed; refresh before updating'; end if;
 if p_status<>m.status and not public.has_permission('assets.manage') then raise exception 'Only an asset manager may change maintenance status'; end if;
 insert into public.asset_maintenance_updates(company_id,maintenance_id,source_id,author_name,source_data) values(m.company_id,m.id,'OMS-'||p_client_key,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),jsonb_build_object('Status Before',m.status,'Status After',p_status,'Comment',trim(p_comment),'Actor ID',actor,'Update Date',(now() at time zone 'Asia/Kuala_Lumpur')::text));
 update public.asset_maintenance set status=p_status where id=m.id;
 return m.id;
end $$;
create function public.submit_asset_check(p_location uuid,p_date date,p_submission uuid,p_lines jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); line jsonb; holding public.asset_holdings; observed integer; existing public.asset_daily_checks; key text;
begin
 if not public.has_permission('assets.check') or not public.asset_location_access(p_location) then raise exception 'Asset checklist permission denied'; end if;
 if p_date is null or p_date>(now() at time zone 'Asia/Kuala_Lumpur')::date or p_submission is null or p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 5000 then raise exception 'Invalid checklist date or lines'; end if;
 if (select count(distinct e->>'asset_id') from jsonb_array_elements(p_lines) e)<>jsonb_array_length(p_lines) then raise exception 'Duplicate checklist asset'; end if;
 for line in select value from jsonb_array_elements(p_lines) order by value->>'asset_id' loop
  select * into holding from public.asset_holdings where company_id=company and asset_id=(line->>'asset_id')::uuid and location_id=p_location for update;
  if not found or coalesce(line->>'result','') not in ('Checked','Damaged','Missing','Needs Maintenance','Other') then raise exception 'Invalid checklist asset or result'; end if;
  observed:=(line->>'quantity')::integer;
  if observed<0 or (line->>'result'<>'Checked' and length(trim(coalesce(line->>'remark','')))=0) then raise exception 'Enter a valid quantity and explain exceptions'; end if;
  if line->>'result'='Checked' and observed is not null and holding.quantity is not null and observed<>holding.quantity then raise exception 'Count differs from registered quantity; record an exception'; end if;
  key:='OMS-'||p_submission||':'||holding.asset_id;
  select * into existing from public.asset_daily_checks where company_id=company and source_key=key;
  if found then
   if existing.location_id<>p_location or existing.check_date<>p_date or existing.result<>line->>'result' or existing.quantity is distinct from observed or existing.source_data->>'remark' is distinct from line->>'remark' then raise exception 'Checklist key was reused with different values'; end if;
   continue;
  end if;
  insert into public.asset_daily_checks(company_id,asset_id,location_id,source_key,submission_id,check_date,result,quantity,author_name,source_data) values(company,holding.asset_id,p_location,key,p_submission::text,p_date,line->>'result',observed,coalesce((select full_name from public.staffs where id=actor),'OMS staff'),line||jsonb_build_object('Actor ID',actor));
  update public.asset_holdings set latest_check_date=p_date,latest_check_result=line->>'result',latest_check_remark=line->>'remark',condition=case line->>'result' when 'Checked' then 'Good' when 'Other' then 'Review Required' else line->>'result' end,updated_at=now() where asset_id=holding.asset_id and location_id=p_location and (latest_check_date is null or latest_check_date<=p_date);
 end loop;
 return p_submission;
end $$;
revoke all on function public.report_asset_maintenance(uuid,uuid,text,text,uuid),public.update_asset_maintenance(uuid,text,text,uuid,text),public.submit_asset_check(uuid,date,uuid,jsonb) from public,anon;
grant execute on function public.report_asset_maintenance(uuid,uuid,text,text,uuid),public.update_asset_maintenance(uuid,text,text,uuid,text),public.submit_asset_check(uuid,date,uuid,jsonb) to authenticated;

create function public.confirm_unknown_asset_quantity(p_asset uuid,p_location uuid,p_quantity integer,p_reason text,p_client_key uuid) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare holding public.asset_holdings; existing public.asset_daily_checks; result uuid; company uuid:=public.current_staff_company_id(); key text:='OMS-COUNT-'||p_client_key;
begin
 if not public.has_permission('assets.manage') or not public.asset_location_access(p_location) then raise exception 'Asset count confirmation denied'; end if;
 if p_quantity is null or p_quantity<0 or p_client_key is null or length(trim(coalesce(p_reason,''))) not between 1 and 2000 then raise exception 'Enter the physical count and confirmation note'; end if;
 select * into holding from public.asset_holdings where company_id=company and asset_id=p_asset and location_id=p_location for update;
 if not found then raise exception 'Asset holding unavailable'; end if;
 select * into existing from public.asset_daily_checks where company_id=company and source_key=key;
 if found then
  if existing.asset_id<>p_asset or existing.location_id<>p_location or existing.quantity<>p_quantity or existing.source_data->>'remark'<>trim(p_reason) then raise exception 'Count key was reused with different values'; end if;
  return existing.id;
 end if;
 if holding.quantity is not null then raise exception 'Quantity already confirmed; registered holdings cannot be overwritten here'; end if;
 insert into public.asset_daily_checks(company_id,asset_id,location_id,source_key,submission_id,check_date,result,quantity,author_name,source_data)
 values(company,p_asset,p_location,key,p_client_key::text,(now() at time zone 'Asia/Kuala_Lumpur')::date,'Checked',p_quantity,coalesce((select full_name from public.staffs where id=public.current_staff_id()),'OMS staff'),jsonb_build_object('remark',trim(p_reason),'Old Quantity',null,'Confirmed Quantity',p_quantity,'Actor ID',public.current_staff_id(),'Count Confirmation',true)) returning id into result;
 update public.asset_holdings set quantity=p_quantity,updated_at=now() where asset_id=p_asset and location_id=p_location;
 return result;
end $$;
revoke all on function public.confirm_unknown_asset_quantity(uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function public.confirm_unknown_asset_quantity(uuid,uuid,integer,text,uuid) to authenticated;

-- Supabase storage is absent in the isolated SQL harness. On Supabase, asset
-- files stay private; only a verified, company-scoped attachment grants a read.
-- No authenticated upload/delete policy is introduced by the legacy import.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit)
   values('asset-documents','asset-documents',false,20971520)
   on conflict(id) do nothing;
  if exists(select 1 from storage.buckets where id='asset-documents' and public) then raise exception 'Asset documents bucket must be private'; end if;
  execute $policy$create policy asset_documents_read on storage.objects for select to authenticated using(
   bucket_id='asset-documents' and exists(select 1 from public.asset_attachments a
    where a.company_id=public.current_staff_company_id() and a.storage_path=name
    and a.verified_at is not null and a.content_sha256 is not null)
  )$policy$;
 end if;
end $$;
-- Reserve a write-once native attachment through the current actor. Storage
-- writes and content verification remain server-only; callers cannot mark
-- an arbitrary URL or storage object verified through the public API.
create function public.reserve_asset_attachment(p_asset uuid,p_key uuid,p_label text,p_kind text,p_type text,p_size integer,p_sha256 text,p_maintenance uuid default null) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare company uuid:=public.current_staff_company_id(); actor uuid:=public.current_staff_id(); row public.asset_attachments; extension text; parent_location uuid;
begin
 if not public.asset_company_live(company) or not (public.has_permission('assets.manage') or (p_maintenance is not null and p_kind='Photo' and public.has_permission('assets.maintenance'))) then raise exception 'Asset attachment permission denied'; end if;
 if p_maintenance is not null then
  select m.location_id into parent_location from public.asset_maintenance m where m.company_id=company and m.id=p_maintenance and m.asset_id=p_asset and public.asset_location_access(m.location_id);
  if not found then raise exception 'Asset attachment permission denied'; end if;
 elsif not exists(select 1 from public.asset_holdings h where h.company_id=company and h.asset_id=p_asset and public.asset_location_access(h.location_id)) then raise exception 'Asset attachment permission denied'; end if;
 if p_key is null or length(trim(coalesce(p_label,''))) not between 1 and 180 or coalesce(p_kind,'') not in ('Photo','Invoice','Warranty','Other') or coalesce(p_type,'') not in ('image/jpeg','image/png','image/webp','application/pdf') or p_size is null or p_size not between 1 and 10485760 or coalesce(p_sha256,'')!~'^[0-9a-f]{64}$' then raise exception 'Invalid asset attachment'; end if;
 perform pg_advisory_xact_lock(hashtextextended(company::text||'/attachment/'||p_key::text,0));
 select * into row from public.asset_attachments where company_id=company and source_key='oms:'||p_key::text;
 if found then
  if row.asset_id<>p_asset or row.maintenance_id is distinct from p_maintenance or row.source_data->>'Actor ID' is distinct from actor::text or row.source_data->>'File Name' is distinct from trim(p_label) or row.source_data->>'Kind' is distinct from p_kind or row.source_data->>'File Type' is distinct from p_type or row.source_data->>'File Size' is distinct from p_size::text or row.source_data->>'Expected SHA256' is distinct from p_sha256 then raise exception 'Attachment key already used with different content'; end if;
 else
  extension:=case p_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' else 'pdf' end;
  row.id:=gen_random_uuid();
  insert into public.asset_attachments(id,company_id,asset_id,maintenance_id,location_id,source_key,source_data,url,storage_path)
  values(row.id,company,p_asset,p_maintenance,parent_location,'oms:'||p_key::text,jsonb_build_object('File Name',trim(p_label),'Kind',p_kind,'File Type',p_type,'File Size',p_size,'Expected SHA256',p_sha256,'Actor ID',actor,'Uploaded By',coalesce((select full_name from public.staffs where id=actor),'OMS staff'),'Origin','OMS upload'),'',''||company::text||'/'||p_asset::text||'/'||row.id::text||'.'||extension) returning * into row;
 end if;
 return jsonb_build_object('id',row.id,'storage_path',row.storage_path,'verified',row.verified_at is not null);
end $$;
revoke all on function public.reserve_asset_attachment(uuid,uuid,text,text,text,integer,text,uuid) from public,anon;
grant execute on function public.reserve_asset_attachment(uuid,uuid,text,text,text,integer,text,uuid) to authenticated;

create function public.verify_native_asset_attachment(p_company uuid,p_attachment uuid,p_path text,p_sha256 text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare row public.asset_attachments;
begin
 select * into row from public.asset_attachments where company_id=p_company and id=p_attachment for update;
 if not found or row.source_data->>'Origin' is distinct from 'OMS upload' or row.storage_path is distinct from p_path or row.source_data->>'Expected SHA256' is distinct from p_sha256 or coalesce(p_sha256,'')!~'^[0-9a-f]{64}$' or not exists(select 1 from storage.objects where bucket_id='asset-documents' and name=p_path) then raise exception 'Attachment verification mismatch'; end if;
 if row.verified_at is not null then
  if row.content_sha256 is distinct from p_sha256 then raise exception 'Attachment verification changed'; end if;
  return true;
 end if;
 update public.asset_attachments set content_sha256=p_sha256,verified_at=now() where id=row.id and company_id=p_company;
 return true;
end $$;
revoke all on function public.verify_native_asset_attachment(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.verify_native_asset_attachment(uuid,uuid,text,text) to service_role;

-- Legacy copies are bound to the exact inactive export and original parent.
-- Only the migration worker may prepare/finalize; neither call activates data.
create function public.legacy_asset_attachment_target(p_company uuid,p_attachment uuid,p_source_sha256 text,p_source_key text,p_url text,p_asset uuid,p_maintenance uuid,p_location uuid,p_type text) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare row public.asset_attachments; extension text; expected text;
begin
 select * into row from public.asset_attachments where company_id=p_company and id=p_attachment for update;
 if not found or row.source_key is distinct from p_source_key or row.url is distinct from p_url or row.asset_id is distinct from p_asset or row.maintenance_id is distinct from p_maintenance or row.location_id is distinct from p_location or row.source_key like 'oms:%' or row.source_data->>'Origin'='OMS upload' then raise exception 'Legacy attachment source mismatch'; end if;
 if coalesce(p_source_sha256,'')!~'^[0-9a-f]{64}$' or not exists(select 1 from public.assets a join public.asset_import_batches b on b.id=a.import_batch_id and b.company_id=a.company_id where a.id=row.asset_id and a.company_id=p_company and b.source_sha256=p_source_sha256 and b.state='rehearsal') then raise exception 'Legacy attachment requires the reviewed inactive source batch'; end if;
 if coalesce(p_type,'') not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'Invalid legacy attachment type'; end if;
 extension:=case p_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' else 'pdf' end;
 expected:=p_company::text||'/'||p_asset::text||'/legacy-'||p_attachment::text||'.'||extension;
 if row.storage_path is not null and row.storage_path is distinct from expected then raise exception 'Legacy attachment target changed'; end if;
 return expected;
end $$;
revoke all on function public.legacy_asset_attachment_target(uuid,uuid,text,text,text,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.legacy_asset_attachment_target(uuid,uuid,text,text,text,uuid,uuid,uuid,text) to service_role;

create function public.verify_legacy_asset_attachment(p_company uuid,p_attachment uuid,p_source_sha256 text,p_source_key text,p_url text,p_asset uuid,p_maintenance uuid,p_location uuid,p_type text,p_path text,p_sha256 text) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare expected text; row public.asset_attachments;
begin
 expected:=public.legacy_asset_attachment_target(p_company,p_attachment,p_source_sha256,p_source_key,p_url,p_asset,p_maintenance,p_location,p_type);
 if p_path is distinct from expected or coalesce(p_sha256,'')!~'^[0-9a-f]{64}$' or not exists(select 1 from storage.objects where bucket_id='asset-documents' and name=expected) then raise exception 'Legacy attachment copy mismatch'; end if;
 select * into row from public.asset_attachments where company_id=p_company and id=p_attachment for update;
 if row.verified_at is not null then
  if row.storage_path is distinct from p_path or row.content_sha256 is distinct from p_sha256 then raise exception 'Legacy attachment verification changed'; end if;
  return true;
 end if;
 if row.storage_path is not null and row.storage_path is distinct from p_path then raise exception 'Legacy attachment target changed'; end if;
 update public.asset_attachments set storage_path=p_path,content_sha256=p_sha256,verified_at=now() where company_id=p_company and id=p_attachment;
 return true;
end $$;
revoke all on function public.verify_legacy_asset_attachment(uuid,uuid,text,text,text,uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.verify_legacy_asset_attachment(uuid,uuid,text,text,text,uuid,uuid,uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
