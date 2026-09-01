-- Keep the database resolver aligned with the item choices shown by the PR UI.
-- When a branch has no explicit Supplier Item mapping for an item, the UI
-- deliberately falls back to the active Item Master supplier and purchase UOM.
create or replace function public.resolve_purchase_request_unresolved_line(
  target_purchase_request_id uuid,
  target_unresolved_line_id uuid,
  target_item_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  unresolved_row public.purchase_request_unresolved_lines%rowtype;
  canonical_supplier_id uuid;
  supplier_count integer;
  mapped_unit_cost numeric(18,4) := 0;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['pr.admin_review','pr.purchasing_review']) then
    raise exception 'You do not have permission to resolve Purchasing Review lines.';
  end if;

  select * into request_row from public.purchase_requests where id=target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null or request_row.company_id is distinct from actor.company_id
    or not public.can_access_purchase_request(request_row.company_id,request_row.branch_id,request_row.requested_by) then
    raise exception 'Purchase request not found or unavailable.';
  end if;
  if request_row.status::text<>'admin_review' then raise exception 'Non-catalog lines can be matched only during Purchasing Review.'; end if;

  canonical_supplier_id := request_row.assigned_supplier_id;
  if canonical_supplier_id is null then
    select count(distinct line.suggested_supplier_id), min(line.suggested_supplier_id::text)::uuid
      into supplier_count,canonical_supplier_id
    from public.purchase_request_lines line
    where line.purchase_request_id=request_row.id and line.suggested_supplier_id is not null;
    if supplier_count<>1 or canonical_supplier_id is null then
      raise exception 'The PR supplier is not uniquely defined. Select one supplier before matching items.';
    end if;
    update public.purchase_requests set assigned_supplier_id=canonical_supplier_id,updated_at=now() where id=request_row.id;
  end if;

  select * into unresolved_row from public.purchase_request_unresolved_lines
  where id=target_unresolved_line_id and purchase_request_id=request_row.id and resolution_status='unresolved' for update;
  if unresolved_row.id is null then raise exception 'Unresolved purchase request line not found.'; end if;
  if not exists (select 1 from public.items item where item.id=target_item_id and item.company_id=actor.company_id and item.status='active' and item.deleted_at is null) then
    raise exception 'Select an active Item Master record from this company.';
  end if;
  if exists (select 1 from public.purchase_request_lines line where line.purchase_request_id=request_row.id and line.item_id=target_item_id) then
    raise exception 'This item already exists in the purchase request. Update its quantity instead of merging silently.';
  end if;

  select si.unit_cost into mapped_unit_cost
  from public.branch_supplier_items bsi
  join public.supplier_items si on si.id=bsi.supplier_item_id and si.item_id=target_item_id
  join public.suppliers supplier on supplier.id=si.supplier_id and supplier.status='active' and supplier.deleted_at is null
  where bsi.branch_id=request_row.branch_id and bsi.item_id=target_item_id
    and si.supplier_id=canonical_supplier_id
    and bsi.status='active' and bsi.deleted_at is null and si.status='active' and si.deleted_at is null
    and upper(trim(si.purchase_uom))=upper(trim(unresolved_row.requested_uom))
  order by bsi.is_preferred desc,si.updated_at desc limit 1;

  if not found then
    select item.cost into mapped_unit_cost
    from public.items item
    join public.suppliers supplier on supplier.id=item.supplier_id and supplier.status='active' and supplier.deleted_at is null
    where item.id=target_item_id and item.company_id=actor.company_id
      and item.status='active' and item.deleted_at is null
      and item.supplier_id=canonical_supplier_id
      and upper(trim(coalesce(item.purchase_unit,item.base_unit)))=upper(trim(unresolved_row.requested_uom))
      and not exists (
        select 1 from public.branch_supplier_items bsi
        where bsi.branch_id=request_row.branch_id and bsi.item_id=target_item_id
          and bsi.status='active' and bsi.deleted_at is null
      );
  end if;

  if not found then
    raise exception 'The selected item is not mapped to this PR supplier, branch, and requested UOM.';
  end if;

  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,remarks)
  values(request_row.id,target_item_id,unresolved_row.requested_qty,unresolved_row.requested_uom,coalesce(mapped_unit_cost,0),canonical_supplier_id,unresolved_row.remarks);
  update public.purchase_request_unresolved_lines
  set resolution_status='matched',resolved_item_id=target_item_id,resolved_by=actor.id,resolved_at=now(),updated_at=now()
  where id=unresolved_row.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_request',request_row.id,'line_resolved','Non-catalog purchase request line matched to Item Master',jsonb_build_object('unresolved_line_id',unresolved_row.id,'item_id',target_item_id,'supplier_id',canonical_supplier_id,'zero_stock_link_allowed',true),actor.id);
  return jsonb_build_object('purchase_request_id',request_row.id,'item_id',target_item_id,'supplier_id',canonical_supplier_id);
end $$;

revoke all on function public.resolve_purchase_request_unresolved_line(uuid,uuid,uuid) from public,anon;
grant execute on function public.resolve_purchase_request_unresolved_line(uuid,uuid,uuid) to authenticated;
