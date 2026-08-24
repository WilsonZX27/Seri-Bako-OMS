-- Branch-owned Stock Count eligibility and auditable item retirement.

create table public.branch_stock_count_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid not null references public.branches(id),
  item_id uuid not null references public.items(id),
  status text not null default 'active' check (status in ('active','pending_retirement','retired')),
  retirement_reason text check (retirement_reason is null or retirement_reason in ('used_up','wrong_or_duplicate_code','branch_no_longer_uses','other')),
  retirement_note text,
  last_physical_qty numeric(14,4),
  pending_stock_count_id uuid references public.stock_counts(id),
  retired_stock_count_id uuid references public.stock_counts(id),
  retired_by uuid references public.staffs(id),
  retired_at timestamptz,
  restored_by uuid references public.staffs(id),
  restored_at timestamptz,
  created_by uuid references public.staffs(id),
  updated_by uuid references public.staffs(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, item_id)
);

create index branch_stock_count_items_company_branch_status_idx
  on public.branch_stock_count_items(company_id, branch_id, status);
create index branch_stock_count_items_item_idx
  on public.branch_stock_count_items(company_id, item_id, created_at desc);

alter table public.branch_stock_count_items enable row level security;
create policy "branch stock count item scoped read" on public.branch_stock_count_items
  for select to authenticated using (
    company_id = public.current_staff_company_id()
    and public.can_access_inventory_branch(company_id, branch_id)
    and public.has_any_permission(array['stock_count.create','stock_count.update','stock_count.post','items.read'])
  );
revoke all on public.branch_stock_count_items from public, anon;
grant select on public.branch_stock_count_items to authenticated;

-- Existing branch sourcing activates a new item once, but never silently
-- reactivates an item that Kitchen deliberately retired.
create or replace function public.ensure_branch_stock_count_item_from_mapping()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare item_company uuid;
begin
  if new.status <> 'active' or new.deleted_at is not null then return new; end if;
  select company_id into item_company from public.items where id=new.item_id and status='active' and deleted_at is null;
  if item_company is null then return new; end if;
  insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,created_by,updated_by)
  values(item_company,new.branch_id,new.item_id,'active',coalesce(new.created_by,new.updated_by),coalesce(new.updated_by,new.created_by))
  on conflict(branch_id,item_id) do nothing;
  return new;
end $$;
drop trigger if exists branch_supplier_item_stock_count_scope on public.branch_supplier_items;
create trigger branch_supplier_item_stock_count_scope
after insert or update of status,deleted_at,item_id,branch_id on public.branch_supplier_items
for each row execute function public.ensure_branch_stock_count_item_from_mapping();

insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,created_by,updated_by)
select distinct i.company_id,bsi.branch_id,bsi.item_id,'active',bsi.created_by,bsi.updated_by
from public.branch_supplier_items bsi
join public.items i on i.id=bsi.item_id and i.status='active' and i.deleted_at is null
where bsi.status='active' and bsi.deleted_at is null
on conflict(branch_id,item_id) do nothing;

-- Correct, non-fuzzy PJS reconciliation. Missing canonical rows are left
-- untouched and therefore visible as a deployment/UAT blocker.
insert into public.branch_stock_count_items(company_id,branch_id,item_id,status)
select i.company_id,b.id,i.id,'active'
from public.items i
join public.branches b on b.company_id=i.company_id
where upper(trim(i.item_code)) in ('OIYIN00012','OIYIN00006')
  and upper(trim(i.item_name)) in ('DRIED SUGAR CANE','NANXIN')
  and upper(trim(b.branch_code)) in ('PJS','PJS10')
  and i.status='active' and i.deleted_at is null
  and b.status='active' and b.deleted_at is null
on conflict(branch_id,item_id) do update set status='active',updated_at=now();

create or replace view public.stock_count_eligible_items
with (security_invoker=true) as
select s.*
from public.stock_balances_summary s
join public.items i on i.id=s.item_id and i.status='active' and i.deleted_at is null
left join public.branch_stock_count_items scope on scope.branch_id=s.branch_id and scope.item_id=s.item_id
where scope.status is distinct from 'retired'
union all
select
  i.id,b.id,i.company_id,i.item_code,i.autocount_code,i.item_name,b.branch_name,
  coalesce(i.category,''),coalesce(i.purchase_unit,i.base_unit),i.base_unit,
  coalesce(i.conversion_to_base_unit,1),i.supplier_id,supplier.name,
  coalesce(i.cost,0),coalesce(i.safety_stock,0),coalesce(i.lead_time_days,0),coalesce(i.moq,0),
  i.status,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,0::numeric,null::date,
  coalesce(i.safety_stock,0)>0,greatest(coalesce(i.safety_stock,0),0),scope.updated_at
from public.branch_stock_count_items scope
join public.items i on i.id=scope.item_id and i.company_id=scope.company_id and i.status='active' and i.deleted_at is null
join public.branches b on b.id=scope.branch_id and b.company_id=scope.company_id and b.status='active' and b.deleted_at is null
left join public.suppliers supplier on supplier.id=i.supplier_id
where scope.status in ('active','pending_retirement')
  and not exists(select 1 from public.stock_balances_summary existing where existing.branch_id=scope.branch_id and existing.item_id=scope.item_id);
revoke all on public.stock_count_eligible_items from public,anon;
grant select on public.stock_count_eligible_items to authenticated;

-- Preserve the mature atomic creation function while replacing only its
-- eligible read source. This keeps all existing validation and idempotency.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.create_stock_count_atomic(jsonb)'::regprocedure) into definition;
  if definition is null then raise exception 'create_stock_count_atomic(jsonb) is unavailable'; end if;
  definition := replace(definition,'public.stock_balances_view','public.stock_count_eligible_items');
  execute definition;
end $$;

create table public.stock_count_item_retirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  stock_count_line_id uuid not null references public.stock_count_lines(id) on delete cascade,
  branch_id uuid not null references public.branches(id),
  item_id uuid not null references public.items(id),
  reason text not null check (reason in ('used_up','wrong_or_duplicate_code','branch_no_longer_uses','other')),
  note text not null check (length(trim(note)) between 3 and 1000),
  actual_qty numeric(14,4) not null check (actual_qty>=0 and actual_qty<=1000000),
  status text not null default 'pending' check(status in ('pending','applied','cancelled')),
  requested_by uuid not null references public.staffs(id),
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(stock_count_id,item_id)
);
alter table public.stock_count_item_retirements enable row level security;
create policy "stock count retirement scoped read" on public.stock_count_item_retirements
  for select to authenticated using(company_id=public.current_staff_company_id() and public.can_access_inventory_branch(company_id,branch_id));
revoke all on public.stock_count_item_retirements from public,anon;
grant select on public.stock_count_item_retirements to authenticated;

create or replace function public.sync_stock_count_item_retirements(p_stock_count_id uuid,p_retirements jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; count_row public.stock_counts%rowtype; entry record; kept uuid[]:=array[]::uuid[];
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['stock_count.create','stock_count.update']) then raise exception 'Missing permission: stock_count.update'; end if;
  select * into count_row from public.stock_counts where id=p_stock_count_id and deleted_at is null for update;
  if count_row.id is null or count_row.status<>'draft' or not public.can_access_inventory_branch(count_row.company_id,count_row.branch_id) then raise exception 'Only an accessible draft Stock Count can schedule item retirement.'; end if;
  for entry in select * from jsonb_to_recordset(coalesce(p_retirements,'[]'::jsonb)) as x(line_id uuid,item_id uuid,reason text,note text,actual_qty numeric) loop
    if entry.reason not in ('used_up','wrong_or_duplicate_code','branch_no_longer_uses','other') or length(trim(coalesce(entry.note,'')))<3 or entry.actual_qty<0 or entry.actual_qty>1000000 then raise exception 'Retirement reason, note, and actual stock are required.'; end if;
    if not exists(select 1 from public.stock_count_lines l where l.id=entry.line_id and l.stock_count_id=count_row.id and l.item_id=entry.item_id) then raise exception 'Retirement line is outside this Stock Count.'; end if;
    insert into public.stock_count_item_retirements(company_id,stock_count_id,stock_count_line_id,branch_id,item_id,reason,note,actual_qty,status,requested_by)
    values(count_row.company_id,count_row.id,entry.line_id,count_row.branch_id,entry.item_id,entry.reason,trim(entry.note),entry.actual_qty,'pending',actor.id)
    on conflict(stock_count_id,item_id) do update set stock_count_line_id=excluded.stock_count_line_id,reason=excluded.reason,note=excluded.note,actual_qty=excluded.actual_qty,status='pending',requested_by=actor.id,updated_at=now();
    kept:=array_append(kept,entry.item_id);
  end loop;
  update public.stock_count_item_retirements set status='cancelled',updated_at=now()
  where stock_count_id=count_row.id and status='pending' and not(item_id=any(kept));
  return jsonb_build_object('stock_count_id',count_row.id,'pending_count',coalesce(array_length(kept,1),0));
end $$;

create or replace function public.apply_posted_stock_count_item_retirements()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare retirement record; item_row public.items%rowtype; branch_row public.branches%rowtype; role_row record;
begin
  if new.status<>'posted' or old.status='posted' then return new; end if;
  select * into branch_row from public.branches where id=new.branch_id;
  for retirement in select * from public.stock_count_item_retirements where stock_count_id=new.id and status='pending' for update loop
    select * into item_row from public.items where id=retirement.item_id;
    insert into public.branch_stock_count_items(company_id,branch_id,item_id,status,retirement_reason,retirement_note,last_physical_qty,pending_stock_count_id,retired_stock_count_id,retired_by,retired_at,created_by,updated_by)
    values(new.company_id,new.branch_id,retirement.item_id,'retired',retirement.reason,retirement.note,retirement.actual_qty,null,new.id,retirement.requested_by,now(),retirement.requested_by,retirement.requested_by)
    on conflict(branch_id,item_id) do update set status='retired',retirement_reason=excluded.retirement_reason,retirement_note=excluded.retirement_note,last_physical_qty=excluded.last_physical_qty,pending_stock_count_id=null,retired_stock_count_id=new.id,retired_by=excluded.retired_by,retired_at=now(),updated_by=excluded.updated_by,updated_at=now();
    update public.stock_count_item_retirements set status='applied',applied_at=now(),updated_at=now() where id=retirement.id;
    insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by)
    values(new.company_id,'item',retirement.item_id,'branch_stock_count_retired','Item retired from branch Stock Count after final posted count',jsonb_build_object('branch_id',new.branch_id,'stock_count_id',new.id,'reason',retirement.reason,'note',retirement.note,'last_physical_qty',retirement.actual_qty),retirement.requested_by);
    for role_row in select id from public.roles where company_id=new.company_id and role_code in ('purchasing','finance') and status='active' and deleted_at is null loop
      insert into public.notifications(company_id,actor_user_id,recipient_role_id,branch_id,title,message,priority,action_url,entity_type,entity_id)
      values(new.company_id,auth.uid(),role_row.id,new.branch_id,'Stock Count item retired',coalesce(item_row.item_code,'Item')||' · '||coalesce(item_row.item_name,'Unknown')||' retired from '||coalesce(branch_row.branch_name,'branch')||'. Final stock: '||retirement.actual_qty||' '||coalesce(item_row.base_unit,'')||'. Reason: '||retirement.note,'high','/items/'||retirement.item_id,'item',retirement.item_id);
    end loop;
  end loop;
  return new;
end $$;
drop trigger if exists apply_stock_count_item_retirements_after_post on public.stock_counts;
create trigger apply_stock_count_item_retirements_after_post after update of status on public.stock_counts
for each row execute function public.apply_posted_stock_count_item_retirements();

create or replace function public.restore_branch_stock_count_item(p_scope_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare actor public.staffs%rowtype; scope public.branch_stock_count_items%rowtype;
begin
  select * into actor from public.staffs where auth_user_id=auth.uid() and status='active' and deleted_at is null limit 1;
  if actor.id is null or not public.has_any_permission(array['stock_count.create','stock_count.update','items.update']) then raise exception 'You do not have permission to restore this branch item.'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'A restore reason is required.'; end if;
  select * into scope from public.branch_stock_count_items where id=p_scope_id for update;
  if scope.id is null or scope.company_id<>actor.company_id or not public.can_access_inventory_branch(scope.company_id,scope.branch_id) then raise exception 'Branch item is unavailable.'; end if;
  update public.branch_stock_count_items set status='active',retirement_reason=null,retirement_note=null,pending_stock_count_id=null,restored_by=actor.id,restored_at=now(),updated_by=actor.id,updated_at=now() where id=scope.id;
  insert into public.activity_logs(company_id,entity_type,entity_id,activity_type,message,metadata,created_by) values(scope.company_id,'item',scope.item_id,'branch_stock_count_restored','Item restored to branch Stock Count',jsonb_build_object('branch_id',scope.branch_id,'reason',trim(p_reason)),actor.id);
  return jsonb_build_object('id',scope.id,'status','active');
end $$;

revoke all on function public.sync_stock_count_item_retirements(uuid,jsonb),public.restore_branch_stock_count_item(uuid,text) from public,anon;
grant execute on function public.sync_stock_count_item_retirements(uuid,jsonb),public.restore_branch_stock_count_item(uuid,text) to authenticated;
revoke all on function public.ensure_branch_stock_count_item_from_mapping(),public.apply_posted_stock_count_item_retirements() from public,anon,authenticated;
