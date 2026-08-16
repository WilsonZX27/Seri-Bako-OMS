-- Preserve requisition intent before catalogue and supplier resolution.
-- Supplier completeness is a Purchasing Review gate, not an entry gate.

create table if not exists public.purchase_request_unresolved_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  requested_description text not null check (length(trim(requested_description)) between 1 and 240),
  requested_qty numeric(18,4) not null check (requested_qty > 0),
  requested_uom text not null check (length(trim(requested_uom)) between 1 and 32),
  remarks text,
  resolution_status text not null default 'unresolved' check (resolution_status in ('unresolved','matched','dismissed')),
  resolved_item_id uuid references public.items(id) on delete restrict,
  resolved_by uuid references public.staffs(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_request_id, line_no)
);

create index if not exists purchase_request_unresolved_lines_request_idx
  on public.purchase_request_unresolved_lines(purchase_request_id, resolution_status);

drop trigger if exists set_purchase_request_unresolved_lines_updated_at on public.purchase_request_unresolved_lines;
create trigger set_purchase_request_unresolved_lines_updated_at before update on public.purchase_request_unresolved_lines
for each row execute function public.set_updated_at();

alter table public.purchase_request_unresolved_lines enable row level security;
drop policy if exists "purchase request unresolved lines scoped read" on public.purchase_request_unresolved_lines;
create policy "purchase request unresolved lines scoped read" on public.purchase_request_unresolved_lines
for select to authenticated using (
  exists (
    select 1 from public.purchase_requests pr
    where pr.id = purchase_request_unresolved_lines.purchase_request_id
      and public.can_access_purchase_request(pr.company_id, pr.branch_id, pr.requested_by)
  )
);
revoke insert, update, delete on public.purchase_request_unresolved_lines from authenticated;
grant select on public.purchase_request_unresolved_lines to authenticated;

create or replace function public.create_purchase_request_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor public.staffs%rowtype; existing public.purchase_requests%rowtype;
  request_id uuid; new_document_id uuid;
  request_no text := nullif(trim(p_payload->>'request_no'),'');
  branch_id uuid := nullif(p_payload->>'branch_id','')::uuid;
  idem uuid := nullif(p_payload->>'idempotency_key','')::uuid;
  lines jsonb := coalesce(p_payload->'lines','[]'::jsonb);
  unresolved_lines jsonb := coalesce(p_payload->'unresolved_lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_request.create') then raise exception 'You do not have permission to create a purchase request.'; end if;
  if jsonb_typeof(lines)<>'array' or jsonb_typeof(unresolved_lines)<>'array' then raise exception 'Purchase request lines must be arrays.'; end if;
  if request_no is null or jsonb_array_length(lines)+jsonb_array_length(unresolved_lines)=0 then raise exception 'Purchase request number and at least one line are required.'; end if;
  if jsonb_array_length(lines)+jsonb_array_length(unresolved_lines)>500 then raise exception 'A purchase request is limited to 500 lines.'; end if;
  if not exists(select 1 from public.branches b where b.id=branch_id and b.company_id=actor.company_id and b.deleted_at is null) then raise exception 'Branch is outside your company.'; end if;
  if exists (
    select 1
    from jsonb_to_recordset(lines) as line(item_id uuid, qty numeric, uom text)
    left join public.items item on item.id=line.item_id and item.company_id=actor.company_id and item.status='active' and item.deleted_at is null
    where item.id is null or line.qty is null or line.qty<=0 or nullif(trim(line.uom),'') is null
      or not exists (
        select 1 from public.stock_balances_view balance
        where balance.item_id=line.item_id and balance.branch_id=branch_id
      )
  ) then raise exception 'All selected items must be active, complete, and available to the purchase request branch.'; end if;
  select * into existing from public.purchase_requests where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'request_no',existing.request_no,'document_id',existing.document_id); end if;
  request_id:=gen_random_uuid(); new_document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(new_document_id,actor.company_id,request_no,'purchase_request','Purchase Request '||request_no,'draft','draft','Draft','purchase_request',request_id,actor.id,actor.id);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(new_document_id,1,'Initial document created.',actor.id);
  insert into public.purchase_requests(id,company_id,document_id,request_no,requested_by,request_date,required_date,priority,needed_by_date,urgency_reason,production_risk,branch_id,status,remarks,created_by,updated_by,idempotency_key)
  values(request_id,actor.company_id,new_document_id,request_no,actor.id,coalesce(nullif(p_payload->>'request_date','')::date,current_date),nullif(p_payload->>'required_date','')::date,coalesce(nullif(p_payload->>'priority',''),'normal'),nullif(p_payload->>'needed_by_date','')::date,p_payload->>'urgency_reason',coalesce((p_payload->>'production_risk')::boolean,false),branch_id,'draft',p_payload->>'remarks',actor.id,actor.id,idem);
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

create or replace function public.update_draft_purchase_request(
  target_purchase_request_id uuid, expected_updated_at timestamptz, submitted_branch_id uuid,
  request_date_value date, required_date_value date, priority_value text, needed_by_date_value date,
  urgency_reason_value text, production_risk_value boolean, remarks_value text, lines_value jsonb
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; request_row public.purchase_requests%rowtype; resolved_lines jsonb; unresolved_lines jsonb; line_count integer;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['purchase_request.create','pr.create']) then raise exception 'You do not have permission to edit purchase request drafts.'; end if;
  select * into request_row from public.purchase_requests where id=target_purchase_request_id and deleted_at is null for update;
  if request_row.id is null then raise exception 'Purchase request not found.'; end if;
  if request_row.company_id is distinct from actor.company_id or not public.can_access_purchase_request(request_row.company_id,request_row.branch_id,request_row.requested_by) then raise exception 'You do not have access to this purchase request.'; end if;
  if request_row.status::text<>'draft' then raise exception 'Only draft purchase requests can be edited.'; end if;
  if request_row.updated_at is distinct from expected_updated_at then raise exception 'This draft changed after you opened it. Refresh before saving again.'; end if;
  if request_row.branch_id is null or submitted_branch_id is distinct from request_row.branch_id then raise exception 'The purchase request branch cannot be changed while editing a draft.'; end if;
  if jsonb_typeof(lines_value)<>'object' then raise exception 'Purchase request line payload must be an object.'; end if;
  resolved_lines:=coalesce(lines_value->'resolved','[]'::jsonb); unresolved_lines:=coalesce(lines_value->'unresolved','[]'::jsonb);
  if jsonb_typeof(resolved_lines)<>'array' or jsonb_typeof(unresolved_lines)<>'array' then raise exception 'Resolved and unresolved purchase request lines must be arrays.'; end if;
  line_count:=jsonb_array_length(resolved_lines)+jsonb_array_length(unresolved_lines);
  if line_count<1 or line_count>500 then raise exception 'Purchase request must contain between 1 and 500 lines.'; end if;
  if priority_value not in ('low','normal','urgent','critical') then raise exception 'Invalid priority.'; end if;
  if exists(select 1 from jsonb_to_recordset(resolved_lines) as line(item_id uuid) group by line.item_id having count(*)>1) then raise exception 'Each item can appear only once in a purchase request.'; end if;
  if exists(select 1 from jsonb_to_recordset(resolved_lines) as line(branch_id uuid) where line.branch_id is distinct from request_row.branch_id) then raise exception 'Mixed-branch purchase request lines are not allowed.'; end if;
  if exists (
    select 1
    from jsonb_to_recordset(resolved_lines) as line(item_id uuid, qty numeric, uom text)
    left join public.items item on item.id=line.item_id and item.company_id=actor.company_id and item.status='active' and item.deleted_at is null
    where item.id is null or line.qty is null or line.qty<=0 or nullif(trim(line.uom),'') is null
      or not exists (
        select 1 from public.stock_balances_view balance
        where balance.item_id=line.item_id and balance.branch_id=request_row.branch_id
      )
  ) then raise exception 'All selected items must be active, complete, and available to the purchase request branch.'; end if;
  update public.purchase_requests set request_date=request_date_value,required_date=required_date_value,priority=priority_value,needed_by_date=needed_by_date_value,urgency_reason=nullif(trim(urgency_reason_value),''),production_risk=coalesce(production_risk_value,false),remarks=nullif(trim(remarks_value),''),updated_by=actor.id where id=request_row.id;
  delete from public.purchase_request_lines where purchase_request_id=request_row.id;
  delete from public.purchase_request_unresolved_lines where purchase_request_id=request_row.id;
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks)
  select request_row.id,line.item_id,line.qty,trim(line.uom),line.estimated_unit_cost,line.suggested_supplier_id,nullif(trim(line.reason),''),nullif(trim(line.remarks),'') from jsonb_to_recordset(resolved_lines) as line(item_id uuid,qty numeric,uom text,estimated_unit_cost numeric,suggested_supplier_id uuid,reason text,remarks text,branch_id uuid);
  insert into public.purchase_request_unresolved_lines(purchase_request_id,line_no,requested_description,requested_qty,requested_uom,remarks)
  select request_row.id,x.ordinality::integer,trim(x.value->>'requested_description'),(x.value->>'requested_qty')::numeric,trim(x.value->>'requested_uom'),nullif(trim(x.value->>'remarks'),'') from jsonb_array_elements(unresolved_lines) with ordinality as x(value,ordinality);
  return jsonb_build_object('id',request_row.id,'request_no',request_row.request_no,'line_count',line_count);
end $$;

create or replace function public.guard_purchase_request_supplier_transition()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if old.status::text='admin_review' and new.status::text='finance_review' then
    if exists(select 1 from public.purchase_request_unresolved_lines where purchase_request_id=new.id and resolution_status='unresolved') then
      raise exception 'Resolve every non-catalog request line before completing Purchasing Review.';
    end if;
    perform public.validate_purchase_request_supplier_mappings(new.id,true);
  end if;
  return new;
end $$;

create or replace function public.resolve_purchase_request_unresolved_line(
  target_purchase_request_id uuid,
  target_unresolved_line_id uuid,
  target_item_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor public.staffs%rowtype;
  request_row public.purchase_requests%rowtype;
  unresolved_row public.purchase_request_unresolved_lines%rowtype;
  mapped_supplier_id uuid;
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
  select * into unresolved_row from public.purchase_request_unresolved_lines
  where id=target_unresolved_line_id and purchase_request_id=request_row.id and resolution_status='unresolved' for update;
  if unresolved_row.id is null then raise exception 'Unresolved purchase request line not found.'; end if;
  if not exists (
    select 1 from public.items item
    where item.id=target_item_id and item.company_id=actor.company_id and item.status='active' and item.deleted_at is null
      and exists (select 1 from public.stock_balances_view balance where balance.item_id=item.id and balance.branch_id=request_row.branch_id)
  ) then raise exception 'Selected item is not active or available to this branch.'; end if;
  if exists (select 1 from public.purchase_request_lines line where line.purchase_request_id=request_row.id and line.item_id=target_item_id) then
    raise exception 'This item already exists in the purchase request. Return the request to edit quantities instead of merging silently.';
  end if;

  select si.supplier_id,si.unit_cost into mapped_supplier_id,mapped_unit_cost
  from public.branch_supplier_items bsi
  join public.supplier_items si on si.id=bsi.supplier_item_id and si.item_id=target_item_id
  join public.suppliers supplier on supplier.id=si.supplier_id and supplier.status='active' and supplier.deleted_at is null
  where bsi.branch_id=request_row.branch_id and bsi.item_id=target_item_id
    and bsi.status='active' and bsi.deleted_at is null and si.status='active' and si.deleted_at is null
    and upper(trim(si.purchase_uom))=upper(trim(unresolved_row.requested_uom))
  order by bsi.is_preferred desc,si.updated_at desc
  limit 1;

  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,remarks)
  values(request_row.id,target_item_id,unresolved_row.requested_qty,unresolved_row.requested_uom,coalesce(mapped_unit_cost,0),mapped_supplier_id,unresolved_row.remarks);
  update public.purchase_request_unresolved_lines
  set resolution_status='matched',resolved_item_id=target_item_id,resolved_by=actor.id,resolved_at=now(),updated_at=now()
  where id=unresolved_row.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(actor.company_id,'purchase_request',request_row.id,'line_resolved','Non-catalog purchase request line matched to Item Master',jsonb_build_object('unresolved_line_id',unresolved_row.id,'item_id',target_item_id,'supplier_id',mapped_supplier_id),actor.id);
  return jsonb_build_object('purchase_request_id',request_row.id,'item_id',target_item_id,'supplier_id',mapped_supplier_id);
end $$;

revoke all on function public.create_purchase_request_atomic(jsonb) from public,anon;
revoke all on function public.update_draft_purchase_request(uuid,timestamptz,uuid,date,date,text,date,text,boolean,text,jsonb) from public,anon;
revoke all on function public.resolve_purchase_request_unresolved_line(uuid,uuid,uuid) from public,anon;
grant execute on function public.create_purchase_request_atomic(jsonb) to authenticated;
grant execute on function public.update_draft_purchase_request(uuid,timestamptz,uuid,date,date,text,date,text,boolean,text,jsonb) to authenticated;
grant execute on function public.resolve_purchase_request_unresolved_line(uuid,uuid,uuid) to authenticated;
