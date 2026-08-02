-- Stock Transfer reservation and partial receiving integrity.
-- Dispatch reserves source stock without changing the formal inventory ledger.
-- Destination receipt posts only the quantity actually received.  Any balance
-- left on a transfer remains in_transit until received or released.

alter table public.stock_transfer_lines
  add column if not exists received_quantity numeric(14,4) not null default 0;

alter table public.stock_transfer_lines
  add constraint stock_transfer_lines_received_quantity_valid
  check (received_quantity >= 0 and received_quantity <= quantity);

create table if not exists public.stock_transfer_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  stock_transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  stock_transfer_line_id uuid not null unique references public.stock_transfer_lines(id) on delete cascade,
  item_id uuid not null references public.items(id),
  from_branch_id uuid not null references public.branches(id),
  reserved_quantity numeric(14,4) not null,
  received_quantity numeric(14,4) not null default 0,
  status text not null default 'active' check (status in ('active','consumed','released')),
  reserved_at timestamptz not null default now(),
  released_at timestamptz,
  created_by uuid references public.staffs(id),
  updated_at timestamptz not null default now(),
  constraint stock_transfer_reservation_qty_valid check (reserved_quantity > 0 and received_quantity >= 0 and received_quantity <= reserved_quantity)
);

create index if not exists stock_transfer_reservations_active_item_idx
  on public.stock_transfer_reservations(from_branch_id, item_id, status)
  where status = 'active';

create table if not exists public.stock_transfer_receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  stock_transfer_id uuid not null references public.stock_transfers(id) on delete cascade,
  idempotency_key uuid not null,
  received_by uuid not null references public.staffs(id),
  received_at timestamptz not null default now(),
  status text not null default 'posted' check (status = 'posted'),
  created_at timestamptz not null default now(),
  unique (stock_transfer_id, idempotency_key)
);

create table if not exists public.stock_transfer_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.stock_transfer_receipts(id) on delete cascade,
  stock_transfer_line_id uuid not null references public.stock_transfer_lines(id),
  received_quantity numeric(14,4) not null check (received_quantity > 0),
  uom text not null,
  source_transaction_id uuid references public.stock_transactions(id),
  destination_transaction_id uuid references public.stock_transactions(id),
  created_at timestamptz not null default now(),
  unique (receipt_id, stock_transfer_line_id)
);

create index if not exists stock_transfer_receipt_lines_transfer_line_idx
  on public.stock_transfer_receipt_lines(stock_transfer_line_id);

alter table public.stock_transfer_reservations enable row level security;
alter table public.stock_transfer_receipts enable row level security;
alter table public.stock_transfer_receipt_lines enable row level security;

drop policy if exists "stock transfer reservations read" on public.stock_transfer_reservations;
create policy "stock transfer reservations read" on public.stock_transfer_reservations
for select to authenticated
using (public.can_access_inventory_branch(company_id, from_branch_id) and public.has_permission('stock_transfer.read'));

drop policy if exists "stock transfer receipts read" on public.stock_transfer_receipts;
create policy "stock transfer receipts read" on public.stock_transfer_receipts
for select to authenticated
using (
  exists (
    select 1 from public.stock_transfers transfer
    where transfer.id = stock_transfer_id
      and (public.can_access_inventory_branch(transfer.company_id, transfer.from_branch_id)
        or public.can_access_inventory_branch(transfer.company_id, transfer.to_branch_id))
      and public.has_permission('stock_transfer.read')
  )
);

drop policy if exists "stock transfer receipt lines read" on public.stock_transfer_receipt_lines;
create policy "stock transfer receipt lines read" on public.stock_transfer_receipt_lines
for select to authenticated
using (exists (
  select 1
  from public.stock_transfer_receipts receipt
  join public.stock_transfers transfer on transfer.id = receipt.stock_transfer_id
  where receipt.id = receipt_id
    and (public.can_access_inventory_branch(transfer.company_id, transfer.from_branch_id)
      or public.can_access_inventory_branch(transfer.company_id, transfer.to_branch_id))
    and public.has_permission('stock_transfer.read')
));

drop function if exists public.dispatch_stock_transfer_atomic(uuid);
create or replace function public.dispatch_stock_transfer_atomic(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor_id uuid;
  transfer_row public.stock_transfers%rowtype;
  line record;
  available_quantity numeric;
  reserved_quantity numeric;
  reservation_count integer := 0;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_transfer.update') then
    raise exception 'Missing permission: stock_transfer.update';
  end if;

  select * into transfer_row
  from public.stock_transfers
  where id = p_transfer_id and deleted_at is null
  for update;
  if transfer_row.id is null then raise exception 'Stock transfer was not found.'; end if;
  if transfer_row.status = 'in_transit' then
    return jsonb_build_object('transfer_id', transfer_row.id, 'status', 'in_transit', 'already_dispatched', true);
  end if;
  if transfer_row.status <> 'draft' then
    raise exception 'Only a draft stock transfer can be dispatched.';
  end if;
  if not public.can_access_inventory_branch(transfer_row.company_id, transfer_row.from_branch_id) then
    raise exception 'You do not have access to the source inventory branch.';
  end if;

  for line in
    select transfer_line.*, item.base_unit
    from public.stock_transfer_lines transfer_line
    join public.items item on item.id = transfer_line.item_id
    where transfer_line.stock_transfer_id = transfer_row.id
    order by transfer_line.id
    for update of transfer_line
  loop
    if line.quantity <= 0 or line.uom is distinct from line.base_unit then
      raise exception 'Transfer line % has an invalid quantity or UOM.', line.id;
    end if;
    perform public.inventory_lock_item_branch(line.item_id, transfer_row.from_branch_id);
    select coalesce(sum(quantity_in - quantity_out), 0)
      into available_quantity
      from public.stock_transactions
     where item_id = line.item_id and branch_id = transfer_row.from_branch_id and status = 'posted';
    select coalesce(sum(reservation.reserved_quantity - reservation.received_quantity), 0)
      into reserved_quantity
      from public.stock_transfer_reservations reservation
     where reservation.item_id = line.item_id and reservation.from_branch_id = transfer_row.from_branch_id and reservation.status = 'active';
    if available_quantity - reserved_quantity < line.quantity then
      raise exception 'Insufficient unreserved stock for transfer line %.', line.id;
    end if;
    insert into public.stock_transfer_reservations (
      company_id, stock_transfer_id, stock_transfer_line_id, item_id, from_branch_id,
      reserved_quantity, created_by
    ) values (
      transfer_row.company_id, transfer_row.id, line.id, line.item_id, transfer_row.from_branch_id,
      line.quantity, actor_id
    );
    reservation_count := reservation_count + 1;
  end loop;

  if reservation_count = 0 then raise exception 'Cannot dispatch a transfer without lines.'; end if;
  update public.stock_transfers
     set status = 'in_transit', updated_by = actor_id, updated_at = now()
   where id = transfer_row.id and status = 'draft';
  if not found then raise exception 'This transfer changed state. Refresh before dispatching.'; end if;

  if transfer_row.document_id is not null then
    update public.documents
       set status = 'submitted'::public.document_status, approval_status = 'not_required'::public.approval_status, current_step = 'In Transit', submitted_at = now(), updated_by = actor_id
     where id = transfer_row.document_id;
  end if;
  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (transfer_row.company_id, 'stock_transfer', transfer_row.id, 'dispatched', 'Stock transfer ' || transfer_row.transfer_no || ' dispatched; source stock reserved.', jsonb_build_object('transfer_id', transfer_row.id), actor_id);
  return jsonb_build_object('transfer_id', transfer_row.id, 'status', 'in_transit', 'reserved_lines', reservation_count, 'already_dispatched', false);
end;
$$;

create or replace function public.receive_stock_transfer_atomic(p_transfer_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor_id uuid;
  transfer_row public.stock_transfers%rowtype;
  receipt_id uuid := gen_random_uuid();
  request_idempotency_key uuid := nullif(p_payload->>'idempotency_key', '')::uuid;
  line record;
  reservation_row public.stock_transfer_reservations%rowtype;
  receipt_line record;
  requested_quantity numeric;
  remaining_quantity numeric;
  source_balance numeric;
  source_transaction_id uuid;
  destination_transaction_id uuid;
  received_line_count integer := 0;
  received_total numeric := 0;
  next_status public.stock_operation_status;
  line_count integer;
begin
  actor_id := public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_transfer.post') then
    raise exception 'Missing permission: stock_transfer.post';
  end if;
  if request_idempotency_key is null then raise exception 'A receipt idempotency key is required.'; end if;

  select * into transfer_row
    from public.stock_transfers
   where id = p_transfer_id and deleted_at is null
   for update;
  if transfer_row.id is null then raise exception 'Stock transfer was not found.'; end if;
  if not public.can_access_inventory_branch(transfer_row.company_id, transfer_row.to_branch_id) then
    raise exception 'You do not have access to the destination inventory branch.';
  end if;
  if exists (select 1 from public.stock_transfer_receipts where stock_transfer_id = transfer_row.id and stock_transfer_receipts.idempotency_key = request_idempotency_key) then
    select id into receipt_id from public.stock_transfer_receipts where stock_transfer_id = transfer_row.id and stock_transfer_receipts.idempotency_key = request_idempotency_key;
    return jsonb_build_object('transfer_id', transfer_row.id, 'receipt_id', receipt_id, 'status', transfer_row.status, 'already_received', true);
  end if;
  if transfer_row.status <> 'in_transit' then raise exception 'Only an in-transit stock transfer can be received.'; end if;
  if jsonb_typeof(coalesce(p_payload->'lines', 'null'::jsonb)) <> 'array' then raise exception 'Receipt lines are required.'; end if;
  select count(*) into line_count from jsonb_array_elements(p_payload->'lines');
  if line_count = 0 then raise exception 'At least one positive receipt quantity is required.'; end if;

  insert into public.stock_transfer_receipts(id, company_id, stock_transfer_id, idempotency_key, received_by)
  values (receipt_id, transfer_row.company_id, transfer_row.id, request_idempotency_key, actor_id);

  for receipt_line in
    select * from jsonb_to_recordset(p_payload->'lines') as value(line_id text, received_quantity numeric, uom text)
  loop
    requested_quantity := coalesce(receipt_line.received_quantity, 0);
    if requested_quantity = 0 then continue; end if;
    if requested_quantity < 0 or requested_quantity <> round(requested_quantity, 4) then
      raise exception 'Receipt quantities must be non-negative and use at most four decimals.';
    end if;
    select * into line from public.stock_transfer_lines where id = receipt_line.line_id::uuid and stock_transfer_id = transfer_row.id for update;
    if line.id is null then raise exception 'Receipt line does not belong to this transfer.'; end if;
    if receipt_line.uom is distinct from line.uom then raise exception 'Receipt UOM does not match the transfer line.'; end if;
    select * into reservation_row from public.stock_transfer_reservations where stock_transfer_line_id = line.id for update;
    if reservation_row.id is null or reservation_row.status not in ('active','consumed') then raise exception 'Transfer reservation is unavailable.'; end if;
    remaining_quantity := line.quantity - line.received_quantity;
    if requested_quantity > remaining_quantity then raise exception 'Received quantity cannot exceed the remaining transfer quantity.'; end if;
    perform public.inventory_lock_item_branch(line.item_id, transfer_row.from_branch_id);
    perform public.inventory_lock_item_branch(line.item_id, transfer_row.to_branch_id);
    select coalesce(sum(quantity_in - quantity_out), 0) into source_balance
      from public.stock_transactions
     where item_id = line.item_id and branch_id = transfer_row.from_branch_id and status = 'posted';
    if source_balance < requested_quantity then raise exception 'Source stock no longer covers the quantity being received.'; end if;
    source_transaction_id := public.insert_inventory_movement(
      'ST-' || transfer_row.transfer_no || '-' || left(receipt_id::text, 8) || '-out-' || left(line.id::text, 8),
      transfer_row.document_id, transfer_row.from_branch_id, line.item_id, 'transfer_out', transfer_row.transfer_date,
      0, requested_quantity, 0, actor_id, 'Received by destination from ' || transfer_row.transfer_no, 'stock_transfer_receipt', receipt_id
    );
    destination_transaction_id := public.insert_inventory_movement(
      'ST-' || transfer_row.transfer_no || '-' || left(receipt_id::text, 8) || '-in-' || left(line.id::text, 8),
      transfer_row.document_id, transfer_row.to_branch_id, line.item_id, 'transfer_in', transfer_row.transfer_date,
      requested_quantity, 0, 0, actor_id, 'Received into destination for ' || transfer_row.transfer_no, 'stock_transfer_receipt', receipt_id
    );
    insert into public.stock_transfer_receipt_lines(receipt_id, stock_transfer_line_id, received_quantity, uom, source_transaction_id, destination_transaction_id)
    values (receipt_id, line.id, requested_quantity, line.uom, source_transaction_id, destination_transaction_id);
    update public.stock_transfer_lines set received_quantity = stock_transfer_lines.received_quantity + requested_quantity where id = line.id;
    update public.stock_transfer_reservations reservation
       set received_quantity = reservation.received_quantity + requested_quantity,
           status = case when reservation.received_quantity + requested_quantity >= reservation.reserved_quantity then 'consumed' else 'active' end,
           updated_at = now()
     where reservation.id = reservation_row.id;
    received_line_count := received_line_count + 1;
    received_total := received_total + requested_quantity;
  end loop;

  if received_line_count = 0 then raise exception 'At least one positive receipt quantity is required.'; end if;
  if exists (select 1 from public.stock_transfer_lines where stock_transfer_id = transfer_row.id and received_quantity < quantity) then
    next_status := 'in_transit';
  else
    next_status := 'completed';
    update public.stock_transfer_reservations set status = 'consumed', updated_at = now() where stock_transfer_id = transfer_row.id and status = 'active';
  end if;
  update public.stock_transfers set status = next_status, posted_at = case when next_status = 'completed' then now() else posted_at end, updated_by = actor_id, updated_at = now() where id = transfer_row.id;
  if transfer_row.document_id is not null then
    update public.documents
       set status = (case when next_status = 'completed' then 'posted' else 'submitted' end)::public.document_status,
           approval_status = 'not_required'::public.approval_status,
           current_step = case when next_status = 'completed' then 'Posted to stock' else 'Partially received' end,
           posted_at = case when next_status = 'completed' then now() else posted_at end,
           updated_by = actor_id
     where id = transfer_row.document_id;
  end if;
  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (transfer_row.company_id, 'stock_transfer', transfer_row.id, 'received', 'Stock transfer ' || transfer_row.transfer_no || ' received: ' || received_total || '.', jsonb_build_object('transfer_id', transfer_row.id, 'receipt_id', receipt_id, 'status', next_status), actor_id);
  return jsonb_build_object('transfer_id', transfer_row.id, 'receipt_id', receipt_id, 'status', next_status, 'received_lines', received_line_count, 'received_quantity', received_total, 'already_received', false);
end;
$$;

create or replace function public.transition_stock_transfer_terminal_atomic(p_transfer_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor_id uuid;
  transfer_row public.stock_transfers%rowtype;
  next_status public.stock_operation_status;
begin
  actor_id := public.current_staff_id();
  if actor_id is null then raise exception 'An active staff profile is required.'; end if;
  if p_action = 'cancel' then
    if not public.has_permission('stock_transfer.cancel') then raise exception 'Missing permission: stock_transfer.cancel'; end if;
    next_status := 'cancelled';
  elsif p_action = 'reject' then
    if not public.has_permission('stock_transfer.update') then raise exception 'Missing permission: stock_transfer.update'; end if;
    next_status := 'rejected';
  else
    raise exception 'Unsupported stock transfer terminal action.';
  end if;
  select * into transfer_row from public.stock_transfers where id = p_transfer_id and deleted_at is null for update;
  if transfer_row.id is null then raise exception 'Stock transfer was not found.'; end if;
  if transfer_row.status not in ('draft','in_transit') then raise exception 'Only an unposted draft or in-transit stock transfer can be cancelled or rejected.'; end if;
    if next_status = 'cancelled' and not public.can_access_inventory_branch(transfer_row.company_id, transfer_row.from_branch_id) then
      raise exception 'You do not have access to the source inventory branch.';
    end if;
    if next_status = 'rejected' and not public.can_access_inventory_branch(transfer_row.company_id, transfer_row.to_branch_id) then
      raise exception 'You do not have access to the destination inventory branch.';
    end if;
  update public.stock_transfer_reservations set status = 'released', released_at = now(), updated_at = now() where stock_transfer_id = transfer_row.id and status = 'active';
  update public.stock_transfers set status = next_status, updated_by = actor_id, updated_at = now() where id = transfer_row.id;
  if transfer_row.document_id is not null then
    update public.documents set status = next_status::text::public.document_status, approval_status = next_status::text::public.approval_status, current_step = initcap(next_status::text), updated_by = actor_id, cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end where id = transfer_row.document_id;
  end if;
  insert into public.activity_logs(company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (transfer_row.company_id, 'stock_transfer', transfer_row.id, lower(next_status::text), 'Stock transfer ' || transfer_row.transfer_no || ' ' || lower(next_status::text) || '; reservation released.', jsonb_build_object('transfer_id', transfer_row.id), actor_id);
  return jsonb_build_object('id', transfer_row.id, 'status', next_status);
end;
$$;

revoke all on function public.dispatch_stock_transfer_atomic(uuid), public.receive_stock_transfer_atomic(uuid, jsonb), public.transition_stock_transfer_terminal_atomic(uuid, text) from public, anon;
grant execute on function public.dispatch_stock_transfer_atomic(uuid), public.receive_stock_transfer_atomic(uuid, jsonb), public.transition_stock_transfer_terminal_atomic(uuid, text) to authenticated;
