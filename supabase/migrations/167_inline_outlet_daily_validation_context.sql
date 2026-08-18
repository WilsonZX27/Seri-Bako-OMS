-- Preserve the offending product context when a daily record cannot be saved.
-- The UI uses the stable product code to focus the corresponding remark field.
create or replace function public.save_outlet_daily_record(
  p_record_id uuid, p_branch_id uuid, p_record_date date, p_notes text, p_lines jsonb, p_target_status text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  actor public.staffs%rowtype; existing public.outlet_daily_records%rowtype; saved_id uuid; line jsonb;
  sent_qty numeric; received_qty numeric; line_wastage_qty numeric; line_reason text; line_notes text;
  source_kitchen_id uuid; received_provided boolean; confirm_sent boolean; product_name text; product_code text;
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
    sent_qty := nullif(line ->> 'qty_sent', '')::numeric;
    received_qty := coalesce(nullif(line ->> 'morning_received_qty', '')::numeric, 0);
    line_wastage_qty := coalesce(nullif(line ->> 'wastage_qty', '')::numeric, 0);
    line_reason := nullif(trim(coalesce(line ->> 'wastage_reason', '')), ''); line_notes := nullif(trim(coalesce(line ->> 'notes', '')), '');
    select p.product_name, p.product_code into product_name, product_code from public.products p
    where p.id = (line ->> 'product_id')::uuid and p.company_id = actor.company_id and p.deleted_at is null;
    if product_code is null then raise exception 'A selected product was not found.'; end if;
    if coalesce(sent_qty,0) < 0 or received_qty < 0 or line_wastage_qty < 0 then raise exception 'Quantities must be non-negative.'; end if;
    if line_wastage_qty > 0 and line_reason not in ('unsold','damaged','expired','quality_issue','staff_meal','other') then raise exception 'A valid wastage reason is required for "%" (%).', product_name, product_code; end if;
    if can_edit_outlet and line_wastage_qty > received_qty and line_notes is null then raise exception 'Wastage for "%" (%) cannot exceed received without a line remark.', product_name, product_code; end if;
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
    received_provided := can_edit_outlet and coalesce((line ->> 'morning_received_provided')::boolean, false);
    insert into public.outlet_daily_record_lines (
      record_id, product_id, qty_sent, qty_sent_estimated, qty_sent_confirmed, qty_sent_source,
      morning_received_qty, morning_received_provided, evening_leftover_qty, wastage_qty, wastage_reason, notes
    ) values (
      saved_id, (line ->> 'product_id')::uuid,
      case when can_edit_sent and sent_qty is not null then sent_qty else 0 end,
      case when received_provided then received_qty end,
      can_edit_sent and sent_qty is not null and confirm_sent,
      case when can_edit_sent and sent_qty is not null and confirm_sent then 'authorized_confirmed'
           when can_edit_sent and sent_qty is not null then 'authorized_draft'
           when received_provided then 'outlet_received_estimate' else 'unavailable' end,
      case when can_edit_outlet then received_qty else 0 end, received_provided, 0,
      case when can_edit_outlet then coalesce(nullif(line ->> 'wastage_qty','')::numeric,0) else 0 end,
      case when can_edit_outlet then nullif(trim(coalesce(line ->> 'wastage_reason','')), '')::public.outlet_daily_wastage_reason end,
      case when can_edit_outlet then nullif(trim(coalesce(line ->> 'notes','')), '') end
    ) on conflict (record_id, product_id) do update set
      qty_sent = case when can_edit_sent and sent_qty is not null then excluded.qty_sent else public.outlet_daily_record_lines.qty_sent end,
      qty_sent_estimated = case when received_provided then excluded.qty_sent_estimated else public.outlet_daily_record_lines.qty_sent_estimated end,
      qty_sent_confirmed = case when can_edit_sent and sent_qty is not null then excluded.qty_sent_confirmed else public.outlet_daily_record_lines.qty_sent_confirmed end,
      qty_sent_source = case when can_edit_sent and sent_qty is not null then excluded.qty_sent_source
        when received_provided and not public.outlet_daily_record_lines.qty_sent_confirmed then excluded.qty_sent_source
        else public.outlet_daily_record_lines.qty_sent_source end,
      morning_received_qty = case when can_edit_outlet then excluded.morning_received_qty else public.outlet_daily_record_lines.morning_received_qty end,
      morning_received_provided = case when can_edit_outlet then excluded.morning_received_provided else public.outlet_daily_record_lines.morning_received_provided end,
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
