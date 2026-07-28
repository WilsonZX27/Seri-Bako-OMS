-- v7.24.31 (unreleased): Stock Count drafts are one tenant-scoped,
-- idempotent aggregate. A failed document, header, or line write rolls back
-- the complete draft rather than leaving an orphaned operational record.

alter table public.stock_counts
  add column if not exists idempotency_key uuid;

create unique index if not exists stock_counts_idempotency_key_idx
  on public.stock_counts(company_id, idempotency_key)
  where idempotency_key is not null and deleted_at is null;

create or replace function public.create_stock_count_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  existing public.stock_counts%rowtype;
  v_count_id uuid;
  v_document_id uuid;
  v_count_no text := nullif(trim(p_payload->>'count_no'), '');
  v_count_date date := nullif(p_payload->>'count_date', '')::date;
  v_branch_id uuid := nullif(p_payload->>'branch_id', '')::uuid;
  v_idempotency_key uuid := nullif(p_payload->>'idempotency_key', '')::uuid;
  v_tolerance numeric := nullif(p_payload->>'tolerance_percent', '')::numeric;
  v_lines jsonb := coalesce(p_payload->'lines', '[]'::jsonb);
  v_submitted_line_count integer;
  v_expected_line_count integer;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Stock count payload must be an object.';
  end if;

  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null or not public.has_permission('stock_count.create') then
    raise exception 'Missing permission: stock_count.create';
  end if;

  if jsonb_typeof(v_lines) <> 'array'
    or jsonb_array_length(v_lines) = 0
    or jsonb_array_length(v_lines) > 500 then
    raise exception 'A stock count must contain between 1 and 500 lines.';
  end if;

  if v_branch_id is null or v_count_date is null or v_tolerance is null
    or v_tolerance < 0 or v_tolerance > 100 or v_idempotency_key is null then
    raise exception 'A valid branch, YYYY-MM-DD count date, tolerance, and idempotency key are required.';
  end if;

  if not public.can_access_inventory_branch(actor.company_id, v_branch_id)
    or not exists (
      select 1
      from public.branches
      where id = v_branch_id
        and company_id = actor.company_id
        and status = 'active'
        and deleted_at is null
    ) then
    raise exception 'Stock count branch is outside your active company scope.';
  end if;

  select * into existing
  from public.stock_counts
  where company_id = actor.company_id
    and idempotency_key = v_idempotency_key
    and deleted_at is null
  for update;

  if existing.id is not null then
    return jsonb_build_object(
      'id', existing.id,
      'count_no', existing.count_no,
      'document_id', existing.document_id,
      'idempotent', true
    );
  end if;

  select count(*) into v_submitted_line_count
  from jsonb_to_recordset(v_lines) as submitted(
    item_id text,
    physical_qty text,
    uom text,
    remarks text
  );

  if exists (
    select 1
    from jsonb_to_recordset(v_lines) as submitted(
      item_id text,
      physical_qty text,
      uom text,
      remarks text
    )
    group by submitted.item_id
    having count(*) > 1
  ) then
    raise exception 'Each item can appear only once in a stock count.';
  end if;

  select count(*) into v_expected_line_count
  from public.stock_balances_view balance
  where balance.branch_id = v_branch_id;

  if v_expected_line_count <> v_submitted_line_count or exists (
    select 1
    from jsonb_to_recordset(v_lines) as submitted(
      item_id text,
      physical_qty text,
      uom text,
      remarks text
    )
    left join public.stock_balances_view balance
      on balance.branch_id = v_branch_id
      and balance.item_id = submitted.item_id::uuid
    left join public.items item
      on item.id = submitted.item_id::uuid
      and item.company_id = actor.company_id
      and item.status = 'active'
      and item.deleted_at is null
    where balance.item_id is null
      or item.id is null
      or nullif(trim(submitted.uom), '') is distinct from balance.base_unit
      or submitted.physical_qty is null
      or submitted.physical_qty::numeric < 0
      or submitted.physical_qty::numeric > 1000000
      or (lower(trim(balance.base_unit)) not in ('kg', 'g', 'l', 'ml', 'ltr', 'liter', 'litre')
          and submitted.physical_qty::numeric <> trunc(submitted.physical_qty::numeric))
      or length(coalesce(submitted.remarks, '')) > 1000
  ) then
    raise exception 'Stock count lines must exactly match active branch stock and use valid quantities and units.';
  end if;

  -- Number allocation shares this transaction. If any subsequent insert fails,
  -- PostgreSQL rolls the sequence period update back with the draft.
  if v_count_no is null then
    v_count_no := public.next_document_number(actor.company_id, 'stock_count');
  end if;
  if length(v_count_no) > 96 then
    raise exception 'Stock count number is too long.';
  end if;

  if exists (
    select 1 from public.stock_counts
    where company_id = actor.company_id
      and count_no = v_count_no
      and deleted_at is null
  ) or exists (
    select 1 from public.documents
    where company_id = actor.company_id
      and document_no = v_count_no
  ) then
    raise exception 'Stock count number is already in use.';
  end if;

  v_count_id := gen_random_uuid();
  v_document_id := gen_random_uuid();

  insert into public.documents (
    id, company_id, document_no, document_type, title, status,
    approval_status, current_step, related_entity_type, related_entity_id,
    created_by, updated_by
  ) values (
    v_document_id, actor.company_id, v_count_no, 'stock_count', 'Stock Count ' || v_count_no,
    'draft', 'draft', 'Kitchen counting', 'stock_count', v_count_id, actor.id, actor.id
  );

  insert into public.stock_counts (
    id, company_id, document_id, count_no, count_date, branch_id, counted_by,
    status, tolerance_percent, remarks, created_by, updated_by, idempotency_key
  ) values (
    v_count_id, actor.company_id, v_document_id, v_count_no, v_count_date, v_branch_id, actor.id,
    'draft', v_tolerance, nullif(trim(p_payload->>'remarks'), ''), actor.id, actor.id,
    v_idempotency_key
  );

  -- The ledger-owned balance and master-data UOM are authoritative. Client
  -- theoretical quantities are intentionally ignored.
  insert into public.stock_count_lines (
    stock_count_id, item_id, theoretical_qty, physical_qty, uom, remarks
  )
  select
    v_count_id,
    balance.item_id,
    balance.current_qty,
    submitted.physical_qty::numeric,
    balance.base_unit,
    nullif(trim(submitted.remarks), '')
  from jsonb_to_recordset(v_lines) as submitted(
    item_id text,
    physical_qty text,
    uom text,
    remarks text
  )
  join public.stock_balances_view balance
    on balance.branch_id = v_branch_id
    and balance.item_id = submitted.item_id::uuid;

  insert into public.document_revisions (
    document_id, revision_no, change_summary, changed_by
  ) values (
    v_document_id, 1, 'Initial stock count created.', actor.id
  );

  insert into public.activity_logs (
    company_id, entity_type, entity_id, activity_type, message, metadata, created_by
  ) values (
    actor.company_id, 'document', v_document_id, 'created', 'Stock count ' || v_count_no || ' created',
    jsonb_build_object('stock_count_id', v_count_id, 'branch_id', v_branch_id), actor.id
  );

  return jsonb_build_object(
    'id', v_count_id,
    'count_no', v_count_no,
    'document_id', v_document_id,
    'idempotent', false
  );
end;
$$;

revoke all on function public.create_stock_count_atomic(jsonb) from public, anon;
grant execute on function public.create_stock_count_atomic(jsonb) to authenticated;
