-- PR to PO conversion repair.
--
-- The previous patch (165) attempted to rewrite the conversion function by
-- matching pg_get_functiondef text.  That is fragile across formatting and
-- left some environments inserting purchase_orders without an
-- idempotency_key, which the purchase-order invariant trigger rejects.
-- Recreate the function explicitly and keep all conversion writes atomic.

alter table public.purchase_orders
  add column if not exists idempotency_key uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchase_orders'
      and column_name = 'idempotency_key'
  ) then
    raise exception 'IDEMPOTENCY_MIGRATION_PENDING';
  end if;
end
$$;

create unique index if not exists purchase_orders_idempotency_key_idx
  on public.purchase_orders(company_id, idempotency_key)
  where idempotency_key is not null and deleted_at is null;

create or replace function public.convert_purchase_request_to_purchase_order(
  target_purchase_request_id uuid,
  target_po_no text
)
returns table (purchase_order_id uuid, purchase_order_no text, purchase_request_no text, already_existed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  existing_order public.purchase_orders%rowtype;
  selected_supplier_id uuid;
  supplier_count integer;
  new_order_id uuid := gen_random_uuid();
  new_document_id uuid := gen_random_uuid();
  conversion_idempotency_key uuid := gen_random_uuid();
  normalized_po_no text := nullif(trim(target_po_no), '');
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1;

  if actor.id is null then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  if not public.has_any_permission(array['pr.convert_to_po', 'purchase_request.convert']) then
    raise exception 'CONVERSION_PERMISSION_DENIED';
  end if;

  if normalized_po_no is null then
    raise exception 'PO_NUMBER_REQUIRED';
  end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id
    and deleted_at is null
  for update;

  if request_row.id is null
    or request_row.company_id is distinct from actor.company_id then
    raise exception 'PR_NOT_FOUND';
  end if;

  if request_row.branch_id is null then
    raise exception 'PR_BRANCH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.branches b
    where b.id = request_row.branch_id
      and b.company_id = actor.company_id
      and b.deleted_at is null
  ) then
    raise exception 'PR_BRANCH_INVALID';
  end if;

  if request_row.branch_id is not null
    and not public.has_any_permission(array['pr.view_all', 'purchase_request.read_all'])
    and not exists (
      select 1
      from public.staff_branches sb
      where sb.staff_id = actor.id
        and sb.branch_id = request_row.branch_id
    )
  then
    raise exception 'CONVERSION_PERMISSION_DENIED';
  end if;

  select * into existing_order
  from public.purchase_orders
  where purchase_request_id = request_row.id
    and company_id = actor.company_id
    and deleted_at is null
  order by created_at
  limit 1;

  if existing_order.id is not null then
    return query select existing_order.id, existing_order.po_no, request_row.request_no, true;
    return;
  end if;

  if request_row.status::text <> 'ready_to_convert' then
    raise exception 'PR_NOT_READY';
  end if;

  if not exists (
    select 1
    from public.purchase_request_lines
    where purchase_request_id = request_row.id
  ) then
    raise exception 'PR_HAS_NO_LINES';
  end if;

  if exists (
    select 1
    from public.purchase_request_lines l
    left join public.items i on i.id = l.item_id
      and i.status = 'active'
      and i.deleted_at is null
    where l.purchase_request_id = request_row.id
      and i.id is null
  ) then
    raise exception 'PR_HAS_INVALID_LINES';
  end if;

  if exists (
    select 1
    from public.purchase_request_lines
    where purchase_request_id = request_row.id
      and suggested_supplier_id is null
  ) then
    raise exception 'PR_SUPPLIER_REQUIRED';
  end if;

  select count(distinct suggested_supplier_id)
    into supplier_count
  from public.purchase_request_lines
  where purchase_request_id = request_row.id;

  if supplier_count <> 1 then
    raise exception 'PR_HAS_MULTIPLE_SUPPLIERS';
  end if;

  select suggested_supplier_id
    into selected_supplier_id
  from public.purchase_request_lines
  where purchase_request_id = request_row.id
  limit 1;

  if selected_supplier_id is null then
    raise exception 'PR_SUPPLIER_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.suppliers s
    where s.id = selected_supplier_id
      and s.company_id = actor.company_id
      and s.status = 'active'
      and s.deleted_at is null
  ) then
    raise exception 'SUPPLIER_NOT_ACTIVE';
  end if;

  if exists (
    select 1
    from public.purchase_orders po
    where po.company_id = actor.company_id
      and po.po_no = normalized_po_no
      and po.deleted_at is null
  ) then
    raise exception 'PO_NUMBER_ALREADY_USED';
  end if;

  begin
    insert into public.documents (
      id, company_id, document_no, document_type, title, status, approval_status,
      current_step, related_entity_type, related_entity_id, created_by, updated_by
    ) values (
      new_document_id, actor.company_id, normalized_po_no, 'purchase_order',
      'Purchase Order ' || normalized_po_no, 'approved', 'approved', 'Approved',
      'purchase_order', new_order_id, actor.id, actor.id
    );

    insert into public.document_revisions (document_id, revision_no, change_summary, changed_by)
    values (new_document_id, 1, 'Initial document created.', actor.id);

    insert into public.purchase_orders (
      id, company_id, document_id, purchase_request_id, branch_id, po_no, supplier_id,
      order_date, expected_delivery_date, priority, needed_by_date, urgency_reason,
      production_risk, status, approval_status, remarks, created_by, updated_by,
      idempotency_key
    ) values (
      new_order_id, request_row.company_id, new_document_id, request_row.id,
      request_row.branch_id, normalized_po_no, selected_supplier_id,
      request_row.request_date,
      coalesce(request_row.needed_by_date, request_row.required_date),
      request_row.priority,
      coalesce(request_row.needed_by_date, request_row.required_date),
      request_row.urgency_reason,
      request_row.production_risk, 'approved', 'approved',
      case when request_row.remarks is null
        then 'Created from ' || request_row.request_no || '.'
        else 'Created from ' || request_row.request_no || '. ' || request_row.remarks
      end,
      actor.id, actor.id, conversion_idempotency_key
    );
  exception
    when unique_violation then
      raise exception 'PO_NUMBER_ALREADY_USED';
  end;

  insert into public.purchase_order_lines (
    purchase_order_id, item_id, qty_ordered, qty_received, qty_cancelled, uom, unit_price
  )
  select new_order_id, item_id, qty, 0, 0, uom, estimated_unit_cost
  from public.purchase_request_lines
  where purchase_request_id = request_row.id;

  update public.purchase_requests
  set status = 'converted_to_po', updated_by = actor.id
  where id = request_row.id;

  if request_row.document_id is not null then
    update public.documents
    set status = 'approved', approval_status = 'approved', current_step = 'Converted', updated_by = actor.id
    where id = request_row.document_id;
  end if;

  insert into public.activity_logs (company_id, entity_type, entity_id, activity_type, message, metadata, created_by)
  values
    (
      actor.company_id, 'document', new_document_id, 'created',
      'Purchase Order ' || normalized_po_no || ' created from ' || request_row.request_no || '.',
      jsonb_build_object(
        'purchase_request_id', request_row.id,
        'source', 'purchase_request_conversion',
        'idempotency_key', conversion_idempotency_key,
        'purchase_order_no', normalized_po_no
      ),
      actor.id
    ),
    (
      actor.company_id, 'document', coalesce(request_row.document_id, request_row.id), 'converted',
      'Purchase request ' || request_row.request_no || ' converted to ' || normalized_po_no,
      jsonb_build_object(
        'workflow_step', 'ready_to_convert',
        'purchase_order_id', new_order_id,
        'purchase_order_no', normalized_po_no,
        'source', 'purchase_request_conversion',
        'idempotency_key', conversion_idempotency_key
      ),
      actor.id
    );

  return query select new_order_id, normalized_po_no, request_row.request_no, false;
end
$$;

revoke all on function public.convert_purchase_request_to_purchase_order(uuid, text) from public;
grant execute on function public.convert_purchase_request_to_purchase_order(uuid, text) to authenticated;

notify pgrst, 'reload schema';
