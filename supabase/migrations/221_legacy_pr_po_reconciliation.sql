-- Safely finish PRs stranded in ready_to_convert by the historical two-step
-- Finance-to-PO workflow. Existing POs are reconciled only when they are
-- unlinked and match the PR's company, branch and single supplier.
create or replace function public.finish_legacy_purchase_request_to_order(
  target_purchase_request_id uuid,
  target_po_no text
)
returns table (
  purchase_order_id uuid,
  purchase_order_no text,
  purchase_request_no text,
  already_existed boolean
)
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
  normalized_po_no text := nullif(trim(target_po_no), '');
begin
  select * into actor
  from public.staffs
  where auth_user_id = auth.uid() and status = 'active' and deleted_at is null
  limit 1;
  if actor.id is null then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  if not public.has_any_permission(array['pr.convert_to_po', 'purchase_request.convert']) then
    raise exception 'CONVERSION_PERMISSION_DENIED';
  end if;
  if normalized_po_no is null or length(normalized_po_no) > 160 then
    raise exception 'PO_NUMBER_REQUIRED';
  end if;

  select * into request_row
  from public.purchase_requests
  where id = target_purchase_request_id and deleted_at is null
  for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id then
    raise exception 'PR_NOT_FOUND';
  end if;

  select * into existing_order
  from public.purchase_orders
  where company_id = actor.company_id
    and purchase_request_id = request_row.id
    and deleted_at is null
  order by created_at
  limit 1;
  if existing_order.id is not null then
    if request_row.status::text <> 'converted_to_po' then
      update public.purchase_requests
      set status = 'converted_to_po', autocount_po_no = existing_order.po_no,
          updated_by = actor.id, updated_at = now()
      where id = request_row.id;
      if request_row.document_id is not null then
        update public.documents
        set status = 'approved', approval_status = 'approved', current_step = 'Converted',
            updated_by = actor.id, updated_at = now()
        where id = request_row.document_id;
      end if;
    end if;
    return query select existing_order.id, existing_order.po_no, request_row.request_no, true;
    return;
  end if;

  if request_row.status::text <> 'ready_to_convert' then raise exception 'PR_NOT_READY'; end if;
  if request_row.branch_id is null then raise exception 'PR_BRANCH_REQUIRED'; end if;

  select count(distinct suggested_supplier_id)
  into supplier_count
  from public.purchase_request_lines
  where purchase_request_id = request_row.id;
  if supplier_count <> 1 then
    raise exception 'PR_SUPPLIER_REQUIRED';
  end if;
  select suggested_supplier_id into selected_supplier_id
  from public.purchase_request_lines
  where purchase_request_id = request_row.id
  limit 1;
  if selected_supplier_id is null then raise exception 'PR_SUPPLIER_REQUIRED'; end if;

  select * into existing_order
  from public.purchase_orders
  where company_id = actor.company_id
    and po_no = normalized_po_no
    and deleted_at is null
  for update;

  if existing_order.id is not null then
    if existing_order.purchase_request_id is not null then
      raise exception 'PO_NUMBER_LINKED_TO_ANOTHER_REQUEST';
    end if;
    if existing_order.branch_id is distinct from request_row.branch_id
      or existing_order.supplier_id is distinct from selected_supplier_id
      or existing_order.status::text = 'cancelled'
    then
      raise exception 'PO_NUMBER_BELONGS_TO_DIFFERENT_ORDER';
    end if;

    update public.purchase_orders
    set purchase_request_id = request_row.id, updated_by = actor.id, updated_at = now()
    where id = existing_order.id;
    update public.purchase_requests
    set status = 'converted_to_po', autocount_po_no = normalized_po_no,
        updated_by = actor.id, updated_at = now()
    where id = request_row.id;
    if request_row.document_id is not null then
      update public.documents
      set status = 'approved', approval_status = 'approved', current_step = 'Converted',
          updated_by = actor.id, updated_at = now()
      where id = request_row.document_id;
    end if;
    insert into public.activity_logs (
      company_id, entity_type, entity_id, activity_type, message, metadata, created_by
    ) values (
      actor.company_id, 'document', coalesce(request_row.document_id, request_row.id),
      'converted',
      'Legacy purchase request ' || request_row.request_no || ' reconciled to ' || normalized_po_no,
      jsonb_build_object(
        'source', 'legacy_pr_po_reconciliation',
        'purchase_order_id', existing_order.id,
        'purchase_order_no', normalized_po_no
      ),
      actor.id
    );
    return query select existing_order.id, normalized_po_no, request_row.request_no, true;
    return;
  end if;

  if request_row.autocount_po_no is distinct from normalized_po_no then
    update public.purchase_requests
    set autocount_po_no = normalized_po_no, updated_by = actor.id, updated_at = now()
    where id = request_row.id;
    insert into public.activity_logs (
      company_id, entity_type, entity_id, activity_type, message, metadata, created_by
    ) values (
      actor.company_id, 'purchase_request', request_row.id, 'updated',
      'AutoCount PO Number corrected during legacy recovery',
      jsonb_build_object('before', request_row.autocount_po_no, 'after', normalized_po_no),
      actor.id
    );
  end if;

  return query
    select converted.purchase_order_id, converted.purchase_order_no,
           converted.purchase_request_no, converted.already_existed
    from public.convert_purchase_request_to_purchase_order(request_row.id, normalized_po_no) converted;
end
$$;

revoke all on function public.finish_legacy_purchase_request_to_order(uuid, text) from public, anon;
grant execute on function public.finish_legacy_purchase_request_to_order(uuid, text) to authenticated;

notify pgrst, 'reload schema';
