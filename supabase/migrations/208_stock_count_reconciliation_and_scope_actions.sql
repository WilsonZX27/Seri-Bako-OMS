-- Kitchen-owned Stock Count scope maintenance and non-blocking posting-time reconciliation.

alter table public.branch_stock_count_items
  add column if not exists branch_note text,
  add column if not exists last_action text,
  add column if not exists last_action_stock_count_id uuid references public.stock_counts(id),
  add column if not exists last_action_at timestamptz,
  add column if not exists last_action_by uuid references public.staffs(id);

-- A newly-added line must remain visibly uncounted. Zero is a valid physical
-- fact, so it cannot safely double as an empty-value sentinel.
alter table public.stock_count_lines alter column physical_qty drop not null;

create table if not exists public.stock_count_reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  stock_count_line_id uuid not null references public.stock_count_lines(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  item_id uuid not null references public.items(id),
  snapshot_balance numeric(14,4) not null,
  posting_balance numeric(14,4) not null,
  movement_qty numeric(14,4) not null,
  physical_qty numeric(14,4) not null,
  final_variance_qty numeric(14,4) not null,
  reconciled_by uuid not null references public.staffs(id),
  reconciled_at timestamptz not null default now(),
  unique(stock_count_id,item_id)
);
alter table public.stock_count_reconciliations enable row level security;
create policy "stock count reconciliation scoped read" on public.stock_count_reconciliations
  for select to authenticated using (
    company_id=public.current_staff_company_id()
    and public.can_access_inventory_branch(company_id,branch_id)
  );
revoke all on public.stock_count_reconciliations from public,anon;
grant select on public.stock_count_reconciliations to authenticated;

create table if not exists public.item_correction_suggestions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  branch_id uuid not null references public.branches(id), item_id uuid not null references public.items(id),
  stock_count_id uuid references public.stock_counts(id), suggestion text not null check(length(trim(suggestion)) between 3 and 1000),
  status text not null default 'open' check(status in ('open','resolved','dismissed')),
  suggested_by uuid not null references public.staffs(id), created_at timestamptz not null default now(), resolved_at timestamptz
);
alter table public.item_correction_suggestions enable row level security;
create policy "item correction suggestions scoped read" on public.item_correction_suggestions for select to authenticated using(company_id=public.current_staff_company_id() and public.can_access_inventory_branch(company_id,branch_id));
revoke all on public.item_correction_suggestions from public,anon;
grant select on public.item_correction_suggestions to authenticated;

create or replace function public.notify_stock_count_scope_change(
  p_company_id uuid,p_branch_id uuid,p_item_id uuid,p_stock_count_id uuid,
  p_actor_id uuid,p_title text,p_message text
) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare role_row record;
begin
  for role_row in select id from public.roles where company_id=p_company_id and role_code in ('super_admin','purchasing','finance') and status='active' and deleted_at is null loop
    insert into public.notifications(company_id,actor_user_id,recipient_role_id,branch_id,title,message,priority,action_url,entity_type,entity_id)
    values(p_company_id,auth.uid(),role_row.id,p_branch_id,p_title,p_message,'normal','/stock-counts/'||p_stock_count_id,'stock_count',p_stock_count_id);
  end loop;
end $$;

create or replace function public.add_item_to_stock_count(
  p_stock_count_id uuid,p_item_id uuid,p_reason text,p_idempotency_key uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; item_row public.items%rowtype; line_id uuid; scope_id uuid; balance numeric; next_position integer;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['stock_count.create','stock_count.update']) then raise exception 'Missing permission: stock_count.update'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Explain why this item is being added.'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null for update;
  if count_row.id is null or count_row.status<>'draft' or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Only an accessible draft Stock Count can add an item.'; end if;
  select * into item_row from public.items where id=p_item_id and company_id=count_row.company_id and status='active' and deleted_at is null;
  if item_row.id is null then raise exception 'Select an active Item Master record from this company.'; end if;
  select id into line_id from public.stock_count_lines where stock_count_id=count_row.id and item_id=item_row.id;
  if line_id is not null then return jsonb_build_object('line_id',line_id,'already_present',true); end if;
  perform public.inventory_lock_item_branch(item_row.id,count_row.branch_id);
  balance:=public.inventory_item_branch_balance(item_row.id,count_row.branch_id);
  select coalesce(max(line_position),0)+1 into next_position from public.stock_count_lines where stock_count_id=count_row.id;
  insert into public.stock_count_lines(stock_count_id,item_id,theoretical_qty,physical_qty,uom,line_position,remarks)
  values(count_row.id,item_row.id,balance,null,item_row.base_unit,next_position,'Added during count: '||trim(p_reason)) returning id into line_id;
  insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,branch_note,last_action,last_action_stock_count_id,last_action_at,last_action_by,created_by,updated_by)
  values(count_row.company_id,count_row.branch_id,item_row.id,'active',trim(p_reason),'added',count_row.id,now(),actor.id,actor.id,actor.id)
  on conflict(branch_id,item_id) do update set status='active',branch_note=excluded.branch_note,retirement_reason=null,retirement_note=null,pending_stock_count_id=null,last_action='added',last_action_stock_count_id=count_row.id,last_action_at=now(),last_action_by=actor.id,restored_by=case when branch_stock_count_items.status='retired' then actor.id else branch_stock_count_items.restored_by end,restored_at=case when branch_stock_count_items.status='retired' then now() else branch_stock_count_items.restored_at end,updated_by=actor.id,updated_at=now() returning id into scope_id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(count_row.company_id,'stock_count',count_row.id,'line_added','Item added to current and future branch Stock Counts',jsonb_build_object('line_id',line_id,'item_id',item_row.id,'branch_id',count_row.branch_id,'starting_balance',balance,'reason',trim(p_reason),'idempotency_key',p_idempotency_key,'business_data_changed',false),actor.id);
  perform public.notify_stock_count_scope_change(count_row.company_id,count_row.branch_id,item_row.id,count_row.id,actor.id,'Stock Count item added',item_row.item_code||' · '||item_row.item_name||' added to the current and future branch counts. Reason: '||trim(p_reason));
  return jsonb_build_object('line_id',line_id,'scope_id',scope_id,'already_present',false);
end $$;

create or replace function public.update_branch_stock_count_item(
  p_stock_count_id uuid,p_item_id uuid,p_included boolean,p_note text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; item_row public.items%rowtype; target_status text;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['stock_count.create','stock_count.update']) then raise exception 'Missing permission: stock_count.update'; end if;
  if length(trim(coalesce(p_note,'')))<3 then raise exception 'A branch setting reason is required.'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null for update;
  if count_row.id is null or count_row.status<>'draft' or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Only an accessible draft Stock Count can update branch settings.'; end if;
  select * into item_row from public.items where id=p_item_id and company_id=count_row.company_id and deleted_at is null;
  if item_row.id is null then raise exception 'Item is unavailable.'; end if;
  target_status:=case when p_included then 'active' else 'retired' end;
  insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,branch_note,last_action,last_action_stock_count_id,last_action_at,last_action_by,created_by,updated_by,retired_by,retired_at,retirement_reason,retirement_note)
  values(count_row.company_id,count_row.branch_id,item_row.id,target_status,trim(p_note),'branch_setting',count_row.id,now(),actor.id,actor.id,actor.id,case when p_included then null else actor.id end,case when p_included then null else now() end,case when p_included then null else 'other' end,case when p_included then null else trim(p_note) end)
  on conflict(branch_id,item_id) do update set status=target_status,branch_note=trim(p_note),last_action='branch_setting',last_action_stock_count_id=count_row.id,last_action_at=now(),last_action_by=actor.id,updated_by=actor.id,updated_at=now(),retired_by=case when p_included then null else actor.id end,retired_at=case when p_included then null else now() end,retirement_reason=case when p_included then null else 'other' end,retirement_note=case when p_included then null else trim(p_note) end;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
  values(count_row.company_id,'item',item_row.id,'branch_stock_count_setting_updated','Branch Stock Count inclusion updated',jsonb_build_object('branch_id',count_row.branch_id,'stock_count_id',count_row.id,'included',p_included,'reason',trim(p_note),'business_data_changed',false),actor.id);
  perform public.notify_stock_count_scope_change(count_row.company_id,count_row.branch_id,item_row.id,count_row.id,actor.id,'Branch Stock Count setting changed',item_row.item_code||' · '||item_row.item_name||case when p_included then ' included in' else ' retired from' end||' future branch counts. Reason: '||trim(p_note));
  return jsonb_build_object('item_id',item_row.id,'status',target_status);
end $$;

create or replace function public.suggest_stock_count_item_correction(p_stock_count_id uuid,p_item_id uuid,p_suggestion text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; item_row public.items%rowtype; suggestion_id uuid;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['stock_count.create','stock_count.update']) then raise exception 'Missing permission: stock_count.update'; end if;
  if length(trim(coalesce(p_suggestion,'')))<3 then raise exception 'Describe the Item Master correction.'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null;
  if count_row.id is null or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Stock Count is unavailable.'; end if;
  select * into item_row from public.items where id=p_item_id and company_id=count_row.company_id and deleted_at is null;
  if item_row.id is null then raise exception 'Item is unavailable.'; end if;
  insert into public.item_correction_suggestions(company_id,branch_id,item_id,stock_count_id,suggestion,suggested_by) values(count_row.company_id,count_row.branch_id,item_row.id,count_row.id,trim(p_suggestion),actor.id) returning id into suggestion_id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(count_row.company_id,'item',item_row.id,'item_correction_suggested','Kitchen suggested an Item Master correction',jsonb_build_object('stock_count_id',count_row.id,'branch_id',count_row.branch_id,'suggestion_id',suggestion_id,'suggestion',trim(p_suggestion),'business_data_changed',false),actor.id);
  perform public.notify_stock_count_scope_change(count_row.company_id,count_row.branch_id,item_row.id,count_row.id,actor.id,'Item correction suggested',item_row.item_code||' · '||item_row.item_name||': '||trim(p_suggestion));
  return jsonb_build_object('id',suggestion_id,'status','open');
end $$;

revoke all on function public.add_item_to_stock_count(uuid,uuid,text,uuid),public.update_branch_stock_count_item(uuid,uuid,boolean,text),public.suggest_stock_count_item_correction(uuid,uuid,text) from public,anon;
grant execute on function public.add_item_to_stock_count(uuid,uuid,text,uuid),public.update_branch_stock_count_item(uuid,uuid,boolean,text),public.suggest_stock_count_item_correction(uuid,uuid,text) to authenticated;
revoke all on function public.notify_stock_count_scope_change(uuid,uuid,uuid,uuid,uuid,text,text) from public,anon,authenticated;

-- Canonical supplier guard: the first resolved line establishes the PR supplier;
-- every later insert/update must match it. Historical mixed PRs remain visible
-- for the existing guided split repair, but cannot gain more mixed lines.
create or replace function public.guard_purchase_request_line_supplier()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare canonical uuid;
begin
  if new.suggested_supplier_id is null then raise exception 'Choose the PR supplier before adding request items.'; end if;
  select assigned_supplier_id into canonical from public.purchase_requests where id=new.purchase_request_id for update;
  if canonical is null then
    update public.purchase_requests set assigned_supplier_id=new.suggested_supplier_id,updated_at=now() where id=new.purchase_request_id;
  elsif canonical<>new.suggested_supplier_id then
    raise exception 'This PR already belongs to another supplier. Remove its lines before changing supplier.';
  end if;
  return new;
end $$;
drop trigger if exists enforce_purchase_request_line_supplier on public.purchase_request_lines;
create trigger enforce_purchase_request_line_supplier before insert or update of suggested_supplier_id,purchase_request_id on public.purchase_request_lines for each row execute function public.guard_purchase_request_line_supplier();

-- Replacement keeps the original before-snapshot in document_line_revisions,
-- but never carries its physical quantity into the new Item identity.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.revise_stock_count_line(uuid,uuid,text,uuid,numeric,text,text,uuid)'::regprocedure) into definition;
  definition := replace(definition,
$old$  if revision_action <> 'remove' then
    if replacement_item_id is null or replacement_physical_qty is null or replacement_physical_qty < 0 or nullif(trim(replacement_uom),'') is null then
      raise exception 'Item, non-negative physical quantity, and UOM are required.';
    end if;$old$,
$new$  if revision_action <> 'remove' then
    if replacement_item_id is null or nullif(trim(replacement_uom),'') is null
      or (revision_action <> 'replace' and (replacement_physical_qty is null or replacement_physical_qty < 0))
      or (revision_action = 'replace' and replacement_physical_qty is not null) then
      raise exception 'Choose an Item and UOM. Replacement quantity must remain blank until physically counted.';
    end if;$new$);
  execute definition;
end $$;

-- Keep the mature posting routine and replace only its blocking snapshot check.
-- The item/branch advisory lock is already held when this block runs, so the
-- posting balance, reconciliation evidence, and adjustment stay atomic.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.post_stock_count_atomic(uuid)'::regprocedure) into definition;
  if definition is null then raise exception 'post_stock_count_atomic(uuid) is unavailable'; end if;
  definition := replace(definition,
$old$    if current_balance is distinct from line.theoretical_qty then
      raise exception 'STOCK_SNAPSHOT_CONFLICT|%|%|%|%',
        item_row.item_code, item_row.item_name, line.theoretical_qty, current_balance;
    end if;$old$,
$new$    if current_balance is distinct from line.theoretical_qty then
      insert into public.stock_count_reconciliations(
        company_id,stock_count_id,stock_count_line_id,branch_id,item_id,
        snapshot_balance,posting_balance,movement_qty,physical_qty,final_variance_qty,reconciled_by
      ) values(
        count_row.company_id,count_row.id,line.id,count_row.branch_id,line.item_id,
        line.theoretical_qty,current_balance,current_balance-line.theoretical_qty,
        line.physical_qty,line.physical_qty-current_balance,actor.id
      ) on conflict(stock_count_id,item_id) do update set
        posting_balance=excluded.posting_balance,movement_qty=excluded.movement_qty,
        physical_qty=excluded.physical_qty,final_variance_qty=excluded.final_variance_qty,
        reconciled_by=excluded.reconciled_by,reconciled_at=now();
      update public.stock_count_lines set
        theoretical_qty=current_balance,
        remarks=concat_ws(E'\n',nullif(trim(remarks),''),'Inventory changed during count; reconciled automatically at posting.')
      where id=line.id;
    end if;$new$);
  definition := replace(definition,
    'or line.theoretical_qty < 0 or line.physical_qty < 0',
    'or line.theoretical_qty < 0 or line.physical_qty is null or line.physical_qty < 0');
  definition := replace(definition,
    'variance := line.physical_qty - line.theoretical_qty;',
    'variance := line.physical_qty - current_balance;');
  execute definition;
end $$;
