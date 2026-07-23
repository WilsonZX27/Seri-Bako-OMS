-- Location retirement: inventory is owned by a Branch / Outlet, never a
-- secondary warehouse/bin/room. This migration intentionally removes the
-- compatibility columns introduced before branch-level inventory became the
-- operational model. There is no data backfill: this system has not begun
-- operational use and must not retain a fake location dimension.

-- Remove location-dependent routines before removing their relation and
-- columns. The branch-owned replacements are defined below.
drop function if exists public.inventory_lock_item_location(uuid, uuid);
drop function if exists public.insert_inventory_movement(text, uuid, uuid, uuid, uuid, public.stock_transaction_type, date, numeric, numeric, numeric, uuid, text, text, uuid);
drop function if exists public.post_manual_inventory_movement(text, uuid, uuid, uuid, public.stock_transaction_type, date, numeric, numeric, numeric, text, uuid, uuid);
drop function if exists public.post_opening_stock(text, uuid, uuid, uuid, date, numeric, numeric, text);
drop function if exists public.post_opening_stock_batch(jsonb);
drop function if exists public.post_stock_transfer_atomic(uuid);
drop function if exists public.post_stock_wastage_atomic(uuid);
drop function if exists public.post_production_job_atomic(uuid);
drop function if exists public.post_goods_receiving_atomic(uuid, text);
drop function if exists public.post_purchase_return_atomic(uuid);
drop function if exists public.post_stock_count_atomic(uuid);
drop function if exists public.create_purchase_request_atomic(jsonb);
drop function if exists public.create_stock_transfer_atomic(jsonb);
drop function if exists public.create_stock_wastage_atomic(jsonb);
drop function if exists public.create_goods_receiving_atomic(jsonb);
drop function if exists public.create_production_job_atomic(jsonb);
drop function if exists public.create_purchase_return_atomic(jsonb);

drop view if exists public.low_stock_items;
drop view if exists public.inventory_valuation_view;
drop view if exists public.stock_balances_view;
drop view if exists public.item_location_stock_balances;
drop view if exists public.stock_ledger_view;
drop view if exists public.stock_counts_list_view;

-- These RLS policies are recreated below. Dropping them first keeps the
-- column retirement explicit instead of using CASCADE against a security rule.
drop policy if exists "tenant production jobs" on public.production_jobs;
drop policy if exists "tenant purchase requests" on public.purchase_requests;
drop policy if exists "tenant goods receivings" on public.goods_receivings;
drop policy if exists "tenant purchase returns" on public.purchase_returns;
drop policy if exists "tenant stock counts" on public.stock_counts;
drop policy if exists "tenant stock transactions read" on public.stock_transactions;
drop policy if exists "tenant stock transaction lines read" on public.stock_transaction_lines;
drop policy if exists "tenant stock transfers" on public.stock_transfers;
drop policy if exists "tenant stock wastage" on public.stock_wastage;

alter table public.branches drop column if exists default_location_id;
alter table public.purchase_requests drop column if exists location_id;
alter table public.goods_receivings drop column if exists location_id;
alter table public.purchase_returns drop column if exists location_id;
alter table public.production_jobs drop column if exists location_id;
alter table public.stock_counts drop column if exists location_id;
alter table public.stock_transfers drop column if exists from_location_id, drop column if exists to_location_id;
alter table public.stock_wastage drop column if exists location_id;
alter table public.stock_transactions drop column if exists location_id, drop column if exists from_location_id, drop column if exists to_location_id;
alter table public.stock_transaction_lines drop column if exists location_id;

drop table if exists public.staff_locations;
drop table if exists public.locations;
drop function if exists public.enforce_staff_location_tenant();

create or replace function public.inventory_lock_item_branch(p_item_id uuid, p_branch_id uuid)
returns void language plpgsql volatile security definer set search_path = pg_catalog, public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_item_id::text || ':' || p_branch_id::text, 0));
end $$;
revoke all on function public.inventory_lock_item_branch(uuid, uuid) from public, anon, authenticated;

create or replace function public.insert_inventory_movement(
  p_transaction_no text, p_document_id uuid, p_branch_id uuid, p_item_id uuid,
  p_transaction_type public.stock_transaction_type, p_transaction_date date,
  p_quantity_in numeric, p_quantity_out numeric, p_unit_cost numeric,
  p_actor_id uuid, p_remarks text, p_reference_type text, p_reference_id uuid
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare movement_id uuid;
begin
  if p_quantity_in < 0 or p_quantity_out < 0 or (p_quantity_in > 0 and p_quantity_out > 0) or (p_quantity_in = 0 and p_quantity_out = 0) then
    raise exception 'Inventory movement must contain one positive direction.';
  end if;
  insert into public.stock_transactions (transaction_no,document_id,branch_id,item_id,transaction_type,transaction_date,quantity_in,quantity_out,unit_cost,total_cost,status,posted_at,posted_by,remarks,reference_type,reference_id,created_by)
  values (p_transaction_no,p_document_id,p_branch_id,p_item_id,p_transaction_type,p_transaction_date,p_quantity_in,p_quantity_out,coalesce(p_unit_cost,0),greatest(p_quantity_in,p_quantity_out)*coalesce(p_unit_cost,0),'posted',now(),p_actor_id,p_remarks,p_reference_type,p_reference_id,p_actor_id)
  returning id into movement_id;
  insert into public.stock_transaction_lines (stock_transaction_id,stock_entity_type,item_id,branch_id,quantity_in,quantity_out,unit_cost,reference_type,reference_id,remarks,created_by)
  values (movement_id,'item',p_item_id,p_branch_id,p_quantity_in,p_quantity_out,coalesce(p_unit_cost,0),p_reference_type,p_reference_id,p_remarks,p_actor_id);
  return movement_id;
end $$;
revoke all on function public.insert_inventory_movement(text, uuid, uuid, uuid, public.stock_transaction_type, date, numeric, numeric, numeric, uuid, text, text, uuid) from public, anon, authenticated;

create or replace function public.post_opening_stock(
  p_transaction_no text, p_branch_id uuid, p_item_id uuid, p_transaction_date date,
  p_quantity numeric, p_unit_cost numeric, p_remarks text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor public.staffs%rowtype; branch_company uuid;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_transactions.create') then raise exception 'Missing permission: stock_transactions.create'; end if;
  perform public.inventory_lock_item_branch(p_item_id,p_branch_id);
  select company_id into branch_company from public.branches where id=p_branch_id and status='active' and deleted_at is null;
  if not public.can_access_inventory_branch(branch_company,p_branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  if not exists (select 1 from public.items where id=p_item_id and status='active' and deleted_at is null) then raise exception 'Opening stock item must be active.'; end if;
  if p_quantity <= 0 or coalesce(p_unit_cost,0) < 0 then raise exception 'Opening stock quantity and cost are invalid.'; end if;
  if exists (select 1 from public.stock_transactions where branch_id=p_branch_id and item_id=p_item_id and transaction_type='opening_balance' and status='posted') then raise exception 'Opening stock already exists for this branch and item.'; end if;
  return public.insert_inventory_movement(p_transaction_no,null,p_branch_id,p_item_id,'opening_balance',p_transaction_date,p_quantity,0,coalesce(p_unit_cost,0),actor.id,p_remarks,'opening_stock_import',null);
end $$;

create or replace function public.post_opening_stock_batch(p_rows jsonb)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare row_value jsonb; posted_count integer:=0;
begin
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)=0 or jsonb_array_length(p_rows)>500 then raise exception 'Opening stock batch must contain between 1 and 500 rows.'; end if;
  for row_value in select value from jsonb_array_elements(p_rows) loop
    perform public.post_opening_stock(row_value->>'transaction_no',(row_value->>'branch_id')::uuid,(row_value->>'item_id')::uuid,(row_value->>'transaction_date')::date,(row_value->>'quantity')::numeric,(row_value->>'unit_cost')::numeric,row_value->>'remarks');
    posted_count:=posted_count+1;
  end loop;
  return posted_count;
end $$;

create or replace function public.post_manual_inventory_movement(
  p_transaction_no text, p_branch_id uuid, p_item_id uuid, p_transaction_type public.stock_transaction_type,
  p_transaction_date date, p_quantity_in numeric, p_quantity_out numeric, p_unit_cost numeric, p_remarks text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare actor_id uuid; movement_id uuid; balance numeric; new_document_id uuid;
begin
  actor_id:=public.current_staff_id();
  if actor_id is null or not public.has_permission('stock_transactions.create') then raise exception 'Missing permission: stock_transactions.create'; end if;
  if p_quantity_in<0 or p_quantity_out<0 or (p_quantity_in>0 and p_quantity_out>0) or (p_quantity_in=0 and p_quantity_out=0) then raise exception 'Inventory movement must contain one positive direction.'; end if;
  if not public.can_access_inventory_branch((select company_id from public.branches where id=p_branch_id),p_branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
  perform public.inventory_lock_item_branch(p_item_id,p_branch_id);
  if p_quantity_out>0 then
    select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=p_item_id and branch_id=p_branch_id and status='posted';
    if balance<p_quantity_out and not public.current_staff_has_company_role(array['super_admin','owner']) then raise exception 'This stock movement would make current stock negative.'; end if;
  end if;
  select id into movement_id from public.stock_transactions where transaction_no=p_transaction_no for update;
  if movement_id is not null then return movement_id; end if;
  movement_id:=public.insert_inventory_movement(p_transaction_no,null,p_branch_id,p_item_id,p_transaction_type,p_transaction_date,p_quantity_in,p_quantity_out,coalesce(p_unit_cost,0),actor_id,p_remarks,'stock_transaction',null);
  insert into public.documents(company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,posted_at,created_by,updated_by)
  values((select company_id from public.branches where id=p_branch_id),p_transaction_no,'stock_transaction','Stock Transaction '||p_transaction_no,'posted','not_required','Posted to ledger','stock_transaction',movement_id,now(),actor_id,actor_id) returning id into new_document_id;
  update public.stock_transactions set document_id=new_document_id where id=movement_id;
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(new_document_id,1,'Initial stock transaction posted.',actor_id);
  return movement_id;
end $$;

-- Rebuild branch-level read models without compatibility placeholders.
create view public.stock_ledger_view as
select st.id as stock_transaction_id,st.transaction_no,st.transaction_date,st.transaction_type,st.status,st.document_id,st.reference_type,st.reference_id,st.created_by,st.posted_at,
  stl.id as stock_transaction_line_id,coalesce(stl.item_id,st.item_id) as item_id,i.item_code,i.item_name,i.base_unit,coalesce(stl.branch_id,st.branch_id) as branch_id,b.branch_name,
  coalesce(stl.quantity_in,st.quantity_in) as quantity_in,coalesce(stl.quantity_out,st.quantity_out) as quantity_out,coalesce(stl.unit_cost,st.unit_cost,0) as unit_cost,
  coalesce(stl.total_cost,st.total_cost,coalesce(st.unit_cost,0)*greatest(st.quantity_in,st.quantity_out)) as total_cost,
  sum(coalesce(stl.quantity_in,st.quantity_in)-coalesce(stl.quantity_out,st.quantity_out)) over(partition by coalesce(stl.item_id,st.item_id),coalesce(stl.branch_id,st.branch_id) order by st.transaction_date,st.created_at,st.id rows between unbounded preceding and current row) as running_balance
from public.stock_transactions st left join public.stock_transaction_lines stl on stl.stock_transaction_id=st.id join public.items i on i.id=coalesce(stl.item_id,st.item_id) left join public.branches b on b.id=coalesce(stl.branch_id,st.branch_id) where st.status='posted';

create view public.inventory_valuation_view as
select item_id,item_code,item_name,base_unit,branch_id,branch_name,sum(quantity_in) as total_quantity_in,sum(quantity_out) as total_quantity_out,sum(quantity_in-quantity_out) as current_qty,
case when sum(quantity_in)>0 then sum(case when quantity_in>0 then total_cost else 0 end)/sum(quantity_in) else 0 end as average_cost,
sum(quantity_in-quantity_out)*case when sum(quantity_in)>0 then sum(case when quantity_in>0 then total_cost else 0 end)/sum(quantity_in) else 0 end as inventory_value,max(transaction_date) as last_movement
from public.stock_ledger_view group by item_id,item_code,item_name,base_unit,branch_id,branch_name;

create view public.stock_balances_view as
select ledger.item_id,ledger.item_code,i.autocount_code,ledger.item_name,i.category,i.purchase_unit,ledger.base_unit,i.conversion_to_base_unit,i.supplier_id,s.name as supplier_name,i.cost,i.safety_stock,i.lead_time_days,i.moq,i.status,ledger.branch_id,ledger.branch_name,
sum(ledger.quantity_in) as total_quantity_in,sum(ledger.quantity_out) as total_quantity_out,sum(ledger.quantity_in-ledger.quantity_out) as current_stock,sum(ledger.quantity_in-ledger.quantity_out) as current_qty,
case when sum(ledger.quantity_in)>0 then sum(case when ledger.quantity_in>0 then ledger.total_cost else 0 end)/sum(ledger.quantity_in) else 0 end as average_cost,
sum(ledger.quantity_in-ledger.quantity_out)*case when sum(ledger.quantity_in)>0 then sum(case when ledger.quantity_in>0 then ledger.total_cost else 0 end)/sum(ledger.quantity_in) else 0 end as inventory_value,max(ledger.transaction_date) as last_movement,
sum(ledger.quantity_in-ledger.quantity_out)<i.safety_stock as is_low_stock,greatest(i.safety_stock-sum(ledger.quantity_in-ledger.quantity_out),0) as shortage_quantity
from public.stock_ledger_view ledger join public.items i on i.id=ledger.item_id left join public.suppliers s on s.id=i.supplier_id
group by ledger.item_id,ledger.item_code,i.autocount_code,ledger.item_name,i.category,i.purchase_unit,ledger.base_unit,i.conversion_to_base_unit,i.supplier_id,s.name,i.cost,i.safety_stock,i.lead_time_days,i.moq,i.status,ledger.branch_id,ledger.branch_name;
create view public.low_stock_items as select item_id,item_code,item_name,category,base_unit,supplier_id,supplier_name,current_stock,safety_stock,shortage_quantity,moq,lead_time_days,cost from public.stock_balances_view where is_low_stock=true and status='active' order by shortage_quantity desc,item_name asc;
create view public.stock_counts_list_view as select sc.*,b.branch_name,counted.full_name as counted_by_name,count(scl.id)::integer as line_count,count(scl.id) filter(where abs(scl.variance_percent)>sc.tolerance_percent)::integer as high_variance_count from public.stock_counts sc left join public.branches b on b.id=sc.branch_id left join public.staffs counted on counted.id=sc.counted_by left join public.stock_count_lines scl on scl.stock_count_id=sc.id where sc.deleted_at is null group by sc.id,b.branch_name,counted.full_name;
alter view public.stock_ledger_view set (security_invoker=true);
alter view public.inventory_valuation_view set (security_invoker=true);
alter view public.stock_balances_view set (security_invoker=true);
alter view public.low_stock_items set (security_invoker=true);
alter view public.stock_counts_list_view set (security_invoker=true);
revoke all on public.stock_ledger_view,public.inventory_valuation_view,public.stock_balances_view,public.low_stock_items,public.stock_counts_list_view from public,anon;
grant select on public.stock_ledger_view,public.inventory_valuation_view,public.stock_balances_view,public.low_stock_items,public.stock_counts_list_view to authenticated;

create policy "tenant production jobs" on public.production_jobs for all to authenticated using (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['production.view','production.create','production.approve','production.post'])) with check (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['production.create','production.approve','production.post']));
create policy "tenant purchase requests" on public.purchase_requests for all to authenticated using (public.can_access_purchase_request(company_id,branch_id,requested_by)) with check (public.can_access_purchase_request(company_id,branch_id,requested_by));
create policy "tenant goods receivings" on public.goods_receivings for all to authenticated using (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['goods_receiving.read','goods_receiving.create','goods_receiving.update','goods_receiving.post'])) with check (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['goods_receiving.create','goods_receiving.update']));
create policy "tenant purchase returns" on public.purchase_returns for all to authenticated using (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['purchase_return.view','purchase_return.create','purchase_return.post'])) with check (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['purchase_return.create','purchase_return.post']));
create policy "tenant stock counts" on public.stock_counts for all to authenticated using (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['stock_count.read','stock_count.create','stock_count.update','stock_count.approve','stock_count.post'])) with check (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['stock_count.create','stock_count.update']));
create policy "tenant stock transactions read" on public.stock_transactions for select to authenticated using (exists(select 1 from public.branches b where b.id=stock_transactions.branch_id and public.can_access_company_branch(b.company_id,b.id) and public.has_permission('stock_transactions.read')));
create policy "tenant stock transaction lines read" on public.stock_transaction_lines for select to authenticated using (exists(select 1 from public.stock_transactions st join public.branches b on b.id=st.branch_id where st.id=stock_transaction_lines.stock_transaction_id and public.can_access_company_branch(b.company_id,b.id) and public.has_permission('stock_transactions.read')));
create policy "tenant stock transfers" on public.stock_transfers for all to authenticated using (company_id=public.current_staff_company_id() and (public.can_access_company_branch(company_id,from_branch_id) or public.can_access_company_branch(company_id,to_branch_id)) and public.has_any_permission(array['stock_transfer.read','stock_transfer.create','stock_transfer.update','stock_transfer.post'])) with check (company_id=public.current_staff_company_id() and public.can_access_company_branch(company_id,from_branch_id) and public.has_any_permission(array['stock_transfer.create','stock_transfer.update']));
create policy "tenant stock wastage" on public.stock_wastage for all to authenticated using (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['stock_wastage.read','stock_wastage.create','stock_wastage.update','stock_wastage.post'])) with check (public.can_access_company_branch(company_id,branch_id) and public.has_any_permission(array['stock_wastage.create','stock_wastage.update','stock_wastage.post']));

-- Aggregate draft creation remains database-owned. Branch ownership is checked
-- at the database boundary; clients never get to supply a second location key.
create or replace function public.create_purchase_request_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; existing public.purchase_requests%rowtype; request_id uuid; document_id uuid; request_no text:=nullif(trim(p_payload->>'request_no'),''); branch_id uuid:=nullif(p_payload->>'branch_id','')::uuid; idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb:=coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_request.create') then raise exception 'You do not have permission to create a purchase request.'; end if;
  if request_no is null or branch_id is null or jsonb_array_length(lines)=0 then raise exception 'Purchase request number, branch, and at least one line are required.'; end if;
  if not exists(select 1 from public.branches where id=branch_id and company_id=actor.company_id and deleted_at is null) then raise exception 'Branch is outside your company.'; end if;
  select * into existing from public.purchase_requests where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'request_no',existing.request_no,'document_id',existing.document_id,'idempotent',true); end if;
  request_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,request_no,'purchase_request','Purchase Request '||request_no,'draft','draft','Draft','purchase_request',request_id,actor.id,actor.id);
  insert into public.purchase_requests(id,company_id,document_id,request_no,requested_by,request_date,required_date,priority,needed_by_date,urgency_reason,production_risk,branch_id,status,remarks,created_by,updated_by,idempotency_key)
  values(request_id,actor.company_id,document_id,request_no,actor.id,coalesce(nullif(p_payload->>'request_date','')::date,current_date),nullif(p_payload->>'required_date','')::date,coalesce(nullif(p_payload->>'priority',''),'normal'),nullif(p_payload->>'needed_by_date','')::date,nullif(trim(p_payload->>'urgency_reason'),''),coalesce((p_payload->>'production_risk')::boolean,false),branch_id,'draft',nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.purchase_request_lines(purchase_request_id,item_id,qty,uom,estimated_unit_cost,suggested_supplier_id,reason,remarks) select request_id,x.item_id::uuid,x.qty::numeric,x.uom,coalesce(x.estimated_unit_cost::numeric,0),nullif(x.suggested_supplier_id,'')::uuid,x.reason,x.remarks from jsonb_to_recordset(lines) as x(item_id text,qty text,uom text,estimated_unit_cost text,suggested_supplier_id text,reason text,remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial purchase request created.',actor.id);
  return jsonb_build_object('id',request_id,'request_no',request_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.create_stock_transfer_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; existing public.stock_transfers%rowtype; transfer_id uuid; document_id uuid; transfer_no text:=nullif(trim(p_payload->>'transfer_no'),''); from_branch_id uuid:=nullif(p_payload->>'from_branch_id','')::uuid; to_branch_id uuid:=nullif(p_payload->>'to_branch_id','')::uuid; idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb:=coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_transfer.create') then raise exception 'Missing permission: stock_transfer.create'; end if;
  if transfer_no is null or from_branch_id is null or to_branch_id is null or from_branch_id=to_branch_id or jsonb_array_length(lines)=0 then raise exception 'Transfer number, different branches, and lines are required.'; end if;
  if not exists(select 1 from public.branches where id=from_branch_id and company_id=actor.company_id and status='active' and deleted_at is null) or not exists(select 1 from public.branches where id=to_branch_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'Transfer branch is outside your active company scope.'; end if;
  select * into existing from public.stock_transfers where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'transfer_no',existing.transfer_no,'document_id',existing.document_id,'idempotent',true); end if;
  transfer_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,transfer_no,'stock_transfer','Stock Transfer '||transfer_no,'draft','draft','Draft','stock_transfer',transfer_id,actor.id,actor.id);
  insert into public.stock_transfers(id,company_id,document_id,transfer_no,transfer_date,from_branch_id,to_branch_id,status,remarks,created_by,updated_by,idempotency_key) values(transfer_id,actor.company_id,document_id,transfer_no,coalesce(nullif(p_payload->>'transfer_date','')::date,current_date),from_branch_id,to_branch_id,'draft',nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.stock_transfer_lines(stock_transfer_id,item_id,quantity,uom,remarks) select transfer_id,x.item_id::uuid,x.quantity::numeric,x.uom,nullif(trim(x.remarks),'') from jsonb_to_recordset(lines) as x(item_id text,quantity text,uom text,remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial stock transfer created.',actor.id);
  return jsonb_build_object('id',transfer_id,'transfer_no',transfer_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.create_stock_wastage_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; existing public.stock_wastage%rowtype; wastage_id uuid; document_id uuid; wastage_no text:=nullif(trim(p_payload->>'wastage_no'),''); branch_id uuid:=nullif(p_payload->>'branch_id','')::uuid; idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb:=coalesce(p_payload->'lines','[]'::jsonb); main_reason public.stock_wastage_reason:=nullif(p_payload->>'reason','')::public.stock_wastage_reason;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_wastage.create') then raise exception 'Missing permission: stock_wastage.create'; end if;
  if wastage_no is null or branch_id is null or main_reason is null or jsonb_array_length(lines)=0 then raise exception 'Wastage number, branch, reason, and lines are required.'; end if;
  if not exists(select 1 from public.branches where id=branch_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'Wastage branch is outside your active company scope.'; end if;
  select * into existing from public.stock_wastage where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'wastage_no',existing.wastage_no,'document_id',existing.document_id,'idempotent',true); end if;
  wastage_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,wastage_no,'stock_wastage','Stock Wastage '||wastage_no,'draft','draft','Draft','stock_wastage',wastage_id,actor.id,actor.id);
  insert into public.stock_wastage(id,company_id,document_id,wastage_no,wastage_date,branch_id,reason,status,remarks,created_by,updated_by,idempotency_key) values(wastage_id,actor.company_id,document_id,wastage_no,coalesce(nullif(p_payload->>'wastage_date','')::date,current_date),branch_id,main_reason,'draft',nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.stock_wastage_lines(stock_wastage_id,item_id,quantity,uom,reason,batch_no,expiry_date,remarks) select wastage_id,x.item_id::uuid,x.quantity::numeric,x.uom,x.reason::public.stock_wastage_reason,nullif(trim(x.batch_no),''),nullif(trim(x.expiry_date),'')::date,nullif(trim(x.remarks),'') from jsonb_to_recordset(lines) as x(item_id text,quantity text,uom text,reason text,batch_no text,expiry_date text,remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial stock wastage created.',actor.id);
  return jsonb_build_object('id',wastage_id,'wastage_no',wastage_no,'document_id',document_id,'idempotent',false);
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
  if not public.can_access_inventory_branch(actor.company_id,branch_id) or not exists(select 1 from public.suppliers where id=supplier_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'GRN references are outside your active company and branch scope.'; end if;
  select * into existing from public.goods_receivings where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'grn_no',existing.grn_no,'document_id',existing.document_id,'idempotent',true); end if;
  grn_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,grn_no,'goods_receiving','Goods Receiving '||grn_no,'draft','not_required','Draft receiving','goods_receiving',grn_id,actor.id,actor.id);
  insert into public.goods_receivings(id,company_id,document_id,purchase_order_id,grn_no,supplier_id,received_date,branch_id,status,received_by,remarks,created_by,updated_by,idempotency_key) values(grn_id,actor.company_id,document_id,po.id,grn_no,supplier_id,coalesce(nullif(p_payload->>'received_date','')::date,current_date),branch_id,'draft',actor.id,nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.goods_receiving_lines(goods_receiving_id,purchase_order_line_id,item_id,ordered_qty,previously_received_qty,pending_qty,received_qty,rejected_qty,uom,unit_cost,batch_no,expiry_date,remarks)
  select grn_id,x.purchase_order_line_id::uuid,x.item_id::uuid,x.ordered_qty::numeric,x.previously_received_qty::numeric,x.pending_qty::numeric,x.received_qty::numeric,x.rejected_qty::numeric,x.uom,x.unit_cost::numeric,nullif(trim(x.batch_no),''),nullif(trim(x.expiry_date),'')::date,nullif(trim(x.remarks),'') from jsonb_to_recordset(lines) as x(purchase_order_line_id text,item_id text,ordered_qty text,previously_received_qty text,pending_qty text,received_qty text,rejected_qty text,uom text,unit_cost text,batch_no text,expiry_date text,remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial goods receiving created.',actor.id);
  return jsonb_build_object('id',grn_id,'grn_no',grn_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.create_purchase_return_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; grn public.goods_receivings%rowtype; existing public.purchase_returns%rowtype; return_id uuid; document_id uuid; return_no text:=nullif(trim(p_payload->>'purchase_return_no'),''); grn_id uuid:=nullif(p_payload->>'goods_receiving_id','')::uuid; return_date date:=coalesce(nullif(p_payload->>'return_date','')::date,current_date); idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid; lines jsonb:=coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('purchase_return.create') then raise exception 'Missing permission: purchase_return.create'; end if;
  if return_no is null or grn_id is null or jsonb_array_length(lines)=0 then raise exception 'Return number, posted GRN, and at least one return line are required.'; end if;
  select * into grn from public.goods_receivings where id=grn_id and company_id=actor.company_id and deleted_at is null for update;
  if grn.id is null or grn.status<>'posted' or not public.can_access_inventory_branch(grn.company_id,grn.branch_id) then raise exception 'Only a posted GRN in your accessible company branch can be returned.'; end if;
  select * into existing from public.purchase_returns where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'purchase_return_no',existing.purchase_return_no,'document_id',existing.document_id,'idempotent',true); end if;
  return_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,return_no,'purchase_return','Purchase Return '||return_no,'draft','not_required','Draft return','purchase_return',return_id,actor.id,actor.id);
  insert into public.purchase_returns(id,company_id,document_id,purchase_return_no,goods_receiving_id,purchase_order_id,supplier_id,branch_id,return_date,status,reason,remarks,created_by,updated_by,idempotency_key) values(return_id,actor.company_id,document_id,return_no,grn.id,grn.purchase_order_id,grn.supplier_id,grn.branch_id,return_date,'draft',nullif(trim(p_payload->>'reason'),''),nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.purchase_return_lines(purchase_return_id,goods_receiving_line_id,purchase_order_line_id,item_id,received_qty,previously_returned_qty,return_qty,uom,unit_cost,reason)
  select return_id,gl.id,gl.purchase_order_line_id,gl.item_id,gl.received_qty,gl.returned_qty,x.return_qty::numeric,gl.uom,gl.unit_cost,nullif(trim(x.reason),'') from jsonb_to_recordset(lines) as x(goods_receiving_line_id text,item_id text,purchase_order_line_id text,return_qty text,uom text,reason text) join public.goods_receiving_lines gl on gl.id=x.goods_receiving_line_id::uuid and gl.goods_receiving_id=grn.id;
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial purchase return created.',actor.id);
  return jsonb_build_object('id',return_id,'purchase_return_no',return_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.create_production_job_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; existing public.production_jobs%rowtype; recipe record; ingredient record; job_id uuid; document_id uuid; output_item_id uuid; job_no text:=nullif(trim(p_payload->>'production_job_no'),''); branch_id uuid:=nullif(p_payload->>'branch_id','')::uuid; recipe_id uuid:=nullif(p_payload->>'recipe_id','')::uuid; production_date date:=coalesce(nullif(p_payload->>'production_date','')::date,current_date); planned_qty numeric:=nullif(p_payload->>'planned_output_qty','')::numeric; output_uom text:=nullif(trim(p_payload->>'output_uom'),''); priority text:=coalesce(nullif(trim(p_payload->>'priority'),''),'normal'); idem uuid:=nullif(p_payload->>'idempotency_key','')::uuid; factor numeric; total_cost numeric:=0; unit_cost numeric; available_qty numeric;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('production.create') then raise exception 'Missing permission: production.create'; end if;
  if job_no is null or branch_id is null or recipe_id is null or planned_qty is null or planned_qty<=0 or output_uom is null or priority not in ('low','normal','urgent','critical') then raise exception 'Production number, branch, recipe, positive output quantity, UOM, and valid priority are required.'; end if;
  if not public.can_access_inventory_branch(actor.company_id,branch_id) or not exists(select 1 from public.branches where id=branch_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'Production branch is outside your active company scope.'; end if;
  select * into existing from public.production_jobs where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'production_job_no',existing.production_job_no,'document_id',existing.document_id,'idempotent',true); end if;
  select r.id,r.recipe_no,r.product_id,r.yield_qty,p.product_code,p.product_name,p.category as product_category into recipe from public.recipes r join public.products p on p.id=r.product_id and p.company_id=actor.company_id and p.status='active' and p.deleted_at is null where r.id=recipe_id and r.company_id=actor.company_id and r.status='active' and r.deleted_at is null for update of r;
  if recipe.id is null or recipe.yield_qty<=0 then raise exception 'An active company recipe with a positive yield is required.'; end if;
  if not exists(select 1 from public.recipe_lines where recipe_id=recipe.id) then raise exception 'The selected recipe must contain ingredients.'; end if;
  factor:=planned_qty/recipe.yield_qty;
  for ingredient in select rl.ingredient_item_id,rl.base_qty_required,coalesce(rl.base_uom,rl.recipe_uom,rl.unit) as uom,coalesce(rl.cost_per_unit,0) as unit_cost,i.item_code,i.item_name from public.recipe_lines rl join public.items i on i.id=rl.ingredient_item_id and i.company_id=actor.company_id and i.status='active' and i.deleted_at is null where rl.recipe_id=recipe.id order by i.item_code,rl.id loop total_cost:=total_cost+(ingredient.base_qty_required*factor*ingredient.unit_cost); end loop;
  unit_cost:=total_cost/planned_qty;
  select id into output_item_id from public.items where company_id=actor.company_id and item_code=recipe.product_code and deleted_at is null for update;
  if output_item_id is null then insert into public.items(company_id,item_code,item_name,category,purchase_unit,base_unit,conversion_to_base_unit,cost,status) values(actor.company_id,recipe.product_code,recipe.product_name,coalesce(recipe.product_category,'Finished Goods'),output_uom,output_uom,1,unit_cost,'active') returning id into output_item_id; end if;
  job_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by) values(document_id,actor.company_id,job_no,'production_job','Production Job '||job_no||' - '||recipe.product_name,'draft','draft','Draft production job','production_job',job_id,actor.id,actor.id);
  insert into public.production_jobs(id,company_id,branch_id,production_job_no,production_date,recipe_id,product_id,output_item_id,planned_output_qty,output_uom,priority,remarks,document_id,created_by,updated_by,idempotency_key) values(job_id,actor.company_id,branch_id,job_no,production_date,recipe.id,recipe.product_id,output_item_id,planned_qty,output_uom,priority,nullif(trim(p_payload->>'remarks'),''),document_id,actor.id,actor.id,idem);
  for ingredient in select rl.ingredient_item_id,rl.base_qty_required,coalesce(rl.base_uom,rl.recipe_uom,rl.unit) as uom,coalesce(rl.cost_per_unit,0) as unit_cost,i.item_code,i.item_name from public.recipe_lines rl join public.items i on i.id=rl.ingredient_item_id where rl.recipe_id=recipe.id order by i.item_code,rl.id loop select coalesce(sum(quantity_in-quantity_out),0) into available_qty from public.stock_transactions where item_id=ingredient.ingredient_item_id and branch_id=branch_id and status='posted'; insert into public.production_job_ingredient_lines(production_job_id,item_id,item_code,item_name,required_qty,actual_qty,uom,unit_cost,line_cost,stock_available_qty,variance_qty) values(job_id,ingredient.ingredient_item_id,ingredient.item_code,ingredient.item_name,ingredient.base_qty_required*factor,ingredient.base_qty_required*factor,ingredient.uom,ingredient.unit_cost,ingredient.base_qty_required*factor*ingredient.unit_cost,available_qty,available_qty-(ingredient.base_qty_required*factor)); end loop;
  insert into public.production_job_output_lines(production_job_id,product_id,item_id,output_code,output_name,planned_qty,actual_qty,uom,unit_cost,line_cost) values(job_id,recipe.product_id,output_item_id,recipe.product_code,recipe.product_name,planned_qty,planned_qty,output_uom,unit_cost,total_cost);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial production job created.',actor.id);
  return jsonb_build_object('id',job_id,'production_job_no',job_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.post_stock_transfer_atomic(p_transfer_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor_id uuid; row public.stock_transfers%rowtype; line record; balance numeric; posted_count integer:=0;
begin
 actor_id:=public.current_staff_id(); if actor_id is null or not public.has_permission('stock_transfer.post') then raise exception 'Missing permission: stock_transfer.post'; end if;
 select * into row from public.stock_transfers where id=p_transfer_id and deleted_at is null for update;
 if row.id is null or row.status<>'in_transit' then raise exception 'Only an in-transit stock transfer can be received.'; end if;
 if not public.can_access_inventory_branch((select company_id from public.branches where id=row.to_branch_id),row.to_branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
 for line in select * from public.stock_transfer_lines where stock_transfer_id=row.id order by id loop
  perform public.inventory_lock_item_branch(line.item_id,row.from_branch_id); perform public.inventory_lock_item_branch(line.item_id,row.to_branch_id);
  select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=line.item_id and branch_id=row.from_branch_id and status='posted';
  if balance<line.quantity and not public.current_staff_has_company_role(array['super_admin','owner']) then raise exception 'Insufficient stock for transfer line.'; end if;
  perform public.insert_inventory_movement('ST-'||row.transfer_no||'-out-'||left(line.id::text,8),row.document_id,row.from_branch_id,line.item_id,'transfer_out',row.transfer_date,0,line.quantity,0,actor_id,'Transferred from '||row.transfer_no,'stock_transfer',row.id);
  perform public.insert_inventory_movement('ST-'||row.transfer_no||'-in-'||left(line.id::text,8),row.document_id,row.to_branch_id,line.item_id,'transfer_in',row.transfer_date,line.quantity,0,0,actor_id,'Transferred to '||row.transfer_no,'stock_transfer',row.id); posted_count:=posted_count+1;
 end loop;
 if posted_count=0 then raise exception 'Cannot post without lines.'; end if;
 update public.stock_transfers set status='completed',posted_at=now(),updated_by=actor_id,updated_at=now() where id=row.id;
 if row.document_id is not null then update public.documents set status='posted',approval_status='approved',current_step='Posted to stock',posted_at=now(),updated_by=actor_id where id=row.document_id; end if;
 return jsonb_build_object('transfer_id',row.id,'lines',posted_count);
end $$;

create or replace function public.post_stock_wastage_atomic(p_wastage_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor_id uuid; row public.stock_wastage%rowtype; line record; balance numeric; posted_count integer:=0;
begin
 actor_id:=public.current_staff_id(); if actor_id is null or not public.has_permission('stock_wastage.post') then raise exception 'Missing permission: stock_wastage.post'; end if;
 select * into row from public.stock_wastage where id=p_wastage_id and deleted_at is null for update;
 if row.id is null or row.status not in ('draft','approved') then raise exception 'Only a draft or approved wastage can be posted.'; end if;
 if not public.can_access_inventory_branch((select company_id from public.branches where id=row.branch_id),row.branch_id) then raise exception 'You do not have access to this inventory branch.'; end if;
 for line in select * from public.stock_wastage_lines where stock_wastage_id=row.id order by id loop
  perform public.inventory_lock_item_branch(line.item_id,row.branch_id); select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=line.item_id and branch_id=row.branch_id and status='posted';
  if balance<line.quantity and not public.current_staff_has_company_role(array['super_admin','owner']) then raise exception 'Insufficient stock for wastage line.'; end if;
  perform public.insert_inventory_movement('SW-'||row.wastage_no||'-'||left(line.id::text,8),row.document_id,row.branch_id,line.item_id,'wastage',row.wastage_date,0,line.quantity,0,actor_id,coalesce(line.remarks,row.remarks,'Wastage '||row.wastage_no),'stock_wastage',row.id); posted_count:=posted_count+1;
 end loop;
 if posted_count=0 then raise exception 'Cannot post wastage without lines.'; end if;
 update public.stock_wastage set status='posted',posted_at=now(),updated_by=actor_id,updated_at=now() where id=row.id;
 if row.document_id is not null then update public.documents set status='posted',approval_status='approved',current_step='Posted to stock',posted_at=now(),updated_by=actor_id where id=row.document_id; end if;
 return jsonb_build_object('wastage_id',row.id,'lines',posted_count);
end $$;

create or replace function public.post_stock_count_atomic(p_stock_count_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; line public.stock_count_lines%rowtype; current_balance numeric; variance numeric;
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
 if actor.id is null or not public.has_permission('stock_count.post') then raise exception 'Missing permission: stock_count.post'; end if;
 select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null for update;
 if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Stock count is unavailable for this branch.'; end if;
 if count_row.status='posted' then return jsonb_build_object('id',count_row.id,'already_posted',true); end if; if count_row.status<>'approved' then raise exception 'Only approved stock counts can be posted.'; end if;
 for line in select * from public.stock_count_lines where stock_count_id=count_row.id order by id for update loop
  perform public.inventory_lock_item_branch(line.item_id,count_row.branch_id); select coalesce(sum(quantity_in-quantity_out),0) into current_balance from public.stock_transactions where item_id=line.item_id and branch_id=count_row.branch_id and status='posted'; variance:=line.physical_qty-current_balance;
  if variance<>0 then perform public.insert_inventory_movement('ST-'||count_row.count_no||'-'||left(line.id::text,4),count_row.document_id,count_row.branch_id,line.item_id,'stock_count_adjustment',count_row.count_date,greatest(variance,0),greatest(-variance,0),0,actor.id,'Adjusted after stock count '||count_row.count_no,'stock_count',count_row.id); end if;
 end loop;
 update public.stock_counts set status='posted',posted_at=now(),updated_by=actor.id where id=count_row.id and status='approved';
 if count_row.document_id is not null then update public.documents set status='posted',approval_status='approved',current_step='Variance posted to ledger',posted_at=now(),updated_by=actor.id where id=count_row.document_id; end if;
 return jsonb_build_object('id',count_row.id,'count_no',count_row.count_no,'document_id',count_row.document_id,'already_posted',false);
end $$;

create or replace function public.post_goods_receiving_atomic(p_goods_receiving_id uuid,p_do_exception_reason text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; grn public.goods_receivings%rowtype; line public.goods_receiving_lines%rowtype; po_line public.purchase_order_lines%rowtype; po_status public.purchase_order_status;
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1; if actor.id is null or not public.has_permission('grn.post') then raise exception 'Missing permission: grn.post'; end if;
 select * into grn from public.goods_receivings where id=p_goods_receiving_id and deleted_at is null for update; if grn.id is null or not public.can_access_inventory_branch(grn.company_id,grn.branch_id) then raise exception 'Goods receiving is unavailable for this branch.'; end if;
 if grn.status='posted' then return jsonb_build_object('id',grn.id,'already_posted',true); end if; if grn.status<>'draft' then raise exception 'Only draft GRN can be posted.'; end if;
 if grn.document_id is null or not exists(select 1 from public.attachments where entity_type='document' and entity_id=grn.document_id and status='active' and deleted_at is null) then if nullif(btrim(p_do_exception_reason),'') is null then raise exception 'Attach the Delivery Order or document an exception before posting this receiving.'; end if; end if;
 for line in select * from public.goods_receiving_lines where goods_receiving_id=grn.id order by id for update loop
  select * into po_line from public.purchase_order_lines where id=line.purchase_order_line_id and purchase_order_id=grn.purchase_order_id for update;
  if po_line.id is null or po_line.item_id<>line.item_id or line.received_qty+line.rejected_qty>greatest(po_line.qty_ordered-po_line.qty_received-po_line.qty_cancelled,0) then raise exception 'GRN contains an invalid or over-received purchase-order line.'; end if;
  if line.received_qty>0 then perform public.inventory_lock_item_branch(line.item_id,grn.branch_id); perform public.insert_inventory_movement('ST-'||grn.grn_no||'-'||left(line.id::text,4),grn.document_id,grn.branch_id,line.item_id,'purchase',grn.received_date,line.received_qty,0,line.unit_cost,actor.id,'Received from '||grn.grn_no,'goods_receiving',grn.id); update public.purchase_order_lines set qty_received=qty_received+line.received_qty where id=po_line.id; end if;
 end loop;
 select case when bool_and(qty_ordered-qty_received-qty_cancelled<=0) then 'received'::public.purchase_order_status else 'partial_received'::public.purchase_order_status end into po_status from public.purchase_order_lines where purchase_order_id=grn.purchase_order_id;
 update public.purchase_orders set status=po_status,updated_by=actor.id where id=grn.purchase_order_id; update public.goods_receivings set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=grn.id; if grn.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=grn.document_id; end if;
 return jsonb_build_object('id',grn.id,'grn_no',grn.grn_no,'purchase_order_id',grn.purchase_order_id,'document_id',grn.document_id,'already_posted',false);
end $$;

create or replace function public.post_purchase_return_atomic(p_purchase_return_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; ret public.purchase_returns%rowtype; line public.purchase_return_lines%rowtype; grn_line public.goods_receiving_lines%rowtype; movement_id uuid; balance numeric;
begin
 select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1; if actor.id is null or not public.has_permission('purchase_return.post') then raise exception 'Missing permission: purchase_return.post'; end if;
 select * into ret from public.purchase_returns where id=p_purchase_return_id and deleted_at is null for update; if ret.id is null or not public.can_access_inventory_branch(ret.company_id,ret.branch_id) then raise exception 'Purchase return is unavailable for this branch.'; end if;
 if ret.status='posted' then return jsonb_build_object('id',ret.id,'already_posted',true); end if; if ret.status<>'draft' then raise exception 'Only draft purchase returns can be posted.'; end if;
 for line in select * from public.purchase_return_lines where purchase_return_id=ret.id order by id for update loop
  select * into grn_line from public.goods_receiving_lines where id=line.goods_receiving_line_id and goods_receiving_id=ret.goods_receiving_id for update; if grn_line.id is null or line.return_qty<=0 or line.return_qty>grn_line.received_qty-grn_line.returned_qty then raise exception 'Purchase return line is invalid.'; end if;
  perform public.inventory_lock_item_branch(line.item_id,ret.branch_id); select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=line.item_id and branch_id=ret.branch_id and status='posted'; if balance<line.return_qty then raise exception 'Return would make current branch stock negative.'; end if;
  movement_id:=public.insert_inventory_movement('ST-'||ret.purchase_return_no||'-'||left(line.id::text,4),ret.document_id,ret.branch_id,line.item_id,'return_to_supplier',ret.return_date,0,line.return_qty,line.unit_cost,actor.id,'Returned to supplier from '||ret.purchase_return_no,'purchase_return',ret.id); update public.goods_receiving_lines set returned_qty=returned_qty+line.return_qty where id=grn_line.id; update public.purchase_return_lines set stock_transaction_id=movement_id where id=line.id;
 end loop;
 update public.purchase_returns set status='posted',posted_at=now(),posted_by=actor.id,updated_by=actor.id where id=ret.id; if ret.document_id is not null then update public.documents set status='posted',current_step='Posted to inventory',posted_at=now(),updated_by=actor.id where id=ret.document_id; end if;
 return jsonb_build_object('id',ret.id,'purchase_return_no',ret.purchase_return_no,'goods_receiving_id',ret.goods_receiving_id,'document_id',ret.document_id,'already_posted',false);
end $$;

create or replace function public.post_production_job_atomic(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor_id uuid; job public.production_jobs%rowtype; ingredient record; output_line record; qty numeric; balance numeric; output_id uuid; ingredient_count integer:=0;
begin
 actor_id:=public.current_staff_id(); if actor_id is null or not public.has_permission('production.post') then raise exception 'Missing permission: production.post'; end if;
 select * into job from public.production_jobs where id=p_job_id and deleted_at is null for update; if job.id is null or job.status<>'approved' or job.stock_transaction_id is not null or not public.can_access_inventory_branch(job.company_id,job.branch_id) then raise exception 'Only an approved, unposted production job in your branch can be posted.'; end if;
 for ingredient in select * from public.production_job_ingredient_lines where production_job_id=job.id order by id loop qty:=coalesce(ingredient.actual_qty,ingredient.required_qty); perform public.inventory_lock_item_branch(ingredient.item_id,job.branch_id); select coalesce(sum(quantity_in-quantity_out),0) into balance from public.stock_transactions where item_id=ingredient.item_id and branch_id=job.branch_id and status='posted'; if balance<qty and not public.has_permission('production.override_negative_stock') then raise exception 'Insufficient stock for production ingredient.'; end if; ingredient_count:=ingredient_count+1; end loop;
 if ingredient_count=0 then raise exception 'Production job has no ingredient lines.'; end if; select * into output_line from public.production_job_output_lines where production_job_id=job.id order by created_at,id limit 1;
 for ingredient in select * from public.production_job_ingredient_lines where production_job_id=job.id order by id loop qty:=coalesce(ingredient.actual_qty,ingredient.required_qty); perform public.insert_inventory_movement('PROD-'||job.production_job_no||'-USE-'||left(ingredient.id::text,8),job.document_id,job.branch_id,ingredient.item_id,'production_usage',job.production_date,0,qty,coalesce(ingredient.unit_cost,0),actor_id,'Consumed by '||job.production_job_no,'production_job',job.id); end loop;
 perform public.inventory_lock_item_branch(coalesce(output_line.item_id,job.output_item_id),job.branch_id); output_id:=public.insert_inventory_movement('PROD-'||job.production_job_no||'-OUT',job.document_id,job.branch_id,coalesce(output_line.item_id,job.output_item_id),'production_output',job.production_date,coalesce(output_line.actual_qty,output_line.planned_qty,job.planned_output_qty),0,coalesce(output_line.unit_cost,0),actor_id,'Produced by '||job.production_job_no,'production_job',job.id);
 update public.production_jobs set status='posted',actual_output_qty=coalesce(output_line.actual_qty,output_line.planned_qty,job.planned_output_qty),stock_transaction_id=output_id,posted_by=actor_id,posted_at=now(),updated_by=actor_id,updated_at=now() where id=job.id; if job.document_id is not null then update public.documents set status='posted',approval_status='approved',current_step='Posted to stock',posted_at=now(),updated_by=actor_id where id=job.document_id; end if;
 return jsonb_build_object('production_job_id',job.id,'output_transaction_id',output_id);
end $$;

revoke all on function public.post_opening_stock(text,uuid,uuid,date,numeric,numeric,text),public.post_opening_stock_batch(jsonb),public.post_manual_inventory_movement(text,uuid,uuid,public.stock_transaction_type,date,numeric,numeric,numeric,text),public.post_stock_transfer_atomic(uuid),public.post_stock_wastage_atomic(uuid),public.post_stock_count_atomic(uuid),public.post_goods_receiving_atomic(uuid,text),public.post_purchase_return_atomic(uuid),public.post_production_job_atomic(uuid) from public,anon;
grant execute on function public.post_opening_stock(text,uuid,uuid,date,numeric,numeric,text),public.post_opening_stock_batch(jsonb),public.post_manual_inventory_movement(text,uuid,uuid,public.stock_transaction_type,date,numeric,numeric,numeric,text),public.post_stock_transfer_atomic(uuid),public.post_stock_wastage_atomic(uuid),public.post_stock_count_atomic(uuid),public.post_goods_receiving_atomic(uuid,text),public.post_purchase_return_atomic(uuid),public.post_production_job_atomic(uuid) to authenticated;

-- No supplied policy, grant, trigger, backup, or reset contract may retain a
-- Location boundary after this migration.
delete from public.permissions where permission_code in ('locations.create','locations.update','locations.read');
