-- Sprint 7.23.8.5: purchase-return drafts are one locked database aggregate.
alter table public.purchase_returns add column if not exists idempotency_key uuid;
create unique index if not exists purchase_returns_idempotency_key_idx
  on public.purchase_returns(company_id, idempotency_key)
  where idempotency_key is not null and deleted_at is null;

create or replace function public.create_purchase_return_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  grn public.goods_receivings%rowtype;
  existing public.purchase_returns%rowtype;
  return_id uuid;
  document_id uuid;
  return_no text := nullif(trim(p_payload->>'purchase_return_no'), '');
  grn_id uuid := nullif(p_payload->>'goods_receiving_id', '')::uuid;
  return_date date := coalesce(nullif(p_payload->>'return_date', '')::date, current_date);
  idem uuid := nullif(p_payload->>'idempotency_key', '')::uuid;
  lines jsonb := coalesce(p_payload->'lines', '[]'::jsonb);
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_permission('purchase_return.create') then
    raise exception 'Missing permission: purchase_return.create';
  end if;
  if return_no is null or grn_id is null or jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) = 0 then
    raise exception 'Return number, posted GRN, and at least one return line are required.';
  end if;
  select * into grn
  from public.goods_receivings
  where id = grn_id and company_id = actor.company_id and deleted_at is null
  for update;
  if grn.id is null or grn.status <> 'posted' then
    raise exception 'Only a posted GRN in your company can be returned.';
  end if;
  if not public.can_access_inventory_branch(grn.company_id, grn.branch_id) then
    raise exception 'You do not have access to this inventory branch.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(lines) as x(goods_receiving_line_id text, return_qty text)
    group by x.goods_receiving_line_id having count(*) <> 1
  ) then
    raise exception 'A receiving line may only appear once in a purchase return.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(lines) as x(goods_receiving_line_id text, item_id text, purchase_order_line_id text, return_qty text, uom text, reason text)
    left join public.goods_receiving_lines gl on gl.id = x.goods_receiving_line_id::uuid and gl.goods_receiving_id = grn.id
    left join public.items i on i.id = gl.item_id
    where gl.id is null or i.company_id <> actor.company_id or i.status <> 'active' or i.deleted_at is not null
      or x.item_id::uuid <> gl.item_id or x.purchase_order_line_id::uuid <> gl.purchase_order_line_id
      or nullif(trim(x.uom), '') <> gl.uom or coalesce(x.return_qty::numeric, 0) <= 0
      or x.return_qty::numeric > gl.received_qty - gl.returned_qty
  ) then
    raise exception 'Every return line must match a returnable receiving line in the posted GRN.';
  end if;
  select * into existing
  from public.purchase_returns
  where company_id = actor.company_id and idempotency_key = idem and idem is not null and deleted_at is null
  for update;
  if existing.id is not null then
    return jsonb_build_object('id', existing.id, 'purchase_return_no', existing.purchase_return_no, 'document_id', existing.document_id, 'idempotent', true);
  end if;
  return_id := gen_random_uuid();
  document_id := gen_random_uuid();
  insert into public.documents (id, company_id, document_no, document_type, title, status, approval_status, current_step, related_entity_type, related_entity_id, created_by, updated_by)
  values (document_id, actor.company_id, return_no, 'purchase_return', 'Purchase Return ' || return_no,
    'draft', 'not_required', 'Draft return', 'purchase_return', return_id, actor.id, actor.id);
  insert into public.purchase_returns (id, company_id, document_id, purchase_return_no, goods_receiving_id, purchase_order_id, supplier_id, branch_id, location_id, return_date, status, reason, remarks, created_by, updated_by, idempotency_key)
  values (return_id, actor.company_id, document_id, return_no, grn.id, grn.purchase_order_id, grn.supplier_id, grn.branch_id,
    grn.location_id, return_date, 'draft', nullif(trim(p_payload->>'reason'), ''), nullif(trim(p_payload->>'remarks'), ''), actor.id, actor.id, idem);
  insert into public.purchase_return_lines (purchase_return_id, goods_receiving_line_id, purchase_order_line_id, item_id, received_qty, previously_returned_qty, return_qty, uom, unit_cost, reason)
  select return_id, gl.id, gl.purchase_order_line_id, gl.item_id, gl.received_qty, gl.returned_qty,
    x.return_qty::numeric, gl.uom, gl.unit_cost, nullif(trim(x.reason), '')
  from jsonb_to_recordset(lines) as x(goods_receiving_line_id text, item_id text, purchase_order_line_id text, return_qty text, uom text, reason text)
  join public.goods_receiving_lines gl on gl.id = x.goods_receiving_line_id::uuid and gl.goods_receiving_id = grn.id;
  insert into public.document_revisions (document_id, revision_no, change_summary, changed_by)
  values (document_id, 1, 'Initial purchase return created.', actor.id);
  insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values (actor.company_id, 'document', document_id, 'created', 'Purchase return ' || return_no || ' created', jsonb_build_object('purchase_return_id', return_id), actor.id);
  return jsonb_build_object('id', return_id, 'purchase_return_no', return_no, 'document_id', document_id, 'idempotent', false);
end $$;

revoke all on function public.create_purchase_return_atomic(jsonb) from public, anon;
grant execute on function public.create_purchase_return_atomic(jsonb) to authenticated;
