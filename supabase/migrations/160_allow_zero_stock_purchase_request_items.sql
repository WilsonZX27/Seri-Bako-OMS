-- A purchase request is allowed for an active catalogue item even when that
-- item has no stock-ledger row yet. Zero/on-hand absence is a procurement
-- signal, not an item-eligibility failure.
create or replace function public.create_purchase_request_atomic(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  actor public.staffs%rowtype;
  existing public.purchase_requests%rowtype;
  request_id uuid;
  new_document_id uuid;
  request_no text := nullif(trim(p_payload->>'request_no'),'');
  request_branch_id uuid := nullif(p_payload->>'branch_id','')::uuid;
  idem uuid := nullif(p_payload->>'idempotency_key','')::uuid;
  lines jsonb := coalesce(p_payload->'lines','[]'::jsonb);
  unresolved_lines jsonb := coalesce(p_payload->'unresolved_lines','[]'::jsonb);
begin
  select * into actor
  from public.staffs
  where auth_user_id=auth.uid() and status='active' and deleted_at is null
  limit 1;
  if actor.id is null or not public.has_permission('purchase_request.create') then
    raise exception 'You do not have permission to create a purchase request.';
  end if;
  if jsonb_typeof(lines)<>'array' or jsonb_typeof(unresolved_lines)<>'array' then
    raise exception 'Purchase request lines must be arrays.';
  end if;
  if request_no is null or jsonb_array_length(lines)+jsonb_array_length(unresolved_lines)=0 then
    raise exception 'Purchase request number and at least one line are required.';
  end if;
  if jsonb_array_length(lines)+jsonb_array_length(unresolved_lines)>500 then
    raise exception 'A purchase request is limited to 500 lines.';
  end if;
  if not exists (
    select 1
    from public.branches branch_row
    where branch_row.id=request_branch_id
      and branch_row.company_id=actor.company_id
      and branch_row.deleted_at is null
  ) then
    raise exception 'Branch is outside your company.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(lines) as line(item_id uuid, qty numeric, uom text)
    left join public.items item
      on item.id=line.item_id
      and item.company_id=actor.company_id
      and item.status='active'
      and item.deleted_at is null
    where item.id is null
      or line.qty is null
      or line.qty<=0
      or nullif(trim(line.uom),'') is null
  ) then
    raise exception 'All selected items must be active, complete, and belong to the request company.';
  end if;
  select * into existing
  from public.purchase_requests
  where company_id=actor.company_id
    and idempotency_key=idem
    and idem is not null
    and deleted_at is null
  for update;
  if existing.id is not null then
    return jsonb_build_object('id',existing.id,'request_no',existing.request_no,'document_id',existing.document_id);
  end if;
  request_id:=gen_random_uuid();
  new_document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(new_document_id,actor.company_id,request_no,'purchase_request','Purchase Request '||request_no,'draft','draft','Draft','purchase_request',request_id,actor.id,actor.id);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by)
  values(new_document_id,1,'Initial document created.',actor.id);
  insert into public.purchase_requests(id,company_id,document_id,request_no,requested_by,request_date,required_date,priority,needed_by_date,urgency_reason,production_risk,branch_id,status,remarks,created_by,updated_by,idempotency_key)
  values(request_id,actor.company_id,new_document_id,request_no,actor.id,coalesce(nullif(p_payload->>'request_date','')::date,current_date),nullif(p_payload->>'required_date','')::date,coalesce(nullif(p_payload->>'priority',''),'normal'),nullif(p_payload->>'needed_by_date','')::date,p_payload->>'urgency_reason',coalesce((p_payload->>'production_risk')::boolean,false),request_branch_id,'draft',p_payload->>'remarks',actor.id,actor.id,idem);
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks)
  select request_id,x.item_id::uuid,x.qty::numeric,trim(x.uom),coalesce(x.estimated_unit_cost::numeric,0),nullif(x.suggested_supplier_id,'')::uuid,nullif(trim(x.reason),''),nullif(trim(x.remarks),'')
  from jsonb_to_recordset(lines) as x(item_id text,qty text,uom text,estimated_unit_cost text,suggested_supplier_id text,reason text,remarks text);
  insert into public.purchase_request_unresolved_lines(purchase_request_id,line_no,requested_description,requested_qty,requested_uom,remarks)
  select request_id,x.ordinality::integer,trim(x.value->>'requested_description'),(x.value->>'requested_qty')::numeric,trim(x.value->>'requested_uom'),nullif(trim(x.value->>'remarks'),'')
  from jsonb_array_elements(unresolved_lines) with ordinality as x(value,ordinality);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'document',new_document_id,'created','Purchase request '||request_no||' created',jsonb_build_object('resolved_lines',jsonb_array_length(lines),'unresolved_lines',jsonb_array_length(unresolved_lines)),actor.id);
  return jsonb_build_object('id',request_id,'request_no',request_no,'document_id',new_document_id);
end $$;

revoke all on function public.create_purchase_request_atomic(jsonb) from public, anon;
grant execute on function public.create_purchase_request_atomic(jsonb) to authenticated;
