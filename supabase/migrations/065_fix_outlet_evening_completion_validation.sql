-- Sprint 7.12.1: reject blank evening quantities while preserving blank draft entry.

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
    if p_target_status = 'evening_completed' and (
      nullif(trim(coalesce(line ->> 'evening_leftover_qty', '')), '') is null
      or nullif(trim(coalesce(line ->> 'wastage_qty', '')), '') is null
    ) then
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
