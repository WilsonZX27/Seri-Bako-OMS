-- Sprint 7.23.8.2: Transfer and wastage drafts are aggregate transactions.
alter table public.stock_transfers add column if not exists idempotency_key uuid;
alter table public.stock_wastage add column if not exists idempotency_key uuid;
create unique index if not exists stock_transfers_idempotency_key_idx on public.stock_transfers(company_id, idempotency_key) where idempotency_key is not null and deleted_at is null;
create unique index if not exists stock_wastage_idempotency_key_idx on public.stock_wastage(company_id, idempotency_key) where idempotency_key is not null and deleted_at is null;

create or replace function public.create_stock_transfer_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype; existing public.stock_transfers%rowtype; transfer_id uuid; document_id uuid;
  transfer_no text := nullif(trim(p_payload->>'transfer_no'), ''); from_branch_id uuid := nullif(p_payload->>'from_branch_id','')::uuid;
  to_branch_id uuid := nullif(p_payload->>'to_branch_id','')::uuid; from_location_id uuid := nullif(p_payload->>'from_location_id','')::uuid;
  to_location_id uuid := nullif(p_payload->>'to_location_id','')::uuid; idem uuid := nullif(p_payload->>'idempotency_key','')::uuid;
  lines jsonb := coalesce(p_payload->'lines','[]'::jsonb);
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_transfer.create') then raise exception 'Missing permission: stock_transfer.create'; end if;
  if transfer_no is null or jsonb_array_length(lines)=0 or from_branch_id is null or to_branch_id is null or from_location_id is null or to_location_id is null then raise exception 'Transfer number, branches, locations, and lines are required.'; end if;
  if from_branch_id=to_branch_id or from_location_id=to_location_id then raise exception 'Source and destination must be different.'; end if;
  if not exists (select 1 from public.branches where id=from_branch_id and company_id=actor.company_id and status='active' and deleted_at is null)
    or not exists (select 1 from public.branches where id=to_branch_id and company_id=actor.company_id and status='active' and deleted_at is null)
    or not exists (select 1 from public.locations where id=from_location_id and branch_id=from_branch_id and company_id=actor.company_id and status='active' and deleted_at is null)
    or not exists (select 1 from public.locations where id=to_location_id and branch_id=to_branch_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'Transfer branch or location is outside your active company scope.'; end if;
  if exists (select 1 from jsonb_to_recordset(lines) as x(item_id text, quantity text, uom text, remarks text) left join public.items i on i.id=x.item_id::uuid where i.id is null or i.company_id<>actor.company_id or i.status<>'active' or i.deleted_at is not null or coalesce(x.quantity::numeric,0)<=0 or nullif(trim(x.uom),'') is null) then raise exception 'Every transfer line must use an active company item, positive quantity, and UOM.'; end if;
  select * into existing from public.stock_transfers where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'transfer_no',existing.transfer_no,'document_id',existing.document_id,'idempotent',true); end if;
  transfer_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(document_id,actor.company_id,transfer_no,'stock_transfer','Stock Transfer '||transfer_no,'draft','draft','Draft','stock_transfer',transfer_id,actor.id,actor.id);
  insert into public.stock_transfers(id,company_id,document_id,transfer_no,transfer_date,from_branch_id,from_location_id,to_branch_id,to_location_id,status,remarks,created_by,updated_by,idempotency_key)
  values(transfer_id,actor.company_id,document_id,transfer_no,coalesce(nullif(p_payload->>'transfer_date','')::date,current_date),from_branch_id,from_location_id,to_branch_id,to_location_id,'draft',nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.stock_transfer_lines(stock_transfer_id,item_id,quantity,uom,remarks)
  select transfer_id,x.item_id::uuid,x.quantity::numeric,x.uom,nullif(trim(x.remarks),'') from jsonb_to_recordset(lines) as x(item_id text, quantity text, uom text, remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial stock transfer created.',actor.id);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(actor.company_id,'document',document_id,'created','Stock transfer '||transfer_no||' created',jsonb_build_object('transfer_id',transfer_id),actor.id);
  return jsonb_build_object('id',transfer_id,'transfer_no',transfer_no,'document_id',document_id,'idempotent',false);
end $$;

create or replace function public.create_stock_wastage_atomic(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  actor public.staffs%rowtype; existing public.stock_wastage%rowtype; wastage_id uuid; document_id uuid;
  wastage_no text := nullif(trim(p_payload->>'wastage_no'), ''); branch_id uuid := nullif(p_payload->>'branch_id','')::uuid;
  location_id uuid := nullif(p_payload->>'location_id','')::uuid; idem uuid := nullif(p_payload->>'idempotency_key','')::uuid;
  lines jsonb := coalesce(p_payload->'lines','[]'::jsonb); main_reason public.stock_wastage_reason := nullif(p_payload->>'reason','')::public.stock_wastage_reason;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_permission('stock_wastage.create') then raise exception 'Missing permission: stock_wastage.create'; end if;
  if wastage_no is null or jsonb_array_length(lines)=0 or branch_id is null or location_id is null or main_reason is null then raise exception 'Wastage number, branch, location, reason, and lines are required.'; end if;
  if not exists (select 1 from public.branches where id=branch_id and company_id=actor.company_id and status='active' and deleted_at is null)
    or not exists (select 1 from public.locations where id=location_id and branch_id=branch_id and company_id=actor.company_id and status='active' and deleted_at is null) then raise exception 'Wastage branch or location is outside your active company scope.'; end if;
  if exists (select 1 from jsonb_to_recordset(lines) as x(item_id text, quantity text, uom text, reason text, batch_no text, expiry_date text, remarks text) left join public.items i on i.id=x.item_id::uuid where i.id is null or i.company_id<>actor.company_id or i.status<>'active' or i.deleted_at is not null or coalesce(x.quantity::numeric,0)<=0 or nullif(trim(x.uom),'') is null or nullif(trim(x.reason),'') is null) then raise exception 'Every wastage line must use an active company item, positive quantity, UOM, and reason.'; end if;
  select * into existing from public.stock_wastage where company_id=actor.company_id and idempotency_key=idem and idem is not null and deleted_at is null for update;
  if existing.id is not null then return jsonb_build_object('id',existing.id,'wastage_no',existing.wastage_no,'document_id',existing.document_id,'idempotent',true); end if;
  wastage_id:=gen_random_uuid(); document_id:=gen_random_uuid();
  insert into public.documents(id,company_id,document_no,document_type,title,status,approval_status,current_step,related_entity_type,related_entity_id,created_by,updated_by)
  values(document_id,actor.company_id,wastage_no,'stock_wastage','Stock Wastage '||wastage_no,'draft','draft','Draft','stock_wastage',wastage_id,actor.id,actor.id);
  insert into public.stock_wastage(id,company_id,document_id,wastage_no,wastage_date,branch_id,location_id,reason,status,remarks,created_by,updated_by,idempotency_key)
  values(wastage_id,actor.company_id,document_id,wastage_no,coalesce(nullif(p_payload->>'wastage_date','')::date,current_date),branch_id,location_id,main_reason,'draft',nullif(trim(p_payload->>'remarks'),''),actor.id,actor.id,idem);
  insert into public.stock_wastage_lines(stock_wastage_id,item_id,quantity,uom,reason,batch_no,expiry_date,remarks)
  select wastage_id,x.item_id::uuid,x.quantity::numeric,x.uom,x.reason::public.stock_wastage_reason,nullif(trim(x.batch_no),''),nullif(trim(x.expiry_date),'')::date,nullif(trim(x.remarks),'') from jsonb_to_recordset(lines) as x(item_id text, quantity text, uom text, reason text, batch_no text, expiry_date text, remarks text);
  insert into public.document_revisions(document_id,revision_no,change_summary,changed_by) values(document_id,1,'Initial stock wastage created.',actor.id);
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(actor.company_id,'document',document_id,'created','Stock wastage '||wastage_no||' created',jsonb_build_object('wastage_id',wastage_id),actor.id);
  return jsonb_build_object('id',wastage_id,'wastage_no',wastage_no,'document_id',document_id,'idempotent',false);
end $$;

revoke all on function public.create_stock_transfer_atomic(jsonb), public.create_stock_wastage_atomic(jsonb) from public, anon;
grant execute on function public.create_stock_transfer_atomic(jsonb), public.create_stock_wastage_atomic(jsonb) to authenticated;
