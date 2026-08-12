-- Make Central Kitchen -> outlet supply ownership explicit and stop treating
-- inferred dispatch quantities as confirmed operational facts.

create table if not exists public.branch_supply_routes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  source_branch_id uuid not null references public.branches(id),
  destination_branch_id uuid not null references public.branches(id),
  is_primary boolean not null default true,
  status public.record_status not null default 'active',
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staffs(id),
  updated_by uuid references public.staffs(id),
  constraint branch_supply_route_distinct_branches check (source_branch_id <> destination_branch_id),
  constraint branch_supply_route_dates_valid check (effective_to is null or effective_to >= effective_from),
  unique (company_id, source_branch_id, destination_branch_id)
);

create unique index if not exists branch_supply_routes_one_primary_destination_idx
  on public.branch_supply_routes (company_id, destination_branch_id)
  where is_primary and status = 'active' and effective_to is null;

create or replace function public.validate_branch_supply_route()
returns trigger language plpgsql set search_path = public as $$
declare source_row public.branches%rowtype; destination_row public.branches%rowtype;
begin
  select * into source_row from public.branches where id = new.source_branch_id and deleted_at is null;
  select * into destination_row from public.branches where id = new.destination_branch_id and deleted_at is null;
  if source_row.id is null or destination_row.id is null then raise exception 'Supply route branches must exist.'; end if;
  if source_row.company_id <> new.company_id or destination_row.company_id <> new.company_id then
    raise exception 'Supply route branches must belong to the same company.';
  end if;
  if source_row.branch_type <> 'central_kitchen' then raise exception 'Supply route source must be a Central Kitchen.'; end if;
  if destination_row.branch_type <> 'outlet' then raise exception 'Supply route destination must be an outlet.'; end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists validate_branch_supply_route_trigger on public.branch_supply_routes;
create trigger validate_branch_supply_route_trigger before insert or update on public.branch_supply_routes
for each row execute function public.validate_branch_supply_route();

alter table public.branch_supply_routes enable row level security;
drop policy if exists "branch supply routes company read" on public.branch_supply_routes;
create policy "branch supply routes company read" on public.branch_supply_routes for select to authenticated
using (exists (
  select 1 from public.staffs actor
  where actor.auth_user_id = auth.uid() and actor.company_id = branch_supply_routes.company_id
    and actor.status = 'active' and actor.deleted_at is null
));
revoke all on public.branch_supply_routes from public, anon;
grant select on public.branch_supply_routes to authenticated;

-- Seed the confirmed 12 Aug 2026 operating routes. Matching is company-local,
-- type-bound, and fail-closed: missing or ambiguous names roll back the migration.
do $$
declare
  mapping record; company_row record; source_ids uuid[]; destination_ids uuid[];
begin
  for company_row in
    select company.id from public.companies company
    where company.status = 'active' and company.deleted_at is null
      and exists (
        select 1 from public.branches kitchen
        where kitchen.company_id = company.id and kitchen.branch_type = 'central_kitchen'
          and kitchen.status = 'active' and kitchen.deleted_at is null
          and regexp_replace(lower(coalesce(kitchen.branch_code,'') || coalesce(kitchen.branch_name,'')), '[^a-z0-9]+', '', 'g') like '%ckalma%'
      )
      and exists (
        select 1 from public.branches kitchen
        where kitchen.company_id = company.id and kitchen.branch_type = 'central_kitchen'
          and kitchen.status = 'active' and kitchen.deleted_at is null
          and regexp_replace(lower(coalesce(kitchen.branch_code,'') || coalesce(kitchen.branch_name,'')), '[^a-z0-9]+', '', 'g') like '%pjs10%'
      )
  loop
    for mapping in select * from (values
      ('ckalma', 'queensbay'), ('ckalma', 'gurney'),
      ('pjs10', 'ioipuchong'), ('pjs10', 'jakel'), ('pjs10', 'publika'),
      ('pjs10', 'midvalley'), ('pjs10', 'petalingstreet'),
      ('pjs10', 'sunwaypyramid'), ('pjs10', 'sunwayvelocity'), ('pjs10', 'trx')
    ) as routes(source_key, destination_key) loop
      select array_agg(id) into source_ids from public.branches
      where company_id = company_row.id and branch_type = 'central_kitchen' and status = 'active' and deleted_at is null
        and regexp_replace(lower(coalesce(branch_code,'') || coalesce(branch_name,'')), '[^a-z0-9]+', '', 'g') like '%' || mapping.source_key || '%';
      select array_agg(id) into destination_ids from public.branches
      where company_id = company_row.id and branch_type = 'outlet' and status = 'active' and deleted_at is null
        and regexp_replace(lower(coalesce(branch_code,'') || coalesce(branch_name,'')), '[^a-z0-9]+', '', 'g') like '%' || mapping.destination_key || '%';
      if cardinality(source_ids) <> 1 or cardinality(destination_ids) <> 1 then
        raise exception 'Supply route % -> % expected one source and one outlet; found % and %.',
          mapping.source_key, mapping.destination_key, coalesce(cardinality(source_ids), 0), coalesce(cardinality(destination_ids), 0);
      end if;
      insert into public.branch_supply_routes (company_id, source_branch_id, destination_branch_id, effective_from)
      values (company_row.id, source_ids[1], destination_ids[1], date '2026-08-12')
      on conflict (company_id, source_branch_id, destination_branch_id) do update
      set is_primary = true, status = 'active', effective_from = excluded.effective_from, effective_to = null, updated_at = now();
    end loop;
  end loop;
end $$;

alter table public.outlet_daily_records add column if not exists source_branch_id uuid references public.branches(id);
alter table public.outlet_daily_record_lines add column if not exists qty_sent_estimated numeric(18,4);
alter table public.outlet_daily_record_lines add column if not exists qty_sent_confirmed boolean not null default false;
alter table public.outlet_daily_record_lines add column if not exists qty_sent_source text not null default 'unavailable';
alter table public.outlet_daily_record_lines drop constraint if exists outlet_daily_qty_sent_estimated_nonnegative;
alter table public.outlet_daily_record_lines add constraint outlet_daily_qty_sent_estimated_nonnegative
  check (qty_sent_estimated is null or qty_sent_estimated >= 0);
alter table public.outlet_daily_record_lines drop constraint if exists outlet_daily_qty_sent_source_valid;
alter table public.outlet_daily_record_lines add constraint outlet_daily_qty_sent_source_valid
  check (qty_sent_source in ('unavailable','legacy_unverified','outlet_received_estimate','authorized_draft','authorized_confirmed'));
update public.outlet_daily_record_lines set qty_sent_source = 'legacy_unverified'
where qty_sent <> 0 and qty_sent_source = 'unavailable';

create or replace function public.can_access_outlet_daily_branch(target_branch_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staffs s join public.branches b on b.id = target_branch_id and b.company_id = s.company_id
    where s.auth_user_id = auth.uid() and s.status = 'active' and s.deleted_at is null and (
      public.has_permission('outlet_daily_record.view_all') or s.default_branch_id = target_branch_id
      or exists (select 1 from public.staff_branches sb where sb.staff_id = s.id and sb.branch_id = target_branch_id)
      or exists (
        select 1 from public.branch_supply_routes route
        where route.company_id = s.company_id and route.destination_branch_id = target_branch_id
          and route.status = 'active' and route.effective_from <= current_date
          and (route.effective_to is null or route.effective_to >= current_date)
          and (route.source_branch_id = s.default_branch_id or exists (
            select 1 from public.staff_branches source_assignment
            where source_assignment.staff_id = s.id and source_assignment.branch_id = route.source_branch_id
          ))
      )
    )
  )
$$;

create or replace function public.save_outlet_daily_record(
  p_record_id uuid, p_branch_id uuid, p_record_date date, p_notes text, p_lines jsonb, p_target_status text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  actor public.staffs%rowtype; existing public.outlet_daily_records%rowtype; saved_id uuid; line jsonb;
  line_product_id uuid; sent_qty numeric; received_qty numeric; line_wastage_qty numeric;
  line_reason text; line_notes text; source_kitchen_id uuid; received_provided boolean; confirm_sent boolean;
  can_edit_outlet boolean := public.has_permission('outlet_daily_record.update');
  can_edit_sent boolean := public.has_permission('outlet_daily_record.qty_sent');
begin
  confirm_sent := p_target_status in ('morning_recorded','evening_completed');
  select * into actor from public.staffs where auth_user_id = auth.uid() and status = 'active' and deleted_at is null limit 1;
  if actor.id is null then raise exception 'Active staff access is required.'; end if;
  if p_record_id is null and not public.has_permission('outlet_daily_record.create') then raise exception 'Missing permission: outlet_daily_record.create';
  elsif p_record_id is not null and not can_edit_outlet and not can_edit_sent then raise exception 'Missing permission to update this outlet daily record.'; end if;
  if p_target_status not in ('draft','morning_recorded','evening_completed') then raise exception 'Invalid outlet daily record status.'; end if;
  if p_record_date is null then raise exception 'Record date is required.'; end if;
  if not exists (select 1 from public.branches b where b.id = p_branch_id and b.company_id = actor.company_id and b.branch_type = 'outlet' and b.status = 'active' and b.deleted_at is null) then
    raise exception 'Active outlet was not found in your company.';
  end if;
  if not public.can_access_outlet_daily_branch(p_branch_id) then raise exception 'Permission denied for this outlet.'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then raise exception 'At least one product line is required.'; end if;
  select route.source_branch_id into source_kitchen_id from public.branch_supply_routes route
  where route.company_id = actor.company_id and route.destination_branch_id = p_branch_id and route.is_primary
    and route.status = 'active' and route.effective_from <= p_record_date
    and (route.effective_to is null or route.effective_to >= p_record_date)
  order by route.effective_from desc limit 1;

  if p_record_id is not null then
    select * into existing from public.outlet_daily_records where id = p_record_id and company_id = actor.company_id for update;
    if existing.id is null then raise exception 'Outlet daily record was not found in your company.'; end if;
    if not public.can_access_outlet_daily_branch(existing.branch_id) then raise exception 'Permission denied for this outlet.'; end if;
    if existing.status in ('reviewed','void') then raise exception 'Reviewed or void records are locked.'; end if;
    if can_edit_sent and not can_edit_outlet then
      p_branch_id := existing.branch_id; p_record_date := existing.record_date; p_target_status := existing.status::text;
      source_kitchen_id := existing.source_branch_id;
    elsif existing.status = 'morning_recorded' and p_target_status = 'draft' then raise exception 'A confirmed entry cannot return to draft.';
    elsif existing.status = 'evening_completed' and p_target_status <> 'evening_completed' then raise exception 'A completed entry cannot return to an earlier status.';
    end if;
  end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    line_product_id := (line ->> 'product_id')::uuid;
    sent_qty := nullif(line ->> 'qty_sent', '')::numeric;
    received_qty := coalesce(nullif(line ->> 'morning_received_qty', '')::numeric, 0);
    line_wastage_qty := coalesce(nullif(line ->> 'wastage_qty', '')::numeric, 0);
    line_reason := nullif(trim(coalesce(line ->> 'wastage_reason', '')), ''); line_notes := nullif(trim(coalesce(line ->> 'notes', '')), '');
    if not exists (select 1 from public.products p where p.id = line_product_id) then raise exception 'A selected product was not found.'; end if;
    if coalesce(sent_qty,0) < 0 or received_qty < 0 or line_wastage_qty < 0 then raise exception 'Quantities must be non-negative.'; end if;
    if line_wastage_qty > 0 and line_reason not in ('unsold','damaged','expired','quality_issue','staff_meal','other') then raise exception 'A valid wastage reason is required.'; end if;
    if can_edit_outlet and line_wastage_qty > received_qty and line_notes is null then raise exception 'A line remark is required when wastage exceeds the received quantity.'; end if;
  end loop;

  if p_record_id is null then
    insert into public.outlet_daily_records (company_id, branch_id, source_branch_id, record_date, status, submitted_by, notes, created_by, updated_by)
    values (actor.company_id, p_branch_id, source_kitchen_id, p_record_date,
      (case when can_edit_outlet then p_target_status else 'draft' end)::public.outlet_daily_record_status,
      case when can_edit_outlet and p_target_status <> 'draft' then actor.id end,
      case when can_edit_outlet then nullif(trim(coalesce(p_notes,'')), '') end, actor.id, actor.id) returning id into saved_id;
  else
    update public.outlet_daily_records set
      branch_id = case when can_edit_outlet then p_branch_id else branch_id end,
      source_branch_id = coalesce(source_kitchen_id, source_branch_id),
      record_date = case when can_edit_outlet then p_record_date else record_date end,
      status = case when can_edit_outlet then p_target_status::public.outlet_daily_record_status else status end,
      submitted_by = case when can_edit_outlet and p_target_status <> 'draft' then actor.id else submitted_by end,
      notes = case when can_edit_outlet then nullif(trim(coalesce(p_notes,'')), '') else notes end, updated_by = actor.id
    where id = existing.id returning id into saved_id;
  end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    sent_qty := nullif(line ->> 'qty_sent', '')::numeric;
    received_qty := coalesce(nullif(line ->> 'morning_received_qty', '')::numeric, 0);
    received_provided := coalesce((line ->> 'morning_received_provided')::boolean, false);
    insert into public.outlet_daily_record_lines (
      record_id, product_id, qty_sent, qty_sent_estimated, qty_sent_confirmed, qty_sent_source,
      morning_received_qty, evening_leftover_qty, wastage_qty, wastage_reason, notes
    ) values (
      saved_id, (line ->> 'product_id')::uuid,
      case when can_edit_sent and sent_qty is not null then sent_qty else 0 end,
      case when can_edit_outlet and received_provided then received_qty end,
      can_edit_sent and sent_qty is not null and confirm_sent,
      case when can_edit_sent and sent_qty is not null and confirm_sent then 'authorized_confirmed'
           when can_edit_sent and sent_qty is not null then 'authorized_draft'
           when can_edit_outlet and received_provided then 'outlet_received_estimate' else 'unavailable' end,
      case when can_edit_outlet then received_qty else 0 end, 0,
      case when can_edit_outlet then coalesce(nullif(line ->> 'wastage_qty','')::numeric,0) else 0 end,
      case when can_edit_outlet then nullif(trim(coalesce(line ->> 'wastage_reason','')), '')::public.outlet_daily_wastage_reason end,
      case when can_edit_outlet then nullif(trim(coalesce(line ->> 'notes','')), '') end
    ) on conflict (record_id, product_id) do update set
      qty_sent = case when can_edit_sent and sent_qty is not null then excluded.qty_sent else public.outlet_daily_record_lines.qty_sent end,
      qty_sent_estimated = case when can_edit_outlet and received_provided then excluded.qty_sent_estimated else public.outlet_daily_record_lines.qty_sent_estimated end,
      qty_sent_confirmed = case when can_edit_sent and sent_qty is not null then excluded.qty_sent_confirmed else public.outlet_daily_record_lines.qty_sent_confirmed end,
      qty_sent_source = case when can_edit_sent and sent_qty is not null then excluded.qty_sent_source
        when can_edit_outlet and received_provided and not public.outlet_daily_record_lines.qty_sent_confirmed then excluded.qty_sent_source
        else public.outlet_daily_record_lines.qty_sent_source end,
      morning_received_qty = case when can_edit_outlet then excluded.morning_received_qty else public.outlet_daily_record_lines.morning_received_qty end,
      evening_leftover_qty = 0,
      wastage_qty = case when can_edit_outlet then excluded.wastage_qty else public.outlet_daily_record_lines.wastage_qty end,
      wastage_reason = case when can_edit_outlet then excluded.wastage_reason else public.outlet_daily_record_lines.wastage_reason end,
      notes = case when can_edit_outlet then excluded.notes else public.outlet_daily_record_lines.notes end;
  end loop;
  return saved_id;
end $$;

revoke all on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) from public, anon;
grant execute on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) to authenticated;
notify pgrst, 'reload schema';
