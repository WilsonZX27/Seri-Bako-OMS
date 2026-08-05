-- Inventory performance foundation.
-- Keep the posted ledger as the source of truth, but maintain a small
-- branch/item read model for dashboards and inventory landing pages.

create table if not exists public.stock_balances_summary (
  item_id uuid not null references public.items(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  item_code text not null,
  autocount_code text,
  item_name text not null,
  branch_name text not null,
  category text not null default '',
  purchase_unit text not null default '',
  base_unit text not null default '',
  conversion_to_base_unit numeric(14,4) not null default 1,
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text,
  cost numeric(14,4) not null default 0,
  safety_stock numeric(14,4) not null default 0,
  lead_time_days integer not null default 0,
  moq numeric(14,4) not null default 0,
  status public.item_status not null default 'active',
  total_quantity_in numeric(14,4) not null default 0,
  total_quantity_out numeric(14,4) not null default 0,
  current_stock numeric(14,4) not null default 0,
  current_qty numeric(14,4) not null default 0,
  average_cost numeric(14,4) not null default 0,
  inventory_value numeric(14,4) not null default 0,
  last_movement date,
  is_low_stock boolean not null default false,
  shortage_quantity numeric(14,4) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (item_id, branch_id)
);

create index if not exists stock_balances_summary_branch_idx
  on public.stock_balances_summary(company_id, branch_id);
create index if not exists stock_balances_summary_attention_idx
  on public.stock_balances_summary(company_id, branch_id, status, is_low_stock);
create index if not exists stock_transactions_posted_date_branch_idx
  on public.stock_transactions(status, transaction_date desc, branch_id);
create index if not exists stock_transaction_lines_item_branch_idx
  on public.stock_transaction_lines(item_id, branch_id, stock_transaction_id);
create index if not exists activity_logs_created_at_idx
  on public.activity_logs(created_at desc);

alter table public.stock_balances_summary enable row level security;
drop policy if exists "stock balance summary scoped read" on public.stock_balances_summary;
create policy "stock balance summary scoped read"
  on public.stock_balances_summary for select to authenticated
  using (
    public.has_any_permission(array['inventory.read', 'stock_balance.read', 'low_stock.view'])
    and public.can_access_inventory_branch(company_id, branch_id)
  );

create or replace function public.refresh_stock_balances_summary(p_item_id uuid, p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_item_id is null or p_branch_id is null then
    return;
  end if;

  -- Serialize rebuilds for one item/branch pair so concurrent postings cannot
  -- leave the read model in an older state.
  perform pg_advisory_xact_lock(hashtextextended(p_item_id::text || ':' || p_branch_id::text, 0));
  delete from public.stock_balances_summary where item_id = p_item_id and branch_id = p_branch_id;

  with movement_rows as (
    select
      st.item_id,
      st.branch_id,
      st.quantity_in,
      st.quantity_out,
      coalesce(st.unit_cost, 0) as unit_cost,
      coalesce(st.total_cost, coalesce(st.unit_cost, 0) * greatest(st.quantity_in, st.quantity_out)) as total_cost,
      st.transaction_date
    from public.stock_transactions st
    where st.status = 'posted'
      and st.item_id = p_item_id
      and st.branch_id = p_branch_id
      and not exists (select 1 from public.stock_transaction_lines stl where stl.stock_transaction_id = st.id)
    union all
    select
      stl.item_id,
      coalesce(stl.branch_id, st.branch_id),
      stl.quantity_in,
      stl.quantity_out,
      coalesce(stl.unit_cost, st.unit_cost, 0),
      coalesce(stl.total_cost, coalesce(stl.unit_cost, st.unit_cost, 0) * greatest(stl.quantity_in, stl.quantity_out)),
      st.transaction_date
    from public.stock_transaction_lines stl
    join public.stock_transactions st on st.id = stl.stock_transaction_id
    where st.status = 'posted'
      and stl.item_id = p_item_id
      and coalesce(stl.branch_id, st.branch_id) = p_branch_id
  ), aggregated as (
    select
      item_id,
      branch_id,
      sum(quantity_in) as total_quantity_in,
      sum(quantity_out) as total_quantity_out,
      sum(quantity_in - quantity_out) as current_qty,
      sum(case when quantity_in > 0 then total_cost else 0 end) as purchase_cost,
      max(transaction_date) as last_movement
    from movement_rows
    group by item_id, branch_id
  ), costed as (
    select *,
      case when total_quantity_in > 0 then purchase_cost / total_quantity_in else 0 end as average_cost
    from aggregated
  )
  insert into public.stock_balances_summary (
    item_id, branch_id, company_id, item_code, autocount_code, item_name, branch_name, category, purchase_unit, base_unit,
    conversion_to_base_unit, supplier_id, supplier_name, cost, safety_stock, lead_time_days, moq,
    status, total_quantity_in, total_quantity_out, current_stock, current_qty, average_cost,
    inventory_value, last_movement, is_low_stock, shortage_quantity, updated_at
  )
  select
    c.item_id,
    c.branch_id,
    b.company_id,
    i.item_code,
    i.autocount_code,
    i.item_name,
    b.branch_name,
    coalesce(i.category, ''),
    coalesce(i.purchase_unit, ''),
    coalesce(i.base_unit, ''),
    coalesce(i.conversion_to_base_unit, 1),
    i.supplier_id,
    s.name,
    coalesce(i.cost, 0),
    coalesce(i.safety_stock, 0),
    coalesce(i.lead_time_days, 0),
    coalesce(i.moq, 0),
    i.status,
    c.total_quantity_in,
    c.total_quantity_out,
    c.current_qty,
    c.current_qty,
    c.average_cost,
    c.current_qty * c.average_cost,
    c.last_movement,
    c.current_qty < coalesce(i.safety_stock, 0),
    greatest(coalesce(i.safety_stock, 0) - c.current_qty, 0),
    now()
  from costed c
  join public.items i on i.id = c.item_id
  join public.branches b on b.id = c.branch_id
  left join public.suppliers s on s.id = i.supplier_id;
end;
$$;

create or replace function public.refresh_stock_balances_summary_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_stock_balances_summary(old.item_id, old.branch_id);
  end if;
  if tg_op <> 'DELETE' then
    perform public.refresh_stock_balances_summary(new.item_id, new.branch_id);
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_stock_balances_summary_from_line()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_branch uuid;
begin
  select branch_id into parent_branch
  from public.stock_transactions
  where id = coalesce(new.stock_transaction_id, old.stock_transaction_id);

  if tg_op <> 'INSERT' then
    perform public.refresh_stock_balances_summary(old.item_id, coalesce(old.branch_id, parent_branch));
  end if;
  if tg_op <> 'DELETE' then
    perform public.refresh_stock_balances_summary(new.item_id, coalesce(new.branch_id, parent_branch));
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_stock_balances_summary_from_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pair record;
begin
  for pair in select branch_id from public.stock_balances_summary where item_id = old.id loop
    perform public.refresh_stock_balances_summary(old.id, pair.branch_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists stock_balances_summary_transaction_refresh on public.stock_transactions;
create trigger stock_balances_summary_transaction_refresh
after insert or update or delete on public.stock_transactions
for each row execute function public.refresh_stock_balances_summary_from_transaction();

drop trigger if exists stock_balances_summary_line_refresh on public.stock_transaction_lines;
create trigger stock_balances_summary_line_refresh
after insert or update or delete on public.stock_transaction_lines
for each row execute function public.refresh_stock_balances_summary_from_line();

drop trigger if exists stock_balances_summary_item_refresh on public.items;
create trigger stock_balances_summary_item_refresh
after update of item_code, item_name, category, purchase_unit, base_unit, conversion_to_base_unit,
  supplier_id, cost, safety_stock, lead_time_days, moq, status on public.items
for each row execute function public.refresh_stock_balances_summary_from_item();

-- Backfill once when this migration is applied. The posted ledger remains the
-- source of truth; this table is only a replaceable read model.
do $$
declare
  pair record;
begin
  for pair in
    select distinct st.item_id, st.branch_id
    from public.stock_transactions st
    where st.status = 'posted' and st.item_id is not null and st.branch_id is not null
    union
    select distinct stl.item_id, coalesce(stl.branch_id, st.branch_id)
    from public.stock_transaction_lines stl
    join public.stock_transactions st on st.id = stl.stock_transaction_id
    where st.status = 'posted' and stl.item_id is not null and coalesce(stl.branch_id, st.branch_id) is not null
  loop
    perform public.refresh_stock_balances_summary(pair.item_id, pair.branch_id);
  end loop;
end;
$$;

create or replace function public.refresh_stock_balances_summary_from_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_item uuid;
begin
  for affected_item in
    select distinct item_id
    from public.stock_balances_summary
    where branch_id = new.id
  loop
    perform public.refresh_stock_balances_summary(affected_item, new.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists branches_refresh_stock_balances_summary on public.branches;
create trigger branches_refresh_stock_balances_summary
after update of branch_name, company_id on public.branches
for each row execute function public.refresh_stock_balances_summary_from_branch();

create or replace function public.get_inventory_dashboard_summary(p_period text default '30d')
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with params as (
  select case
    when p_period = '7d' then current_date - 7
    when p_period = 'month' then date_trunc('month', current_date)::date
    else current_date - 30
  end as period_start
), visible_branches as (
  select b.id, b.company_id
  from public.branches b
  where public.can_access_inventory_branch(b.company_id, b.id)
), visible_balances as (
  select s.*
  from public.stock_balances_summary s
  join visible_branches vb on vb.id = s.branch_id and vb.company_id = s.company_id
), movement_rows as (
  select
    st.id as stock_transaction_id,
    st.transaction_no,
    st.transaction_date,
    st.transaction_type,
    st.item_id,
    i.item_name,
    i.base_unit,
    st.branch_id,
    st.quantity_in,
    st.quantity_out,
    st.unit_cost,
    st.total_cost
  from public.stock_transactions st
  join public.items i on i.id = st.item_id
  join visible_branches vb on vb.id = st.branch_id
  cross join params p
  where st.status = 'posted'
    and st.transaction_date >= p.period_start
    and st.item_id is not null
    and not exists (select 1 from public.stock_transaction_lines stl where stl.stock_transaction_id = st.id)
  union all
  select
    st.id,
    st.transaction_no,
    st.transaction_date,
    st.transaction_type,
    stl.item_id,
    i.item_name,
    i.base_unit,
    coalesce(stl.branch_id, st.branch_id),
    stl.quantity_in,
    stl.quantity_out,
    coalesce(stl.unit_cost, st.unit_cost, 0),
    coalesce(stl.total_cost, st.total_cost, 0)
  from public.stock_transaction_lines stl
  join public.stock_transactions st on st.id = stl.stock_transaction_id
  join public.items i on i.id = stl.item_id
  join visible_branches vb on vb.id = coalesce(stl.branch_id, st.branch_id)
  cross join params p
  where st.status = 'posted'
    and st.transaction_date >= p.period_start
), top_purchased as (
  select item_name as name, sum(quantity_in) as qty
  from movement_rows
  where transaction_type = 'purchase' and quantity_in > 0
  group by item_name order by qty desc limit 5
), top_consumed as (
  select item_name as name, sum(quantity_out) as qty
  from movement_rows
  where transaction_type = 'production_usage' and quantity_out > 0
  group by item_name order by qty desc limit 5
), recent as (
  select jsonb_agg(to_jsonb(r)) as rows
  from (
    select stock_transaction_id as id, item_id, item_name, base_unit, transaction_date,
      transaction_type, quantity_in, quantity_out
    from movement_rows
    order by transaction_date desc, stock_transaction_id desc
    limit 8
  ) r
)
select jsonb_build_object(
  'inventory_value', coalesce((select sum(inventory_value) from visible_balances), 0),
  'total_active_items', coalesce((select count(distinct item_id) from visible_balances where status = 'active'), 0),
  'low_stock_items_count', coalesce((select count(*) from visible_balances where status = 'active' and is_low_stock), 0),
  'negative_stock', coalesce((select count(*) from visible_balances where current_qty < 0), 0),
  'todays_movements', coalesce((select count(*) from movement_rows where transaction_date = current_date), 0),
  'todays_receiving', coalesce((select count(*) from public.goods_receivings gr join visible_branches vb on vb.id = gr.branch_id where gr.received_date = current_date and gr.deleted_at is null), 0),
  'todays_transfers', coalesce((select count(*) from movement_rows where transaction_date = current_date and transaction_type in ('transfer_in', 'transfer_out')), 0),
  'pending_adjustments', coalesce((select count(*) from public.stock_counts sc join visible_branches vb on vb.id = sc.branch_id where sc.status in ('reviewed', 'approved') and sc.deleted_at is null), 0),
  'stock_count_due', coalesce((select count(*) from public.stock_counts sc join visible_branches vb on vb.id = sc.branch_id where sc.status in ('draft', 'submitted', 'reviewed', 'approved') and sc.deleted_at is null), 0),
  'recent_transactions', coalesce((select rows from recent), '[]'::jsonb),
  'top_purchased_items', coalesce((select jsonb_agg(to_jsonb(top_purchased)) from top_purchased), '[]'::jsonb),
  'top_consumed_items', coalesce((select jsonb_agg(to_jsonb(top_consumed)) from top_consumed), '[]'::jsonb),
  'low_stock_rows', coalesce((select jsonb_agg(to_jsonb(low_rows)) from (select * from visible_balances where status = 'active' and is_low_stock order by shortage_quantity desc, item_name asc limit 5) low_rows), '[]'::jsonb)
);
$$;

revoke all on function public.refresh_stock_balances_summary(uuid, uuid) from public, anon, authenticated;
revoke all on function public.refresh_stock_balances_summary_from_transaction() from public, anon, authenticated;
revoke all on function public.refresh_stock_balances_summary_from_line() from public, anon, authenticated;
revoke all on function public.refresh_stock_balances_summary_from_item() from public, anon, authenticated;
revoke all on function public.get_inventory_dashboard_summary(text) from public, anon;
grant execute on function public.get_inventory_dashboard_summary(text) to authenticated;
