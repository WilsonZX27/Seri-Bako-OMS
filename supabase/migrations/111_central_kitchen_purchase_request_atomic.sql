-- Central-kitchen PR aggregate: the advisory lock serializes competing requests for an item/branch.
create table if not exists public.purchase_request_stock_holds (
  id uuid primary key default gen_random_uuid(), purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  item_id uuid not null references public.items(id), branch_id uuid not null references public.branches(id),
  quantity_inventory numeric(18,6) not null check (quantity_inventory > 0), status text not null default 'held' check (status in ('held','released','fulfilled')),
  created_at timestamptz not null default now(), unique (purchase_request_id, item_id)
);

create or replace function public.create_central_kitchen_purchase_request_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor public.staffs%rowtype; request_id uuid; existing_id uuid; request_no text := nullif(trim(p_payload->>'request_no'),''); branch_id uuid := (p_payload->>'branch_id')::uuid; lines jsonb := coalesce(p_payload->'lines','[]'::jsonb); line jsonb; item_row record; conversion numeric; requested_inventory numeric; available numeric; safety numeric; total_value numeric := 0; low_warning boolean := false; status_text text;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['purchase_request.create','pr.create']) then raise exception 'You do not have permission to create a purchase request.'; end if;
  if not exists (select 1 from public.branches where id=branch_id and company_id=actor.company_id and deleted_at is null) then raise exception 'Branch is outside your company.'; end if;
  if request_no is null then request_no := 'CK-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS'); end if;
  select id, status into existing_id, status_text from public.purchase_requests where company_id=actor.company_id and idempotency_key=(p_payload->>'idempotency_key')::uuid and deleted_at is null for update;
  if existing_id is not null then return jsonb_build_object('id',existing_id,'request_no',request_no,'status',case when status_text='ready_to_convert' then 'approved_pending_po' else 'pending_manager_approval' end,'total_value',0,'low_stock_warning',false); end if;
  request_id := gen_random_uuid();
  insert into public.purchase_requests (id,company_id,request_no,requested_by,request_date,required_date,branch_id,status,remarks,created_by,updated_by,idempotency_key)
    values(request_id,actor.company_id,request_no,actor.id,coalesce(nullif(p_payload->>'request_date','')::date,current_date),nullif(p_payload->>'required_date','')::date,branch_id,'draft',p_payload->>'remarks',actor.id,actor.id,(p_payload->>'idempotency_key')::uuid)
    on conflict (company_id,idempotency_key) where idempotency_key is not null and deleted_at is null do update set updated_at=public.purchase_requests.updated_at
    returning id into request_id;
  for line in select * from jsonb_array_elements(lines) loop
    select i.conversion_to_base_unit, i.purchase_unit, i.base_unit, i.safety_stock into item_row from public.items i where i.id=(line->>'item_id')::uuid and i.company_id=actor.company_id and i.status='active' and i.deleted_at is null for update;
    if item_row is null or item_row.conversion_to_base_unit is null or item_row.conversion_to_base_unit <= 0 or lower(item_row.purchase_unit) <> lower(line->>'ordering_unit') then raise exception 'INVALID_UNIT_CONVERSION: item %', line->>'item_id'; end if;
    conversion := item_row.conversion_to_base_unit; requested_inventory := (line->>'quantity')::numeric * conversion;
    perform pg_advisory_xact_lock(hashtextextended(branch_id::text || ':' || (line->>'item_id'), 0));
    select coalesce(sum(st.quantity_in-st.quantity_out),0) into available from public.stock_transactions st join public.stock_transaction_lines sl on sl.stock_transaction_id=st.id where st.branch_id=branch_id and st.status='posted' and st.deleted_at is null and sl.item_id=(line->>'item_id')::uuid;
    safety := coalesce(item_row.safety_stock,0);
    if available < requested_inventory then raise exception 'INSUFFICIENT_INVENTORY: item %', line->>'item_id'; end if;
    if available - requested_inventory < safety then low_warning := true; end if;
    insert into public.purchase_request_lines (purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks) values(request_id,(line->>'item_id')::uuid,(line->>'quantity')::numeric,line->>'ordering_unit',coalesce((line->>'estimated_unit_cost')::numeric,0),nullif(line->>'suggested_supplier_id','')::uuid,line->>'reason',line->>'remarks');
    insert into public.purchase_request_stock_holds (purchase_request_id,item_id,branch_id,quantity_inventory) values(request_id,(line->>'item_id')::uuid,branch_id,requested_inventory) on conflict do nothing;
    total_value := total_value + ((line->>'quantity')::numeric * coalesce((line->>'estimated_unit_cost')::numeric,0));
  end loop;
  status_text := case when total_value < coalesce((p_payload->>'approval_threshold')::numeric,0) then 'ready_to_convert' else 'manager_review' end;
  update public.purchase_requests set status=status_text::public.purchase_request_status where id=request_id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(actor.company_id,'purchase_request',request_id,'created','Central kitchen purchase request created',jsonb_build_object('total_value',total_value,'low_stock_warning',low_warning,'status',status_text),actor.id);
  return jsonb_build_object('id',request_id,'request_no',request_no,'status',case when status_text='ready_to_convert' then 'approved_pending_po' else 'pending_manager_approval' end,'total_value',total_value,'low_stock_warning',low_warning);
end $$;
revoke all on function public.create_central_kitchen_purchase_request_atomic(jsonb) from public;
grant execute on function public.create_central_kitchen_purchase_request_atomic(jsonb) to authenticated;
