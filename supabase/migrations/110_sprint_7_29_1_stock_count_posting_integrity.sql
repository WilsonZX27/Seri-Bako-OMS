-- Sprint 7.29.1: Stock Count posting integrity closure.
-- Draft quantities remain editable and inert. Confirm & Post is the only
-- terminal transition for new counts and it is one atomic transaction.

create sequence if not exists public.stock_count_line_position_seq;

alter table public.stock_count_lines
  add column if not exists line_position bigint;

-- Preserve the deterministic order already visible to users before introducing
-- the explicit sequence. UUID order is only the final tie breaker for legacy
-- rows whose timestamps are equal.
with ranked as (
  select id, row_number() over (
    partition by stock_count_id
    order by created_at asc nulls first, id asc
  )::bigint as position
  from public.stock_count_lines
  where line_position is null
)
update public.stock_count_lines lines
set line_position = ranked.position
from ranked
where lines.id = ranked.id;

select setval(
  'public.stock_count_line_position_seq'::regclass,
  greatest(coalesce((select max(line_position) from public.stock_count_lines), 0), 1),
  true
);

alter table public.stock_count_lines
  alter column line_position set default nextval('public.stock_count_line_position_seq'::regclass),
  alter column line_position set not null;

create unique index if not exists stock_count_lines_count_position_idx
  on public.stock_count_lines(stock_count_id, line_position);

alter table public.stock_counts
  add column if not exists posting_reference text;

update public.stock_counts
set posting_reference = 'SC-' || count_no
where status = 'posted' and posting_reference is null;

create unique index if not exists stock_counts_company_posting_reference_idx
  on public.stock_counts(company_id, posting_reference)
  where posting_reference is not null and deleted_at is null;

-- Kitchen owns assigned Central Kitchen stock counts in the six-role model.
-- Grant only the canonical inventory read and Stock Count permissions required
-- for that workflow; this does not copy Purchasing permissions or widen branch
-- scope. Fail closed instead of silently skipping a missing role or permission.
do $$
declare
  required_permissions text[] := array[
    'inventory.read',
    'stock.view',
    'stock_balance.read',
    'stock_transactions.read',
    'stock_count.read',
    'stock_count.create',
    'stock_count.update',
    'stock_count.post'
  ];
  missing_permissions text[];
  kitchen_role_count integer;
  granted_count integer;
begin
  select count(*) into kitchen_role_count
  from public.roles
  where role_code = 'kitchen'
    and status = 'active'
    and deleted_at is null;

  if kitchen_role_count = 0 then
    raise exception 'Migration 110 requires at least one active Kitchen role.';
  end if;

  select array_agg(required.permission_code order by required.permission_code)
  into missing_permissions
  from unnest(required_permissions) as required(permission_code)
  where not exists (
    select 1
    from public.permissions permission
    where permission.permission_code = required.permission_code
  );

  if missing_permissions is not null then
    raise exception 'Migration 110 is missing canonical permissions: %',
      array_to_string(missing_permissions, ', ');
  end if;

  insert into public.role_permissions (role_id, permission_id)
  select role.id, permission.id
  from public.roles role
  cross join public.permissions permission
  where role.role_code = 'kitchen'
    and role.status = 'active'
    and role.deleted_at is null
    and permission.permission_code = any(required_permissions)
  on conflict (role_id, permission_id) do nothing;

  select count(*)
  into granted_count
  from public.role_permissions role_permission
  join public.permissions permission on permission.id = role_permission.permission_id
  join public.roles role on role.id = role_permission.role_id
  where role.role_code = 'kitchen'
    and role.status = 'active'
    and role.deleted_at is null
    and permission.permission_code = any(required_permissions);

  if granted_count <> kitchen_role_count * cardinality(required_permissions) then
    raise exception 'Migration 110 granted % of % required Kitchen role-permission pairs.',
      granted_count, kitchen_role_count * cardinality(required_permissions);
  end if;
end;
$$;

-- A draft edit validates against the authoritative item/UOM and current draft
-- line set. The theoretical snapshot is never client-controlled.
create or replace function public.update_stock_count_draft_atomic(
  p_stock_count_id uuid,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
  submitted jsonb;
  submitted_count integer;
  existing_count integer;
  changed_count integer := 0;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;

  if actor.id is null or not public.has_permission('stock_count.update') then
    raise exception 'Missing permission: stock_count.update';
  end if;

  select * into count_row
  from public.stock_counts
  where id = p_stock_count_id and deleted_at is null
  for update;

  if count_row.id is null or count_row.status <> 'draft'
    or not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then
    raise exception 'Only an accessible draft stock count can be edited.';
  end if;

  if jsonb_typeof(coalesce(p_payload->'lines', 'null'::jsonb)) <> 'array'
    or jsonb_array_length(p_payload->'lines') = 0 then
    raise exception 'A stock count draft must contain at least one line.';
  end if;

  select count(*) into submitted_count
  from jsonb_array_elements(p_payload->'lines');
  select count(*) into existing_count
  from public.stock_count_lines
  where stock_count_id = count_row.id;
  if submitted_count <> existing_count then
    raise exception 'Draft lines changed. Refresh the count before saving.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_payload->'lines') as submitted(
      line_id text, item_id text, physical_qty text, uom text, remarks text
    )
    group by submitted.line_id
    having count(*) <> 1
  ) then
    raise exception 'Each draft line must be present exactly once.';
  end if;

  for submitted in select value from jsonb_array_elements(p_payload->'lines') loop
    if not exists (
      select 1
      from public.stock_count_lines line
      join public.items item on item.id = line.item_id
      where line.id = (submitted->>'line_id')::uuid
        and line.stock_count_id = count_row.id
        and line.item_id = (submitted->>'item_id')::uuid
        and item.company_id = count_row.company_id
        and item.status = 'active'
        and item.deleted_at is null
        and item.base_unit = nullif(trim(submitted->>'uom'), '')
        and submitted->>'physical_qty' is not null
        and (submitted->>'physical_qty')::numeric between 0 and 1000000
        and (submitted->>'physical_qty')::numeric = round((submitted->>'physical_qty')::numeric, 4)
        and (
          lower(trim(item.base_unit)) in ('kg','g','l','ml','ltr','liter','litre')
          or (submitted->>'physical_qty')::numeric = trunc((submitted->>'physical_qty')::numeric)
        )
    ) then
      raise exception 'Draft quantity, item, or UOM is invalid.';
    end if;

    update public.stock_count_lines
    set physical_qty = (submitted->>'physical_qty')::numeric,
        remarks = nullif(trim(submitted->>'remarks'), '')
    where id = (submitted->>'line_id')::uuid
      and stock_count_id = count_row.id;
    changed_count := changed_count + 1;
  end loop;

  update public.stock_counts
  set remarks = nullif(trim(p_payload->>'remarks'), ''), updated_by = actor.id
  where id = count_row.id and status = 'draft';

  return jsonb_build_object(
    'id', count_row.id,
    'count_no', count_row.count_no,
    'updated_lines', changed_count,
    'status', 'draft'
  );
end;
$$;

-- Replace the old approved-only implementation. The row lock, per-item
-- advisory locks, snapshot check, deterministic references and status update
-- all run in one transaction; any exception rolls back every movement.
create or replace function public.post_stock_count_atomic(p_stock_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  count_row public.stock_counts%rowtype;
  line public.stock_count_lines%rowtype;
  current_balance numeric;
  variance numeric;
  line_count integer := 0;
  adjusted_count integer := 0;
  unchanged_count integer := 0;
  posting_ref text;
  transaction_ref text;
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_permission('stock_count.post') then
    raise exception 'Missing permission: stock_count.post';
  end if;

  select * into count_row
  from public.stock_counts
  where id = p_stock_count_id and deleted_at is null
  for update;
  if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id, count_row.branch_id) then
    raise exception 'Stock count is unavailable for this branch.';
  end if;
  if count_row.status = 'posted' then
    return jsonb_build_object('id', count_row.id, 'count_no', count_row.count_no, 'already_posted', true);
  end if;
  if count_row.status not in ('draft', 'submitted', 'reviewed', 'approved') then
    raise exception 'Only draft or legacy pending stock counts can be confirmed and posted.';
  end if;

  posting_ref := coalesce(count_row.posting_reference, 'SC-' || count_row.count_no);
  if exists (
    select 1 from public.stock_counts other
    where other.company_id = count_row.company_id
      and other.posting_reference = posting_ref
      and other.id <> count_row.id
      and other.deleted_at is null
  ) then
    raise exception 'Posting reference collision. Refresh and retry.';
  end if;

  for line in
    select * from public.stock_count_lines
    where stock_count_id = count_row.id
    order by line_position asc, id asc
    for update
  loop
    line_count := line_count + 1;
    if line.line_position is null or line.line_position < 1
      or line.theoretical_qty < 0 or line.physical_qty < 0
      or line.physical_qty > 1000000
      or line.physical_qty <> round(line.physical_qty, 4)
      or not exists (
        select 1 from public.items item
        where item.id = line.item_id
          and item.company_id = count_row.company_id
          and item.status = 'active'
          and item.deleted_at is null
          and item.base_unit = line.uom
          and (
            lower(trim(item.base_unit)) in ('kg','g','l','ml','ltr','liter','litre')
            or line.physical_qty = trunc(line.physical_qty)
          )
      ) then
      raise exception 'Stock count line % failed item, UOM, or quantity validation.', line.line_position;
    end if;

    perform public.inventory_lock_item_branch(line.item_id, count_row.branch_id);
    select coalesce(sum(quantity_in - quantity_out), 0)
    into current_balance
    from public.stock_transactions
    where item_id = line.item_id and branch_id = count_row.branch_id and status = 'posted';

    -- Theoretical quantity is the draft snapshot. A later GRN, issue, transfer,
    -- return, or other adjustment must be acknowledged rather than silently
    -- overwritten by this count.
    if current_balance is distinct from line.theoretical_qty then
      raise exception 'Stock changed since this draft was created for item %; refresh and recount before posting.', line.item_id;
    end if;

    variance := line.physical_qty - line.theoretical_qty;
    if variance = 0 then
      unchanged_count := unchanged_count + 1;
      continue;
    end if;

    transaction_ref := 'ST-' || count_row.count_no || '-' || line.line_position;
    if exists (select 1 from public.stock_transactions where transaction_no = transaction_ref) then
      raise exception 'Stock Count transaction reference already exists: %.', transaction_ref;
    end if;
    perform public.insert_inventory_movement(
      transaction_ref,
      count_row.document_id,
      count_row.branch_id,
      line.item_id,
      'stock_count_adjustment',
      count_row.count_date,
      greatest(variance, 0),
      greatest(-variance, 0),
      0,
      actor.id,
      'Adjusted by Stock Count ' || count_row.count_no,
      'stock_count',
      count_row.id
    );
    adjusted_count := adjusted_count + 1;
  end loop;

  if line_count = 0 then
    raise exception 'A stock count cannot be posted without lines.';
  end if;

  update public.stock_counts
  set status = 'posted',
      posting_reference = posting_ref,
      posted_at = now(),
      updated_by = actor.id
  where id = count_row.id
    and status in ('draft', 'submitted', 'reviewed', 'approved');
  if not found then
    raise exception 'This stock count changed state. Refresh before trying again.';
  end if;

  if count_row.document_id is not null then
    update public.documents
    set status = 'posted',
        approval_status = 'not_required',
        current_step = 'Posted to stock',
        posted_at = now(),
        updated_by = actor.id
    where id = count_row.document_id;
  end if;

  return jsonb_build_object(
    'id', count_row.id,
    'count_no', count_row.count_no,
    'document_id', count_row.document_id,
    'posting_reference', posting_ref,
    'adjusted_count', adjusted_count,
    'unchanged_count', unchanged_count,
    'already_posted', false
  );
end;
$$;

revoke all on function public.update_stock_count_draft_atomic(uuid, jsonb), public.post_stock_count_atomic(uuid) from public, anon;
grant execute on function public.update_stock_count_draft_atomic(uuid, jsonb), public.post_stock_count_atomic(uuid) to authenticated;

-- New counts do not use the review/approval transitions. Keep the permission
-- rows for historical read compatibility, but remove them from current roles
-- and remove the obsolete approval RPC itself.
delete from public.role_permissions
where permission_id in (
  select id from public.permissions
  where permission_code in ('stock_count.submit','stock_count.review','stock_count.approve')
);
drop function if exists public.approve_stock_count_atomic(uuid);

drop policy if exists "tenant stock counts" on public.stock_counts;
drop policy if exists "stock counts update" on public.stock_counts;
create policy "tenant stock counts" on public.stock_counts
for all to authenticated
using (
  public.can_access_company_branch(company_id, branch_id)
  and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update','stock_count.post','stock_count.cancel'])
)
with check (
  public.can_access_company_branch(company_id, branch_id)
  and public.has_any_permission(array['stock_count.create','stock_count.update','stock_count.cancel'])
);

drop policy if exists "stock count lines manage" on public.stock_count_lines;
create policy "stock count lines manage" on public.stock_count_lines
for all to authenticated
using (
  exists (
    select 1 from public.stock_counts count_row
    where count_row.id = stock_count_lines.stock_count_id
      and public.can_access_company_branch(count_row.company_id, count_row.branch_id)
      and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update'])
  )
)
with check (
  exists (
    select 1 from public.stock_counts count_row
    where count_row.id = stock_count_lines.stock_count_id
      and public.can_access_company_branch(count_row.company_id, count_row.branch_id)
      and public.has_any_permission(array['stock_count.create','stock_count.update'])
  )
);
