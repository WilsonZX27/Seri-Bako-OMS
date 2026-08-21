-- Progressive Purchase-UOM learning at receiving.
-- Commercial documents retain Purchase UOM while inventory always posts in
-- Item Master Base UOM from an immutable GRN-line snapshot.

alter table public.supplier_items
  alter column conversion_to_base_uom drop not null;

alter table public.supplier_items
  drop constraint if exists supplier_items_conversion_positive;
alter table public.supplier_items
  add constraint supplier_items_conversion_positive
  check (conversion_to_base_uom is null or conversion_to_base_uom > 0);

drop index if exists public.supplier_items_supplier_item_active_idx;
create unique index if not exists supplier_items_supplier_item_uom_active_idx
  on public.supplier_items (supplier_id, item_id, upper(btrim(purchase_uom)))
  where deleted_at is null and status = 'active';

alter table public.goods_receiving_lines
  add column if not exists received_base_qty numeric(18,6),
  add column if not exists rejected_base_qty numeric(18,6),
  add column if not exists conversion_to_base_uom_snapshot numeric(18,8),
  add column if not exists conversion_source text,
  add column if not exists conversion_confirmed_by uuid references public.staffs(id) on delete set null,
  add column if not exists conversion_confirmed_at timestamptz,
  add column if not exists remember_conversion boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'goods_receiving_lines_received_base_nonnegative'
      and n.nspname = 'public' and t.relname = 'goods_receiving_lines'
  ) then
    alter table public.goods_receiving_lines
      add constraint goods_receiving_lines_received_base_nonnegative
      check (received_base_qty is null or received_base_qty >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'goods_receiving_lines_rejected_base_nonnegative'
      and n.nspname = 'public' and t.relname = 'goods_receiving_lines'
  ) then
    alter table public.goods_receiving_lines
      add constraint goods_receiving_lines_rejected_base_nonnegative
      check (rejected_base_qty is null or rejected_base_qty >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'goods_receiving_lines_conversion_snapshot_positive'
      and n.nspname = 'public' and t.relname = 'goods_receiving_lines'
  ) then
    alter table public.goods_receiving_lines
      add constraint goods_receiving_lines_conversion_snapshot_positive
      check (conversion_to_base_uom_snapshot is null or conversion_to_base_uom_snapshot > 0);
  end if;
end
$$;

create table if not exists public.supplier_uom_conversion_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  item_id uuid not null references public.items(id) on delete restrict,
  purchase_uom text not null,
  base_uom text not null,
  before_conversion numeric(18,8),
  after_conversion numeric(18,8) not null,
  source text not null default 'goods_receiving',
  goods_receiving_id uuid references public.goods_receivings(id) on delete set null,
  goods_receiving_line_id uuid references public.goods_receiving_lines(id) on delete set null,
  changed_by uuid references public.staffs(id) on delete set null,
  changed_at timestamptz not null default now(),
  constraint supplier_uom_conversion_audit_after_positive check (after_conversion > 0)
);
create index if not exists supplier_uom_conversion_audit_lookup_idx
  on public.supplier_uom_conversion_audit(company_id, supplier_id, item_id, changed_at desc);
alter table public.supplier_uom_conversion_audit enable row level security;
drop policy if exists "tenant supplier conversion audit read" on public.supplier_uom_conversion_audit;
create policy "tenant supplier conversion audit read" on public.supplier_uom_conversion_audit
  for select to authenticated using (
    company_id = public.current_staff_company_id()
    and public.has_any_permission(array['goods_receiving.read','goods_receiving.post','supplier_items.read','supplier_items.update'])
  );
revoke insert, update, delete on public.supplier_uom_conversion_audit from authenticated;
grant select on public.supplier_uom_conversion_audit to authenticated;

-- Preserve only conversions that can be proven from existing master data.
with proven as (
  select gl.id,
    case when upper(btrim(gl.uom)) = upper(btrim(i.base_unit)) then 1 else si.conversion_to_base_uom end as snapshot,
    case when upper(btrim(gl.uom)) = upper(btrim(i.base_unit)) then gl.received_qty
         when si.conversion_to_base_uom > 0 then gl.received_qty * si.conversion_to_base_uom else null end as received_base,
    case when upper(btrim(gl.uom)) = upper(btrim(i.base_unit)) then gl.rejected_qty
         when si.conversion_to_base_uom > 0 then gl.rejected_qty * si.conversion_to_base_uom else null end as rejected_base,
    case when upper(btrim(gl.uom)) = upper(btrim(i.base_unit)) then 'identity_backfill'
         when si.conversion_to_base_uom > 0 then 'supplier_master_backfill' else 'unavailable' end as source
  from public.goods_receiving_lines gl
  join public.goods_receivings gr on gr.id = gl.goods_receiving_id
  join public.purchase_orders po on po.id = gr.purchase_order_id
  join public.items i on i.id = gl.item_id and i.company_id = po.company_id
  left join public.supplier_items si on si.company_id = po.company_id
    and si.supplier_id = po.supplier_id and si.item_id = gl.item_id
    and upper(btrim(si.purchase_uom)) = upper(btrim(gl.uom))
    and si.status = 'active' and si.deleted_at is null
  where gl.conversion_to_base_uom_snapshot is null
)
update public.goods_receiving_lines gl
set conversion_to_base_uom_snapshot = proven.snapshot,
    received_base_qty = proven.received_base,
    rejected_base_qty = proven.rejected_base,
    conversion_source = proven.source
from proven
where gl.id = proven.id;

-- PR supplier is a required suggestion, not a preconfigured sourcing gate.
create or replace function public.validate_purchase_request_supplier_mappings(p_purchase_request_id uuid, p_require_all boolean default true)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare request_row public.purchase_requests%rowtype;
begin
  select * into request_row from public.purchase_requests where id=p_purchase_request_id and deleted_at is null;
  if request_row.id is null or request_row.branch_id is null then raise exception 'Purchase request branch is required.'; end if;
  if p_require_all and exists(select 1 from public.purchase_request_lines where purchase_request_id=request_row.id and suggested_supplier_id is null) then
    raise exception 'Every requested item needs a suggested supplier.';
  end if;
  if exists(
    select 1 from public.purchase_request_lines prl
    left join public.suppliers s on s.id=prl.suggested_supplier_id and s.company_id=request_row.company_id and s.status='active' and s.deleted_at is null
    where prl.purchase_request_id=request_row.id and (prl.suggested_supplier_id is null or s.id is null)
  ) then raise exception 'Each suggested supplier must be active in this company.'; end if;
end $$;

create or replace function public.guard_purchase_request_line_supplier()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare target_company_id uuid;
begin
  if new.suggested_supplier_id is null then return new; end if;
  select company_id into target_company_id from public.purchase_requests where id=new.purchase_request_id;
  if not exists(select 1 from public.suppliers where id=new.suggested_supplier_id and company_id=target_company_id and status='active' and deleted_at is null) then
    raise exception 'Suggested supplier is unavailable in this company.';
  end if;
  return new;
end $$;

-- Purchasing can create a provisional supplier/branch relationship inline.
create or replace function public.ensure_provisional_purchase_order_mapping()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare po public.purchase_orders%rowtype; item_row public.items%rowtype; relationship_id uuid; normalized_uom text;
begin
  select * into po from public.purchase_orders where id=new.purchase_order_id;
  select * into item_row from public.items where id=new.item_id and company_id=po.company_id and status='active' and deleted_at is null;
  if po.id is null or item_row.id is null then raise exception 'Purchase order line references are invalid.'; end if;
  normalized_uom := upper(btrim(new.uom));
  select id into relationship_id from public.supplier_items
    where company_id=po.company_id and supplier_id=po.supplier_id and item_id=new.item_id
      and upper(btrim(purchase_uom))=normalized_uom and status='active' and deleted_at is null
    order by created_at limit 1;
  if relationship_id is null then
    insert into public.supplier_items(company_id,supplier_id,item_id,supplier_item_code,supplier_item_name,purchase_uom,conversion_to_base_uom,unit_cost,status,created_by,updated_by)
    values(po.company_id,po.supplier_id,new.item_id,'PROVISIONAL-'||item_row.item_code||'-'||normalized_uom,item_row.item_name,normalized_uom,null,new.unit_price,'active',public.current_staff_id(),public.current_staff_id())
    returning id into relationship_id;
  end if;
  insert into public.branch_supplier_items(branch_id,supplier_item_id,item_id,is_preferred,status,created_by,updated_by)
    values(po.branch_id,relationship_id,new.item_id,false,'active',public.current_staff_id(),public.current_staff_id())
    on conflict (branch_id,supplier_item_id) do update set status='active',deleted_at=null,updated_by=excluded.updated_by;
  return new;
end $$;

drop trigger if exists purchase_order_line_supplier_guard on public.purchase_order_lines;
create trigger purchase_order_line_supplier_guard
before insert or update of purchase_order_id,item_id,uom on public.purchase_order_lines
for each row execute function public.ensure_provisional_purchase_order_mapping();

create or replace function public.guard_purchase_order_mapping_scope_change()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  return new;
end $$;

-- Receiving is the one controlled workflow that may advance a committed PO line.
-- The transaction-local flag is set only inside the SECURITY DEFINER posting RPC;
-- ordinary PO edits remain locked after approval/send.
create or replace function public.prevent_committed_purchase_order_line_mutation()
returns trigger language plpgsql set search_path = public as $$
declare order_status public.purchase_order_status;
begin
  if current_setting('app.purchase_receipt_posting', true) = 'on' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  select status into order_status from public.purchase_orders where id = coalesce(new.purchase_order_id, old.purchase_order_id);
  if order_status <> 'draft' then
    raise exception 'Purchase order lines are locked after the PO leaves draft. Create a revision or cancel and reissue.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create or replace function public.create_goods_receiving_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; po public.purchase_orders%rowtype; existing public.goods_receivings%rowtype; grn_id uuid; document_id uuid; grn_no text:=nullif(trim(p_payload->>'grn_no'),''); branch_id uuid:=nullif(p_payload->>'branch_id','')::uuid; supplier_id uuid:=nullif(p_payload->>'supplier_id','')::uuid; purchase_order_id uuid:=nullif(p_payload->>'purchase_order_id','')::uuid; idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb:=coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('goods_receiving.create') then raise exception 'Missing permission: goods_receiving.create'; end if;
  if grn_no is null or purchase_order_id is null or supplier_id is null or branch_id is null or jsonb_array_length(lines)=0 then raise exception 'GRN number, purchase order, supplier, branch, and lines are required.'; end if;
  select * into po from public.purchase_orders where id=purchase_order_id and company_id=actor.company_id and deleted_at is null for update;
  if po.id is null or po.supplier_id is distinct from supplier_id or po.branch_id is distinct from branch_id or po.status not in ('approved','sent','partial_received') then raise exception 'Purchase order is unavailable for receiving.'; end if;
  if not public.can_access_inventory_branch(actor.company_id,branch_id) then raise exception 'GRN branch is unavailable.'; end if;
  select * into existing from public.goods_receivings where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'grn_no',existing.grn_no,'document_id',existing.document_id,'idempotent',true); end if;
  grn_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,grn_no,'goods_receiving','Goods Receiving '||grn_no,'draft','not_required','Draft receiving','goods_receiving',grn_id,actor.id,actor.id);
  insert into public.goods_receivings(id,company_id,document_id,purchase_order_id,grn_no,supplier_id,received_date,branch_id,status,received_by,remarks,created_by,updated_by,idempotency_key) values(grn_id,actor.company_id,document_id,po.id,grn_no,supplier_id,coalesce(nullif(p_payload->>'received_date','')::date,current_date),branch_id,'draft',actor.id,nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.goods_receiving_lines(goods_receiving_id,purchase_order_line_id,item_id,ordered_qty,previously_received_qty,pending_qty,received_qty,rejected_qty,uom,unit_cost,batch_no,expiry_date,remarks,received_base_qty,rejected_base_qty,conversion_to_base_uom_snapshot,conversion_source,conversion_confirmed_by,conversion_confirmed_at,remember_conversion)
  select grn_id,x.purchase_order_line_id::uuid,x.item_id::uuid,x.ordered_qty::numeric,x.previously_received_qty::numeric,x.pending_qty::numeric,x.received_qty::numeric,x.rejected_qty::numeric,upper(btrim(x.uom)),x.unit_cost::numeric,nullif(trim(x.batch_no),''),nullif(trim(x.expiry_date),'')::date,nullif(trim(x.remarks),''),x.received_base_qty::numeric,x.rejected_base_qty::numeric,x.conversion_to_base_uom_snapshot::numeric,coalesce(nullif(x.conversion_source,''),'receiving_confirmed'),actor.id,now(),coalesce(x.remember_conversion,false)
  from jsonb_to_recordset(lines) as x(purchase_order_line_id text,item_id text,ordered_qty text,previously_received_qty text,pending_qty text,received_qty text,rejected_qty text,uom text,unit_cost text,batch_no text,expiry_date text,remarks text,received_base_qty text,rejected_base_qty text,conversion_to_base_uom_snapshot text,conversion_source text,remember_conversion boolean);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial goods receiving created with Purchase/Base UOM snapshots.',actor.id);
  return jsonb_build_object('id',grn_id,'grn_no',grn_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.post_goods_receiving_atomic(p_goods_receiving_id uuid,p_do_exception_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; grn public.goods_receivings%rowtype; line public.goods_receiving_lines%rowtype; po_line public.purchase_order_lines%rowtype; po public.purchase_orders%rowtype; item_row public.items%rowtype; si public.supplier_items%rowtype; po_status public.purchase_order_status; base_unit_cost numeric; before_conversion numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('grn.post') then raise exception 'Missing permission: grn.post'; end if;
  select * into grn from public.goods_receivings where id=p_goods_receiving_id and deleted_at is null for update;
  if grn.id is null or not public.can_access_inventory_branch(grn.company_id,grn.branch_id) then raise exception 'Goods receiving is unavailable for this branch.'; end if;
  if grn.status='posted' then return jsonb_build_object('id',grn.id,'already_posted',true); end if;
  if grn.status<>'draft' then raise exception 'Only draft GRN can be posted.'; end if;
  if grn.document_id is null or not exists(select 1 from public.attachments where entity_type='document' and entity_id=grn.document_id and status='active' and deleted_at is null) then if nullif(btrim(p_do_exception_reason),'') is null then raise exception 'Attach the Delivery Order or document an exception before posting this receiving.'; end if; end if;
  select * into po from public.purchase_orders where id=grn.purchase_order_id and company_id=actor.company_id;
  perform set_config('app.purchase_receipt_posting','on',true);
  for line in select * from public.goods_receiving_lines where goods_receiving_id=grn.id order by id for update loop
    select * into po_line from public.purchase_order_lines where id=line.purchase_order_line_id and purchase_order_id=grn.purchase_order_id for update;
    select * into item_row from public.items where id=line.item_id and company_id=grn.company_id and deleted_at is null;
    if po_line.id is null or po_line.item_id<>line.item_id or line.received_qty+line.rejected_qty>greatest(po_line.qty_ordered-po_line.qty_received-po_line.qty_cancelled,0) then raise exception 'GRN contains an invalid or over-received purchase-order line.'; end if;
    if line.received_qty>0 and (line.received_base_qty is null or line.received_base_qty<=0 or line.conversion_to_base_uom_snapshot is null or line.conversion_to_base_uom_snapshot<=0) then raise exception 'Enter the actual Base UOM quantity for every received line.'; end if;
    if line.rejected_qty>0 and (line.rejected_base_qty is null or line.rejected_base_qty<0) then raise exception 'Enter the actual Base UOM quantity for rejected stock.'; end if;
    if line.received_qty>0 then
      base_unit_cost:=line.unit_cost/line.conversion_to_base_uom_snapshot;
      perform public.inventory_lock_item_branch(line.item_id,grn.branch_id);
      perform public.insert_inventory_movement('ST-'||grn.grn_no||'-'||left(line.id::text,4),grn.document_id,grn.branch_id,line.item_id,'purchase',grn.received_date,line.received_base_qty,0,base_unit_cost,actor.id,'Received from '||grn.grn_no,'goods_receiving',grn.id);
      update public.purchase_order_lines set qty_received=qty_received+line.received_qty where id=po_line.id;
    end if;
    if line.remember_conversion then
      select * into si from public.supplier_items where company_id=grn.company_id and supplier_id=po.supplier_id and item_id=line.item_id and upper(btrim(purchase_uom))=upper(btrim(line.uom)) and status='active' and deleted_at is null order by created_at limit 1 for update;
      before_conversion:=si.conversion_to_base_uom;
      if si.id is null then
        insert into public.supplier_items(company_id,supplier_id,item_id,supplier_item_code,supplier_item_name,purchase_uom,conversion_to_base_uom,unit_cost,status,created_by,updated_by) values(grn.company_id,po.supplier_id,line.item_id,'LEARNED-'||item_row.item_code||'-'||upper(btrim(line.uom)),item_row.item_name,upper(btrim(line.uom)),line.conversion_to_base_uom_snapshot,line.unit_cost,'active',actor.id,actor.id) returning * into si;
      else
        update public.supplier_items set conversion_to_base_uom=line.conversion_to_base_uom_snapshot,updated_by=actor.id where id=si.id;
      end if;
      insert into public.supplier_uom_conversion_audit(company_id,supplier_id,item_id,purchase_uom,base_uom,before_conversion,after_conversion,goods_receiving_id,goods_receiving_line_id,changed_by) values(grn.company_id,po.supplier_id,line.item_id,line.uom,item_row.base_unit,before_conversion,line.conversion_to_base_uom_snapshot,grn.id,line.id,actor.id);
    end if;
  end loop;
  select case when bool_and(qty_ordered-qty_received-qty_cancelled<=0) then 'received'::public.purchase_order_status else 'partial_received'::public.purchase_order_status end into po_status from public.purchase_order_lines where purchase_order_id=grn.purchase_order_id;
  update public.purchase_orders set status=po_status,updated_by=actor.id where id=grn.purchase_order_id;
  update public.goods_receivings set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=grn.id;
  if grn.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=grn.document_id; end if;
  return jsonb_build_object('id',grn.id,'grn_no',grn.grn_no,'purchase_order_id',grn.purchase_order_id,'document_id',grn.document_id,'already_posted',false);
end $$;

create or replace function public.post_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; ret public.purchase_returns%rowtype; line public.purchase_return_lines%rowtype; grn_line public.goods_receiving_lines%rowtype; movement_id uuid; balance numeric; base_return_qty numeric; base_unit_cost numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_return.post') then raise exception 'Missing permission: purchase_return.post'; end if;
  select * into ret from public.purchase_returns where id=p_purchase_return_id and deleted_at is null for update;
  if ret.id is null or not public.can_access_inventory_branch(ret.company_id,ret.branch_id) then raise exception 'Purchase return is unavailable for this branch.'; end if;
  if ret.status='posted' then return jsonb_build_object('id',ret.id,'already_posted',true); end if;
  if ret.status<>'draft' then raise exception 'Only draft purchase returns can be posted.'; end if;
  for line in select * from public.purchase_return_lines where purchase_return_id=ret.id order by id for update loop
    select * into grn_line from public.goods_receiving_lines where id=line.goods_receiving_line_id and goods_receiving_id=ret.goods_receiving_id for update;
    if grn_line.id is null or line.return_qty<=0 or line.return_qty>grn_line.received_qty-grn_line.returned_qty then raise exception 'Purchase return line is invalid.'; end if;
    if grn_line.conversion_to_base_uom_snapshot is null or grn_line.conversion_to_base_uom_snapshot<=0 then raise exception 'This historical GRN has no verified conversion snapshot and cannot be auto-posted.'; end if;
    base_return_qty:=line.return_qty*grn_line.conversion_to_base_uom_snapshot;
    base_unit_cost:=grn_line.unit_cost/grn_line.conversion_to_base_uom_snapshot;
    perform public.inventory_lock_item_branch(line.item_id,ret.branch_id);
    select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=line.item_id and branch_id=ret.branch_id and status='posted';
    if balance<base_return_qty then raise exception 'Return would make current branch stock negative.'; end if;
    movement_id:=public.insert_inventory_movement('ST-'||ret.purchase_return_no||'-'||left(line.id::text,4),ret.document_id,ret.branch_id,line.item_id,'return_to_supplier',ret.return_date,0,base_return_qty,base_unit_cost,actor.id,'Returned to supplier from '||ret.purchase_return_no,'purchase_return',ret.id);
    update public.goods_receiving_lines set returned_qty=returned_qty+line.return_qty where id=grn_line.id;
    update public.purchase_return_lines set stock_transaction_id=movement_id where id=line.id;
  end loop;
  update public.purchase_returns set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=ret.id;
  if ret.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=ret.document_id; end if;
  return jsonb_build_object('id',ret.id,'purchase_return_no',ret.purchase_return_no,'goods_receiving_id',ret.goods_receiving_id,'document_id',ret.document_id,'already_posted',false);
end $$;

revoke all on function public.create_goods_receiving_atomic(jsonb), public.post_goods_receiving_atomic(uuid,text), public.post_purchase_return_atomic(uuid) from public,anon;
grant execute on function public.create_goods_receiving_atomic(jsonb), public.post_goods_receiving_atomic(uuid,text), public.post_purchase_return_atomic(uuid) to authenticated;
