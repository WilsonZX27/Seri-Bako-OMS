-- Sprint 7.23.6.1/7.23.6.2 — atomic inventory posting core.
-- All authenticated posting paths enter here; each RPC is one database transaction.

create or replace function public.inventory_lock_item_location(p_item_id uuid, p_location_id uuid)
returns void language plpgsql volatile security definer set search_path = pg_catalog, public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_item_id::text || ':' || p_location_id::text, 0));
end $$;

revoke all on function public.inventory_lock_item_location(uuid, uuid) from public, anon, authenticated;

create or replace function public.post_manual_inventory_movement(
  p_transaction_no text, p_branch_id uuid, p_item_id uuid, p_location_id uuid,
  p_transaction_type public.stock_transaction_type, p_transaction_date date,
  p_quantity_in numeric, p_quantity_out numeric, p_unit_cost numeric,
  p_remarks text, p_from_location_id uuid default null, p_to_location_id uuid default null
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor_id uuid; movement_id uuid; balance numeric; new_document_id uuid;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_transactions.create') then raise exception 'Missing permission: stock_transactions.create'; end if;
  if p_quantity_in < 0 or p_quantity_out < 0 or (p_quantity_in > 0 and p_quantity_out > 0) or (p_quantity_in = 0 and p_quantity_out = 0) then raise exception 'Inventory movement must contain one positive direction.'; end if;
  if not public.can_access_inventory_branch((select company_id from public.branches where id = p_branch_id), p_branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if not exists (select 1 from public.locations where id = p_location_id and branch_id = p_branch_id and status = 'active' and deleted_at is null) then raise exception 'Inventory location does not belong to the selected branch.'; end if;
  perform public.inventory_lock_item_location(p_item_id, p_location_id);
  if p_quantity_out > 0 then
    select coalesce(sum(quantity_in - quantity_out), 0) into balance from public.stock_transactions where item_id = p_item_id and location_id = p_location_id and status = 'posted';
    if balance < p_quantity_out and not public.current_staff_has_company_role(array['super_admin','owner']) then raise exception 'This stock movement would make current stock negative.'; end if;
  end if;
  select id into movement_id from public.stock_transactions where transaction_no = p_transaction_no for update;
  if movement_id is not null then return movement_id; end if;
  movement_id := public.insert_inventory_movement(p_transaction_no, null, p_branch_id, p_item_id, p_location_id, p_transaction_type, p_transaction_date, p_quantity_in, p_quantity_out, coalesce(p_unit_cost,0), actor_id, p_remarks, 'stock_transaction', movement_id);
  insert into public.documents (company_id, document_no, document_type, title, status, approval_status, current_step, related_entity_type, related_entity_id, posted_at, created_by, updated_by)
    values ((select company_id from public.branches where id=p_branch_id), p_transaction_no, 'stock_transaction', 'Stock Transaction '||p_transaction_no, 'posted', 'not_required', 'Posted to ledger', 'stock_transaction', movement_id, now(), actor_id, actor_id)
    returning id into new_document_id;
  update public.stock_transactions st set document_id=new_document_id where st.id=movement_id;
  insert into public.document_revisions (document_id, revision_no, change_summary, changed_by) values (new_document_id, 1, 'Initial stock transaction posted.', actor_id);
  return movement_id;
end $$;

revoke all on function public.post_manual_inventory_movement(text, uuid, uuid, uuid, public.stock_transaction_type, date, numeric, numeric, numeric, text, uuid, uuid) from public, anon;
grant execute on function public.post_manual_inventory_movement(text, uuid, uuid, uuid, public.stock_transaction_type, date, numeric, numeric, numeric, text, uuid, uuid) to authenticated;

create or replace function public.dispatch_stock_transfer_atomic(p_transfer_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor_id uuid; row public.stock_transfers%rowtype;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_transfer.update') then raise exception 'Missing permission: stock_transfer.update'; end if;
  select * into row from public.stock_transfers where id = p_transfer_id and deleted_at is null for update;
  if row.id is null or row.status <> 'draft' then raise exception 'Only a draft stock transfer can be dispatched.'; end if;
  if not public.can_access_inventory_branch((select company_id from public.branches where id = row.from_branch_id), row.from_branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  update public.stock_transfers set status = 'in_transit', updated_by = actor_id, updated_at = now() where id = row.id;
end $$;

create or replace function public.post_stock_transfer_atomic(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor_id uuid; row public.stock_transfers%rowtype; line record; balance numeric; posted_count integer := 0;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_transfer.post') then raise exception 'Missing permission: stock_transfer.post'; end if;
  select * into row from public.stock_transfers where id = p_transfer_id and deleted_at is null for update;
  if row.id is null or row.status <> 'in_transit' then raise exception 'Only an in-transit stock transfer can be received.'; end if;
  if not public.can_access_inventory_branch((select company_id from public.branches where id = row.to_branch_id), row.to_branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if not exists (select 1 from public.stock_transfer_lines where stock_transfer_id = row.id) then raise exception 'Cannot post without lines.'; end if;
  for line in select * from public.stock_transfer_lines where stock_transfer_id = row.id order by id loop
    perform public.inventory_lock_item_location(line.item_id, row.from_location_id);
    perform public.inventory_lock_item_location(line.item_id, row.to_location_id);
    select coalesce(sum(quantity_in - quantity_out), 0) into balance from public.stock_transactions where item_id = line.item_id and location_id = row.from_location_id and status = 'posted';
    if balance < line.quantity and not public.current_staff_has_company_role(array['super_admin','owner']) then raise exception 'Insufficient stock for transfer line.'; end if;
    perform public.insert_inventory_movement('ST-'||row.transfer_no||'-out-'||left(line.id::text,8), row.document_id, row.from_branch_id, line.item_id, row.from_location_id, 'transfer_out', row.transfer_date, 0, line.quantity, 0, actor_id, 'Transferred from '||row.transfer_no, 'stock_transfer', row.id);
    perform public.insert_inventory_movement('ST-'||row.transfer_no||'-in-'||left(line.id::text,8), row.document_id, row.to_branch_id, line.item_id, row.to_location_id, 'transfer_in', row.transfer_date, line.quantity, 0, 0, actor_id, 'Transferred to '||row.transfer_no, 'stock_transfer', row.id);
    posted_count := posted_count + 1;
  end loop;
  update public.stock_transfers set status = 'completed', posted_at = now(), updated_by = actor_id, updated_at = now() where id = row.id;
  if row.document_id is not null then update public.documents set status='posted', approval_status='approved', current_step='Posted to stock', posted_at=now(), updated_by=actor_id where id=row.document_id; end if;
  return jsonb_build_object('transfer_id', row.id, 'lines', posted_count);
end $$;

create or replace function public.post_stock_wastage_atomic(p_wastage_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor_id uuid; row public.stock_wastage%rowtype; line record; balance numeric; posted_count integer := 0;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_wastage.post') then raise exception 'Missing permission: stock_wastage.post'; end if;
  select * into row from public.stock_wastage where id = p_wastage_id and deleted_at is null for update;
  if row.id is null or row.status not in ('draft','approved') then raise exception 'Only a draft or approved wastage can be posted.'; end if;
  if not public.can_access_inventory_branch((select company_id from public.branches where id = row.branch_id), row.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  for line in select * from public.stock_wastage_lines where stock_wastage_id = row.id order by id loop
    perform public.inventory_lock_item_location(line.item_id, row.location_id);
    select coalesce(sum(quantity_in - quantity_out), 0) into balance from public.stock_transactions where item_id=line.item_id and location_id=row.location_id and status='posted';
    if balance < line.quantity and not public.current_staff_has_company_role(array['super_admin','owner']) then raise exception 'Insufficient stock for wastage line.'; end if;
    perform public.insert_inventory_movement('SW-'||row.wastage_no||'-'||left(line.id::text,8), row.document_id, row.branch_id, line.item_id, row.location_id, 'wastage', row.wastage_date, 0, line.quantity, 0, actor_id, coalesce(line.remarks,row.remarks,'Wastage '||row.wastage_no), 'stock_wastage', row.id);
    posted_count := posted_count + 1;
  end loop;
  if posted_count = 0 then raise exception 'Cannot post wastage without lines.'; end if;
  update public.stock_wastage set status='posted', posted_at=now(), updated_by=actor_id, updated_at=now() where id=row.id;
  if row.document_id is not null then update public.documents set status='posted', approval_status='approved', current_step='Posted to stock', posted_at=now(), updated_by=actor_id where id=row.document_id; end if;
  return jsonb_build_object('wastage_id', row.id, 'lines', posted_count);
end $$;

create or replace function public.post_production_job_atomic(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor_id uuid; job public.production_jobs%rowtype; ingredient record; output_line record; qty numeric; balance numeric; usage_id uuid; output_id uuid; ingredient_count integer := 0; output_count integer := 0;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('production.post') then raise exception 'Missing permission: production.post'; end if;
  select * into job from public.production_jobs where id=p_job_id and deleted_at is null for update;
  if job.id is null or job.status <> 'approved' or job.stock_transaction_id is not null then raise exception 'Only an approved, unposted production job can be posted.'; end if;
  if not public.can_access_inventory_branch((select company_id from public.branches where id=job.branch_id), job.branch_id) then raise exception 'You do not have access to this production branch.'; end if;
  for ingredient in select * from public.production_job_ingredient_lines where production_job_id=job.id order by id loop
    qty := coalesce(ingredient.actual_qty, ingredient.required_qty); perform public.inventory_lock_item_location(ingredient.item_id, job.location_id);
    select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=ingredient.item_id and location_id=job.location_id and status='posted';
    if balance < qty and not public.has_permission('production.override_negative_stock') then raise exception 'Insufficient stock for production ingredient.'; end if;
    ingredient_count := ingredient_count + 1;
  end loop;
  if ingredient_count=0 then raise exception 'Production job has no ingredient lines.'; end if;
  select * into output_line from public.production_job_output_lines where production_job_id=job.id order by created_at,id limit 1;
  if output_line.id is null and job.output_item_id is null then raise exception 'Production job has no output item.'; end if;
  for ingredient in select * from public.production_job_ingredient_lines where production_job_id=job.id order by id loop
    qty := coalesce(ingredient.actual_qty, ingredient.required_qty);
    usage_id := public.insert_inventory_movement('PROD-'||job.production_job_no||'-USE-'||left(ingredient.id::text,8), job.document_id, job.branch_id, ingredient.item_id, job.location_id, 'production_usage', job.production_date, 0, qty, coalesce(ingredient.unit_cost,0), actor_id, 'Consumed by '||job.production_job_no, 'production_job', job.id);
  end loop;
  perform public.inventory_lock_item_location(coalesce(output_line.item_id,job.output_item_id), job.location_id);
  output_id := public.insert_inventory_movement('PROD-'||job.production_job_no||'-OUT', job.document_id, job.branch_id, coalesce(output_line.item_id,job.output_item_id), job.location_id, 'production_output', job.production_date, coalesce(output_line.actual_qty,output_line.planned_qty,job.planned_output_qty), 0, coalesce(output_line.unit_cost,0), actor_id, 'Produced by '||job.production_job_no, 'production_job', job.id);
  update public.production_jobs set status='posted', actual_output_qty=coalesce(output_line.actual_qty,output_line.planned_qty,job.planned_output_qty), stock_transaction_id=output_id, posted_by=actor_id, posted_at=now(), updated_by=actor_id, updated_at=now() where id=job.id;
  if job.document_id is not null then update public.documents set status='posted', approval_status='approved', current_step='Posted to stock', posted_at=now(), updated_by=actor_id where id=job.document_id; end if;
  return jsonb_build_object('production_job_id',job.id,'output_transaction_id',output_id);
end $$;

revoke all on function public.dispatch_stock_transfer_atomic(uuid), public.post_stock_transfer_atomic(uuid), public.post_stock_wastage_atomic(uuid), public.post_production_job_atomic(uuid) from public, anon;
grant execute on function public.dispatch_stock_transfer_atomic(uuid) to authenticated;
grant execute on function public.post_stock_transfer_atomic(uuid) to authenticated;
grant execute on function public.post_stock_wastage_atomic(uuid) to authenticated;
grant execute on function public.post_production_job_atomic(uuid) to authenticated;
