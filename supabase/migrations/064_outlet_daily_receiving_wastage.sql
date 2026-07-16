-- Sprint 7.12.0: daily outlet receiving and wastage capture only.
-- This migration deliberately does not write inventory or production records.

do $$ begin
  create type public.outlet_daily_record_status as enum ('draft','morning_recorded','evening_completed','reviewed','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outlet_daily_wastage_reason as enum ('unsold','damaged','expired','quality_issue','staff_meal','other');
exception when duplicate_object then null; end $$;

create table if not exists public.outlet_daily_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  record_date date not null,
  status public.outlet_daily_record_status not null default 'draft',
  submitted_by uuid references public.staffs(id) on delete set null,
  reviewed_by uuid references public.staffs(id) on delete set null,
  reviewed_at timestamptz,
  void_reason text,
  voided_by uuid references public.staffs(id) on delete set null,
  voided_at timestamptz,
  notes text,
  created_by uuid references public.staffs(id) on delete set null,
  updated_by uuid references public.staffs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outlet_daily_void_reason_required check (status <> 'void' or length(trim(coalesce(void_reason, ''))) > 0)
);

create table if not exists public.outlet_daily_record_lines (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.outlet_daily_records(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  morning_received_qty numeric(18,4) not null default 0,
  evening_leftover_qty numeric(18,4) not null default 0,
  wastage_qty numeric(18,4) not null default 0,
  wastage_reason public.outlet_daily_wastage_reason,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(record_id, product_id),
  constraint outlet_daily_received_nonnegative check (morning_received_qty >= 0),
  constraint outlet_daily_leftover_nonnegative check (evening_leftover_qty >= 0),
  constraint outlet_daily_wastage_nonnegative check (wastage_qty >= 0),
  constraint outlet_daily_wastage_reason_required check (wastage_qty = 0 or wastage_reason is not null)
);

create unique index if not exists outlet_daily_active_branch_date_idx
  on public.outlet_daily_records(company_id, branch_id, record_date)
  where status <> 'void';
create index if not exists outlet_daily_records_company_date_idx on public.outlet_daily_records(company_id, record_date desc);
create index if not exists outlet_daily_records_branch_date_idx on public.outlet_daily_records(branch_id, record_date desc);
create index if not exists outlet_daily_record_lines_record_idx on public.outlet_daily_record_lines(record_id);

drop trigger if exists set_outlet_daily_records_updated_at on public.outlet_daily_records;
create trigger set_outlet_daily_records_updated_at before update on public.outlet_daily_records
for each row execute function public.set_updated_at();
drop trigger if exists set_outlet_daily_record_lines_updated_at on public.outlet_daily_record_lines;
create trigger set_outlet_daily_record_lines_updated_at before update on public.outlet_daily_record_lines
for each row execute function public.set_updated_at();

insert into public.permissions (permission_code, module, action, description)
values
  ('outlet_daily_record.view','outlet_daily_record','view','View outlet daily receiving and wastage records'),
  ('outlet_daily_record.view_all','outlet_daily_record','view_all','View all company outlet daily records'),
  ('outlet_daily_record.create','outlet_daily_record','create','Create outlet daily records'),
  ('outlet_daily_record.update','outlet_daily_record','update','Update unreviewed outlet daily records'),
  ('outlet_daily_record.review','outlet_daily_record','review','Review completed outlet daily records'),
  ('outlet_daily_record.void','outlet_daily_record','void','Void outlet daily records with a reason')
on conflict (permission_code) do update set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.module = 'outlet_daily_record'
where
  (p.permission_code = 'outlet_daily_record.view' and r.role_code in ('admin','operations_admin','manager','kitchen_staff','kitchen','viewer'))
  or (p.permission_code = 'outlet_daily_record.view_all' and r.role_code in ('admin','operations_admin','manager'))
  or (p.permission_code in ('outlet_daily_record.create','outlet_daily_record.update') and r.role_code in ('admin','operations_admin','kitchen_staff','kitchen'))
  or (p.permission_code in ('outlet_daily_record.review','outlet_daily_record.void') and r.role_code in ('admin','operations_admin','manager'))
on conflict (role_id, permission_id) do nothing;

create or replace function public.can_access_outlet_daily_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staffs s
    join public.branches b on b.id = target_branch_id and b.company_id = s.company_id
    where s.auth_user_id = auth.uid()
      and s.status = 'active'
      and s.deleted_at is null
      and (
        public.has_permission('outlet_daily_record.view_all')
        or s.default_branch_id = target_branch_id
        or exists (
          select 1 from public.staff_branches sb
          where sb.staff_id = s.id and sb.branch_id = target_branch_id
        )
      )
  )
$$;

alter table public.outlet_daily_records enable row level security;
alter table public.outlet_daily_record_lines enable row level security;

drop policy if exists "outlet daily records read" on public.outlet_daily_records;
create policy "outlet daily records read" on public.outlet_daily_records
for select to authenticated
using (
  public.has_permission('outlet_daily_record.view')
  and public.can_access_outlet_daily_branch(branch_id)
);

drop policy if exists "outlet daily record lines read" on public.outlet_daily_record_lines;
create policy "outlet daily record lines read" on public.outlet_daily_record_lines
for select to authenticated
using (
  exists (
    select 1 from public.outlet_daily_records r
    where r.id = record_id
      and public.has_permission('outlet_daily_record.view')
      and public.can_access_outlet_daily_branch(r.branch_id)
  )
);

create or replace function public.save_outlet_daily_record(
  p_record_id uuid,
  p_branch_id uuid,
  p_record_date date,
  p_notes text,
  p_lines jsonb,
  p_target_status text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  existing public.outlet_daily_records%rowtype;
  saved_id uuid;
  line jsonb;
  line_product_id uuid;
  received_qty numeric;
  leftover_qty numeric;
  line_wastage_qty numeric;
  line_reason text;
  line_notes text;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'Active staff access is required.'; end if;
  if p_record_id is null and not public.has_permission('outlet_daily_record.create') then
    raise exception 'Missing permission: outlet_daily_record.create';
  elsif p_record_id is not null and not public.has_permission('outlet_daily_record.update') then
    raise exception 'Missing permission: outlet_daily_record.update';
  end if;
  if p_target_status not in ('draft','morning_recorded','evening_completed') then
    raise exception 'Invalid outlet daily record status.';
  end if;
  if p_record_date is null then raise exception 'Record date is required.'; end if;
  if not exists (select 1 from public.branches b where b.id = p_branch_id and b.company_id = actor.company_id and b.status = 'active' and b.deleted_at is null) then
    raise exception 'Active outlet or branch was not found in your company.';
  end if;
  if not public.can_access_outlet_daily_branch(p_branch_id) then raise exception 'Permission denied for this outlet or branch.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'At least one product line is required.'; end if;

  if p_record_id is not null then
    select * into existing from public.outlet_daily_records where id = p_record_id and company_id = actor.company_id for update;
    if existing.id is null then raise exception 'Outlet daily record was not found in your company.'; end if;
    if not public.can_access_outlet_daily_branch(existing.branch_id) then raise exception 'Permission denied for this outlet or branch.'; end if;
    if existing.status in ('reviewed','void') then raise exception 'Reviewed or void records are locked.'; end if;
    if existing.status = 'morning_recorded' and p_target_status = 'draft' then raise exception 'A morning-recorded entry cannot return to draft.'; end if;
    if existing.status = 'evening_completed' and p_target_status <> 'evening_completed' then raise exception 'An evening-completed entry cannot return to an earlier status.'; end if;
  end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    line_product_id := (line ->> 'product_id')::uuid;
    received_qty := coalesce(nullif(line ->> 'morning_received_qty', '')::numeric, 0);
    leftover_qty := coalesce(nullif(line ->> 'evening_leftover_qty', '')::numeric, 0);
    line_wastage_qty := coalesce(nullif(line ->> 'wastage_qty', '')::numeric, 0);
    line_reason := nullif(trim(coalesce(line ->> 'wastage_reason', '')), '');
    line_notes := nullif(trim(coalesce(line ->> 'notes', '')), '');
    if not exists (select 1 from public.products p where p.id = line_product_id) then raise exception 'A selected product was not found.'; end if;
    if received_qty < 0 or leftover_qty < 0 or line_wastage_qty < 0 then raise exception 'Quantities must be non-negative.'; end if;
    if p_target_status = 'evening_completed' and (not (line ? 'evening_leftover_qty') or not (line ? 'wastage_qty')) then
      raise exception 'Evening leftover and wastage quantities are required.';
    end if;
    if line_wastage_qty > 0 and line_reason not in ('unsold','damaged','expired','quality_issue','staff_meal','other') then
      raise exception 'A valid wastage reason is required.';
    end if;
    if (leftover_qty > received_qty or line_wastage_qty > received_qty or leftover_qty + line_wastage_qty > received_qty) and line_notes is null then
      raise exception 'A line note is required when leftover or wastage exceeds the received quantity.';
    end if;
  end loop;

  if p_record_id is null then
    insert into public.outlet_daily_records (company_id, branch_id, record_date, status, submitted_by, notes, created_by, updated_by)
    values (actor.company_id, p_branch_id, p_record_date, p_target_status::public.outlet_daily_record_status,
      case when p_target_status = 'draft' then null else actor.id end, nullif(trim(coalesce(p_notes, '')), ''), actor.id, actor.id)
    returning id into saved_id;
  else
    update public.outlet_daily_records set
      branch_id = p_branch_id,
      record_date = p_record_date,
      status = p_target_status::public.outlet_daily_record_status,
      submitted_by = case when p_target_status = 'draft' then submitted_by else actor.id end,
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_by = actor.id
    where id = existing.id
    returning id into saved_id;
    delete from public.outlet_daily_record_lines where record_id = saved_id;
  end if;

  insert into public.outlet_daily_record_lines (record_id, product_id, morning_received_qty, evening_leftover_qty, wastage_qty, wastage_reason, notes)
  select saved_id,
    (value ->> 'product_id')::uuid,
    coalesce(nullif(value ->> 'morning_received_qty', '')::numeric, 0),
    coalesce(nullif(value ->> 'evening_leftover_qty', '')::numeric, 0),
    coalesce(nullif(value ->> 'wastage_qty', '')::numeric, 0),
    nullif(trim(coalesce(value ->> 'wastage_reason', '')), '')::public.outlet_daily_wastage_reason,
    nullif(trim(coalesce(value ->> 'notes', '')), '')
  from jsonb_array_elements(p_lines);

  return saved_id;
end $$;

create or replace function public.transition_outlet_daily_record(
  p_record_id uuid,
  p_action text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.staffs%rowtype;
  target public.outlet_daily_records%rowtype;
begin
  select * into actor from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'Active staff access is required.'; end if;
  select * into target from public.outlet_daily_records where id = p_record_id and company_id = actor.company_id for update;
  if target.id is null then raise exception 'Outlet daily record was not found in your company.'; end if;
  if not public.can_access_outlet_daily_branch(target.branch_id) then raise exception 'Permission denied for this outlet or branch.'; end if;

  if p_action = 'review' then
    if not public.has_permission('outlet_daily_record.review') then raise exception 'Missing permission: outlet_daily_record.review'; end if;
    if target.status <> 'evening_completed' then raise exception 'Only an evening-completed record can be reviewed.'; end if;
    update public.outlet_daily_records set status = 'reviewed', reviewed_by = actor.id, reviewed_at = now(), updated_by = actor.id where id = target.id;
  elsif p_action = 'void' then
    if not public.has_permission('outlet_daily_record.void') then raise exception 'Missing permission: outlet_daily_record.void'; end if;
    if target.status = 'void' then raise exception 'This outlet daily record is already void.'; end if;
    if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Void reason is required.'; end if;
    update public.outlet_daily_records set status = 'void', void_reason = trim(p_reason), voided_by = actor.id, voided_at = now(), updated_by = actor.id where id = target.id;
  else
    raise exception 'Invalid outlet daily record action.';
  end if;
end $$;

revoke all on function public.can_access_outlet_daily_branch(uuid) from public;
revoke all on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) from public;
revoke all on function public.transition_outlet_daily_record(uuid,text,text) from public;
grant execute on function public.can_access_outlet_daily_branch(uuid) to authenticated;
grant execute on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) to authenticated;
grant execute on function public.transition_outlet_daily_record(uuid,text,text) to authenticated;

notify pgrst, 'reload schema';
