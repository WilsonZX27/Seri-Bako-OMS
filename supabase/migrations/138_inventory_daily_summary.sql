-- Keep Inventory landing-page trends off the raw transaction stream.
-- The posted ledger remains the source of truth; this table is a replaceable
-- daily read model for counts and short trend summaries.

create table if not exists public.inventory_daily_summary (
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  transaction_date date not null,
  transaction_type text not null,
  quantity_in numeric(14,4) not null default 0,
  quantity_out numeric(14,4) not null default 0,
  movement_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (branch_id, item_id, transaction_date, transaction_type)
);

create index if not exists inventory_daily_summary_company_date_idx
  on public.inventory_daily_summary(company_id, transaction_date desc, branch_id);
create index if not exists inventory_daily_summary_type_date_idx
  on public.inventory_daily_summary(company_id, transaction_type, transaction_date desc);

alter table public.inventory_daily_summary enable row level security;
drop policy if exists "inventory daily summary scoped read" on public.inventory_daily_summary;
create policy "inventory daily summary scoped read"
  on public.inventory_daily_summary for select to authenticated
  using (
    public.has_any_permission(array['inventory.read', 'stock_balance.read', 'low_stock.view'])
    and public.can_access_inventory_branch(company_id, branch_id)
  );

create or replace function public.refresh_inventory_daily_summary(
  p_item_id uuid,
  p_branch_id uuid,
  p_transaction_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_item_id is null or p_branch_id is null or p_transaction_date is null then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_item_id::text || ':' || p_branch_id::text || ':' || p_transaction_date::text,
    0
  ));

  delete from public.inventory_daily_summary
  where item_id = p_item_id
    and branch_id = p_branch_id
    and transaction_date = p_transaction_date;

  with movement_rows as (
    select
      st.item_id,
      st.branch_id,
      st.transaction_date,
      st.transaction_type::text as transaction_type,
      st.quantity_in,
      st.quantity_out
    from public.stock_transactions st
    where st.status = 'posted'
      and st.item_id = p_item_id
      and st.branch_id = p_branch_id
      and st.transaction_date = p_transaction_date
      and not exists (
        select 1 from public.stock_transaction_lines stl
        where stl.stock_transaction_id = st.id
      )
    union all
    select
      stl.item_id,
      coalesce(stl.branch_id, st.branch_id),
      st.transaction_date,
      st.transaction_type::text,
      stl.quantity_in,
      stl.quantity_out
    from public.stock_transaction_lines stl
    join public.stock_transactions st on st.id = stl.stock_transaction_id
    where st.status = 'posted'
      and stl.item_id = p_item_id
      and coalesce(stl.branch_id, st.branch_id) = p_branch_id
      and st.transaction_date = p_transaction_date
  )
  insert into public.inventory_daily_summary (
    company_id,
    branch_id,
    item_id,
    transaction_date,
    transaction_type,
    quantity_in,
    quantity_out,
    movement_count,
    updated_at
  )
  select
    b.company_id,
    m.branch_id,
    m.item_id,
    m.transaction_date,
    m.transaction_type,
    coalesce(sum(m.quantity_in), 0),
    coalesce(sum(m.quantity_out), 0),
    count(*)::integer,
    now()
  from movement_rows m
  join public.branches b on b.id = m.branch_id
  group by b.company_id, m.branch_id, m.item_id, m.transaction_date, m.transaction_type;
end;
$$;

create or replace function public.refresh_inventory_daily_summary_from_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.refresh_inventory_daily_summary(old.item_id, old.branch_id, old.transaction_date);
  end if;
  if tg_op <> 'DELETE' then
    perform public.refresh_inventory_daily_summary(new.item_id, new.branch_id, new.transaction_date);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.refresh_inventory_daily_summary_from_line()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_parent record;
  new_parent record;
begin
  if tg_op <> 'INSERT' then
    select transaction_date, branch_id
      into old_parent
      from public.stock_transactions
     where id = old.stock_transaction_id;
    if found then
      perform public.refresh_inventory_daily_summary(
        old.item_id,
        coalesce(old.branch_id, old_parent.branch_id),
        old_parent.transaction_date
      );
    end if;
  end if;

  if tg_op <> 'DELETE' then
    select transaction_date, branch_id
      into new_parent
      from public.stock_transactions
     where id = new.stock_transaction_id;
    if new_parent is not null then
      perform public.refresh_inventory_daily_summary(
        new.item_id,
        coalesce(new.branch_id, new_parent.branch_id),
        new_parent.transaction_date
      );
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists inventory_daily_summary_transaction_refresh on public.stock_transactions;
create trigger inventory_daily_summary_transaction_refresh
after insert or update or delete on public.stock_transactions
for each row execute function public.refresh_inventory_daily_summary_from_transaction();

drop trigger if exists inventory_daily_summary_line_refresh on public.stock_transaction_lines;
create trigger inventory_daily_summary_line_refresh
after insert or update or delete on public.stock_transaction_lines
for each row execute function public.refresh_inventory_daily_summary_from_line();

-- One-time backfill. Future writes are maintained by the triggers above.
with movement_rows as (
  select
    st.item_id,
    st.branch_id,
    st.transaction_date,
    st.transaction_type::text as transaction_type,
    st.quantity_in,
    st.quantity_out
  from public.stock_transactions st
  where st.status = 'posted'
    and st.item_id is not null
    and st.branch_id is not null
    and not exists (
      select 1 from public.stock_transaction_lines stl
      where stl.stock_transaction_id = st.id
    )
  union all
  select
    stl.item_id,
    coalesce(stl.branch_id, st.branch_id),
    st.transaction_date,
    st.transaction_type::text,
    stl.quantity_in,
    stl.quantity_out
  from public.stock_transaction_lines stl
  join public.stock_transactions st on st.id = stl.stock_transaction_id
  where st.status = 'posted'
    and stl.item_id is not null
    and coalesce(stl.branch_id, st.branch_id) is not null
), grouped as (
  select
    b.company_id,
    m.branch_id,
    m.item_id,
    m.transaction_date,
    m.transaction_type,
    coalesce(sum(m.quantity_in), 0) as quantity_in,
    coalesce(sum(m.quantity_out), 0) as quantity_out,
    count(*)::integer as movement_count
  from movement_rows m
  join public.branches b on b.id = m.branch_id
  group by b.company_id, m.branch_id, m.item_id, m.transaction_date, m.transaction_type
)
insert into public.inventory_daily_summary (
  company_id, branch_id, item_id, transaction_date, transaction_type,
  quantity_in, quantity_out, movement_count, updated_at
)
select company_id, branch_id, item_id, transaction_date, transaction_type,
  quantity_in, quantity_out, movement_count, now()
from grouped
on conflict (branch_id, item_id, transaction_date, transaction_type) do update set
  company_id = excluded.company_id,
  quantity_in = excluded.quantity_in,
  quantity_out = excluded.quantity_out,
  movement_count = excluded.movement_count,
  updated_at = now();

-- Replace the movement-heavy Inventory RPC with the daily read model.
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
), daily_rows as (
  select d.*
  from public.inventory_daily_summary d
  join visible_branches vb on vb.id = d.branch_id and vb.company_id = d.company_id
  cross join params p
  where d.transaction_date >= p.period_start
), top_purchased as (
  select i.item_name as name, sum(d.quantity_in) as qty
  from daily_rows d
  join public.items i on i.id = d.item_id
  where d.transaction_type = 'purchase' and d.quantity_in > 0
  group by i.item_name order by qty desc limit 5
), top_consumed as (
  select i.item_name as name, sum(d.quantity_out) as qty
  from daily_rows d
  join public.items i on i.id = d.item_id
  where d.transaction_type = 'production_usage' and d.quantity_out > 0
  group by i.item_name order by qty desc limit 5
)
select jsonb_build_object(
  'inventory_value', coalesce((select sum(inventory_value) from visible_balances), 0),
  'total_active_items', coalesce((select count(distinct item_id) from visible_balances where status = 'active'), 0),
  'low_stock_items_count', coalesce((select count(*) from visible_balances where status = 'active' and is_low_stock), 0),
  'negative_stock', coalesce((select count(*) from visible_balances where current_qty < 0), 0),
  'todays_movements', coalesce((select sum(movement_count) from daily_rows where transaction_date = current_date), 0),
  'todays_receiving', coalesce((select count(*) from public.goods_receivings gr join visible_branches vb on vb.id = gr.branch_id where gr.received_date = current_date and gr.deleted_at is null), 0),
  'todays_transfers', coalesce((select sum(movement_count) from daily_rows where transaction_date = current_date and transaction_type in ('transfer_in', 'transfer_out')), 0),
  'pending_adjustments', coalesce((select count(*) from public.stock_counts sc join visible_branches vb on vb.id = sc.branch_id where sc.status in ('reviewed', 'approved') and sc.deleted_at is null), 0),
  'stock_count_due', coalesce((select count(*) from public.stock_counts sc join visible_branches vb on vb.id = sc.branch_id where sc.status in ('draft', 'submitted', 'reviewed', 'approved') and sc.deleted_at is null), 0),
  'recent_transactions', '[]'::jsonb,
  'top_purchased_items', coalesce((select jsonb_agg(to_jsonb(top_purchased)) from top_purchased), '[]'::jsonb),
  'top_consumed_items', coalesce((select jsonb_agg(to_jsonb(top_consumed)) from top_consumed), '[]'::jsonb),
  'low_stock_rows', coalesce((select jsonb_agg(to_jsonb(low_rows)) from (select * from visible_balances where status = 'active' and is_low_stock order by shortage_quantity desc, item_name asc limit 5) low_rows), '[]'::jsonb)
);
$$;

revoke all on function public.refresh_inventory_daily_summary(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.refresh_inventory_daily_summary_from_transaction() from public, anon, authenticated;
revoke all on function public.refresh_inventory_daily_summary_from_line() from public, anon, authenticated;
revoke all on function public.get_inventory_dashboard_summary(text) from public, anon;
grant execute on function public.get_inventory_dashboard_summary(text) to authenticated;
