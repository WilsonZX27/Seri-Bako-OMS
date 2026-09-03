-- v9.2.18 — retain buyer comments on individual Purchase Order lines.
alter table public.purchase_order_lines
  add column if not exists remarks text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_order_lines_remarks_length_check'
      and conrelid = 'public.purchase_order_lines'::regclass
  ) then
    alter table public.purchase_order_lines
      add constraint purchase_order_lines_remarks_length_check
      check (remarks is null or char_length(remarks) <= 2000);
  end if;
end $$;

create or replace function public.create_purchase_order_atomic(p_payload jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  actor public.staffs%rowtype; existing public.purchase_orders%rowtype; order_id uuid; document_id uuid;
  po_no text := nullif(trim(p_payload->>'po_no'),''); branch_id uuid := nullif(p_payload->>'branch_id','')::uuid; supplier_id uuid := nullif(p_payload->>'supplier_id','')::uuid; idem uuid := nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb := coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id = auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_order.create') then raise exception 'You do not have permission to create a purchase order.'; end if;
  if po_no is null or supplier_id is null or jsonb_array_length(lines)=0 then raise exception 'Purchase order number, supplier, and at least one line are required.'; end if;
  if not exists (select 1 from public.branches b where b.id=branch_id and b.company_id=actor.company_id and b.deleted_at is null) then raise exception 'Branch is outside your company.'; end if;
  if not exists (select 1 from public.suppliers s where s.id=supplier_id and s.company_id=actor.company_id and s.status='active' and s.deleted_at is null) then raise exception 'Supplier is outside your company or inactive.'; end if;
  select * into existing from public.purchase_orders where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'po_no',existing.po_no,'document_id',existing.document_id); end if;
  order_id := gen_random_uuid(); document_id := gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(document_id,actor.company_id,po_no,'purchase_order','Purchase Order '||po_no,'draft','draft','Draft','purchase_order',order_id,actor.id,actor.id);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial document created.',actor.id);
  insert into public.purchase_orders(id,company_id,document_id,branch_id,po_no,supplier_id,order_date,expected_delivery_date,status,approval_status,remarks,created_by,updated_by,idempotency_key)
  values(order_id,actor.company_id,document_id,branch_id,po_no,supplier_id,coalesce(nullif(p_payload->>'order_date','')::date,current_date),nullif(p_payload->>'expected_delivery_date','')::date,'draft','draft',p_payload->>'remarks',actor.id,actor.id,idem);
  insert into public.purchase_order_lines(purchase_order_id,item_id,qty_ordered,qty_received,qty_cancelled,uom,unit_price,remarks)
  select order_id,x.item_id::uuid,x.qty_ordered::numeric,coalesce(x.qty_received::numeric,0),coalesce(x.qty_cancelled::numeric,0),x.uom,coalesce(x.unit_price::numeric,0),nullif(btrim(x.remarks),'')
  from jsonb_to_recordset(lines) as x(item_id text,qty_ordered text,qty_received text,qty_cancelled text,uom text,unit_price text,remarks text);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,created_by) values(actor.company_id,'document',document_id,'created','Purchase order '||po_no||' created',actor.id);
  return jsonb_build_object('id',order_id,'po_no',po_no,'document_id',document_id);
end $$;

revoke all on function public.create_purchase_order_atomic(jsonb) from public;
grant execute on function public.create_purchase_order_atomic(jsonb) to authenticated;
