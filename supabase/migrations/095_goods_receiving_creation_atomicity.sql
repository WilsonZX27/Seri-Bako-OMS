-- Sprint 7.23.8.3: GRN draft creation is one guarded aggregate transaction.
alter table public.goods_receivings add column if not exists idempotency_key uuid;
create unique index if not exists goods_receivings_idempotency_key_idx on public.goods_receivings(company_id, idempotency_key) where idempotency_key is not null and deleted_at is null;

create or replace function public.create_goods_receiving_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype; po public.purchase_orders%rowtype; existing public.goods_receivings%rowtype;
  grn_id uuid; document_id uuid; grn_no text := nullif(trim(p_payload->>'grn_no'),'');
  branch_id uuid := nullif(p_payload->>'branch_id','')::uuid; location_id uuid := nullif(p_payload->>'location_id','')::uuid;
  supplier_id uuid := nullif(p_payload->>'supplier_id','')::uuid; purchase_order_id uuid := nullif(p_payload->>'purchase_order_id','')::uuid;
  idem uuid := nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb := coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('goods_receiving.create') then raise exception 'Missing permission: goods_receiving.create'; end if;
  if grn_no is null or purchase_order_id is null or supplier_id is null or branch_id is null or location_id is null or jsonb_array_length(lines)=0 then raise exception 'GRN number, purchase order, supplier, branch, location, and lines are required.'; end if;
  select * into po from public.purchase_orders where id=purchase_order_id and company_id=actor.company_id and deleted_at is null for update;
  if po.id is null or po.supplier_id is distinct from supplier_id or po.status not in ('approved','sent','partial_received') then raise exception 'Purchase order is unavailable for receiving.'; end if;
  if not exists (select 1 from public.branches where id=branch_id and company_id=actor.company_id and status='active' and deleted_at is null)
    or not public.can_access_inventory_branch(actor.company_id,branch_id)
    or not exists (select 1 from public.locations where id=location_id and branch_id=branch_id and company_id=actor.company_id and status='active' and deleted_at is null)
    or not exists (select 1 from public.suppliers where id=supplier_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'GRN references are outside your active company and branch scope.'; end if;
  if exists (
    select 1 from jsonb_to_recordset(lines) as x(purchase_order_line_id text,item_id text,ordered_qty text,previously_received_qty text,pending_qty text,received_qty text,rejected_qty text,uom text,unit_cost text,batch_no text,expiry_date text,remarks text)
    left join public.purchase_order_lines pol on pol.id=x.purchase_order_line_id::uuid and pol.purchase_order_id=po.id
    left join public.items i on i.id=x.item_id::uuid and i.company_id=actor.company_id and i.status='active' and i.deleted_at is null
    where pol.id is null or i.id is null or pol.item_id is distinct from x.item_id::uuid or pol.uom is distinct from x.uom
      or coalesce(x.ordered_qty::numeric,-1)<0 or coalesce(x.previously_received_qty::numeric,-1)<0 or coalesce(x.pending_qty::numeric,-1)<0
      or coalesce(x.received_qty::numeric,-1)<0 or coalesce(x.rejected_qty::numeric,-1)<0 or coalesce(x.unit_cost::numeric,-1)<0
      or coalesce(x.received_qty::numeric,0)+coalesce(x.rejected_qty::numeric,0)>coalesce(x.pending_qty::numeric,0)
  ) then raise exception 'GRN lines must match the active purchase order and its current pending quantities.'; end if;
  select * into existing from public.goods_receivings where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'grn_no',existing.grn_no,'document_id',existing.document_id,'idempotent',true); end if;
  grn_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(document_id,actor.company_id,grn_no,'goods_receiving','Goods Receiving '||grn_no,'draft','not_required','Draft receiving','goods_receiving',grn_id,actor.id,actor.id);
  insert into public.goods_receivings(id,company_id,document_id,purchase_order_id,grn_no,supplier_id,received_date,branch_id,location_id,status,received_by,remarks,created_by,updated_by,idempotency_key)
  values(grn_id,actor.company_id,document_id,po.id,grn_no,supplier_id,coalesce(nullif(p_payload->>'received_date','')::date,current_date),branch_id,location_id,'draft',actor.id,nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.goods_receiving_lines(goods_receiving_id,purchase_order_line_id,item_id,ordered_qty,previously_received_qty,pending_qty,received_qty,rejected_qty,uom,unit_cost,batch_no,expiry_date,remarks)
  select grn_id,x.purchase_order_line_id::uuid,x.item_id::uuid,x.ordered_qty::numeric,x.previously_received_qty::numeric,x.pending_qty::numeric,x.received_qty::numeric,x.rejected_qty::numeric,x.uom,x.unit_cost::numeric,nullif(trim(x.batch_no),''),nullif(trim(x.expiry_date),'')::date,nullif(trim(x.remarks),'')
  from jsonb_to_recordset(lines) as x(purchase_order_line_id text,item_id text,ordered_qty text,previously_received_qty text,pending_qty text,received_qty text,rejected_qty text,uom text,unit_cost text,batch_no text,expiry_date text,remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial goods receiving created.',actor.id);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(actor.company_id,'document',document_id,'created','Goods receiving '||grn_no||' created',jsonb_build_object('goods_receiving_id',grn_id,'purchase_order_id',po.id),actor.id);
  return jsonb_build_object('id',grn_id,'grn_no',grn_no,'document_id',document_id,'idempotent',false);
end $$;

revoke all on function public.create_goods_receiving_atomic(jsonb) from public, anon;
grant execute on function public.create_goods_receiving_atomic(jsonb) to authenticated;
