-- Bounded, unit-safe movement activity for the Inventory workspace.
-- Quantities are deliberately not added across items because their base UOMs
-- can differ. The chart reports posted ledger-entry counts by direction.

create or replace function public.get_inventory_daily_movement_summary(
  p_period text default '30d'
)
returns table (
  transaction_date date,
  inbound_entries bigint,
  outbound_entries bigint,
  movement_entries bigint
)
language sql
stable
security invoker
set search_path = public
as $$
with clock as (
  select (now() at time zone 'Asia/Kuala_Lumpur')::date as report_date
), params as (
  select
    report_date,
    case
      when p_period = '7d' then report_date - 6
      when p_period = 'month' then date_trunc('month', report_date)::date
      else report_date - 29
    end as period_start
  from clock
), calendar as (
  select generate_series(p.period_start, p.report_date, interval '1 day')::date as transaction_date
  from params p
), activity as (
  select
    d.transaction_date,
    coalesce(sum(d.movement_count) filter (where d.quantity_in > 0), 0)::bigint as inbound_entries,
    coalesce(sum(d.movement_count) filter (where d.quantity_out > 0), 0)::bigint as outbound_entries,
    coalesce(sum(d.movement_count), 0)::bigint as movement_entries
  from public.inventory_daily_summary d
  cross join params p
  where d.transaction_date between p.period_start and p.report_date
  group by d.transaction_date
)
select
  c.transaction_date,
  coalesce(a.inbound_entries, 0)::bigint,
  coalesce(a.outbound_entries, 0)::bigint,
  coalesce(a.movement_entries, 0)::bigint
from calendar c
left join activity a using (transaction_date)
order by c.transaction_date;
$$;

revoke all on function public.get_inventory_daily_movement_summary(text) from public, anon;
grant execute on function public.get_inventory_daily_movement_summary(text) to authenticated;
