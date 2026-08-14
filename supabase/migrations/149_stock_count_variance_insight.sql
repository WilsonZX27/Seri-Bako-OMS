-- Bounded, unit-safe Stock Count variance insight.
-- Quantities are never aggregated across items/UOMs. The report counts posted
-- lines whose stored variance percentage exceeds that count's stored tolerance.

create or replace function public.get_stock_count_variance_insight(
  p_branch_id uuid default null
)
returns table (
  row_kind text,
  row_key text,
  row_label text,
  record_date date,
  entity_id uuid,
  high_variance_count bigint,
  shortage_count bigint,
  overage_count bigint,
  latest_count_id uuid,
  latest_count_no text,
  latest_count_date date,
  latest_variance_percent numeric,
  latest_variance_qty numeric,
  latest_uom text,
  rank_order integer
)
language sql
stable
security invoker
set search_path = public
as $$
with clock as (
  select (now() at time zone 'Asia/Kuala_Lumpur')::date as report_date
), calendar as (
  select generate_series(c.report_date - 29, c.report_date, interval '1 day')::date as record_date
  from clock c
), high_lines as (
  select
    sc.id as count_id,
    sc.count_no,
    sc.count_date,
    sc.posted_at,
    sc.branch_id,
    coalesce(b.branch_name, 'Archived branch') as branch_name,
    scl.item_id,
    coalesce(i.item_name, 'Archived item') as item_name,
    scl.variance_percent,
    scl.variance_qty,
    scl.uom
  from public.stock_counts sc
  join public.stock_count_lines scl on scl.stock_count_id = sc.id
  left join public.items i on i.id = scl.item_id
  left join public.branches b on b.id = sc.branch_id
  cross join clock c
  where sc.status = 'posted'
    and sc.deleted_at is null
    and sc.count_date between c.report_date - 29 and c.report_date
    and (p_branch_id is null or sc.branch_id = p_branch_id)
    and abs(scl.variance_percent) > sc.tolerance_percent
), daily as (
  select
    c.record_date,
    count(h.count_id)::bigint as high_variance_count,
    count(h.count_id) filter (where h.variance_qty < 0)::bigint as shortage_count,
    count(h.count_id) filter (where h.variance_qty > 0)::bigint as overage_count
  from calendar c
  left join high_lines h on h.count_date = c.record_date
  group by c.record_date
), item_groups as (
  select
    h.item_id,
    h.item_name,
    count(*)::bigint as high_variance_count,
    count(*) filter (where h.variance_qty < 0)::bigint as shortage_count,
    count(*) filter (where h.variance_qty > 0)::bigint as overage_count,
    (array_agg(h.count_id order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_count_id,
    (array_agg(h.count_no order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_count_no,
    (array_agg(h.count_date order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_count_date,
    (array_agg(h.variance_percent order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_variance_percent,
    (array_agg(h.variance_qty order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_variance_qty,
    (array_agg(h.uom order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_uom,
    max(abs(h.variance_percent)) as maximum_absolute_percent
  from high_lines h
  group by h.item_id, h.item_name
), ranked_items as (
  select *, row_number() over (order by high_variance_count desc, maximum_absolute_percent desc, item_name, item_id)::integer as rank_order
  from item_groups
), branch_groups as (
  select
    h.branch_id,
    h.branch_name,
    count(*)::bigint as high_variance_count,
    count(*) filter (where h.variance_qty < 0)::bigint as shortage_count,
    count(*) filter (where h.variance_qty > 0)::bigint as overage_count,
    (array_agg(h.count_id order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_count_id,
    (array_agg(h.count_no order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_count_no,
    (array_agg(h.count_date order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_count_date,
    (array_agg(h.variance_percent order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_variance_percent,
    (array_agg(h.variance_qty order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_variance_qty,
    (array_agg(h.uom order by h.count_date desc, h.posted_at desc nulls last, h.count_id desc))[1] as latest_uom,
    max(abs(h.variance_percent)) as maximum_absolute_percent
  from high_lines h
  group by h.branch_id, h.branch_name
), ranked_branches as (
  select *, row_number() over (order by high_variance_count desc, maximum_absolute_percent desc, branch_name, branch_id)::integer as rank_order
  from branch_groups
)
select 'day'::text as row_kind, d.record_date::text as row_key, to_char(d.record_date, 'DD/MM/YYYY') as row_label,
  d.record_date, null::uuid as entity_id,
  d.high_variance_count, d.shortage_count, d.overage_count,
  null::uuid as latest_count_id, null::text as latest_count_no, null::date as latest_count_date,
  null::numeric as latest_variance_percent, null::numeric as latest_variance_qty, null::text as latest_uom,
  row_number() over (order by d.record_date)::integer as rank_order
from daily d
union all
select 'item', r.item_id::text, r.item_name, null::date, r.item_id,
  r.high_variance_count, r.shortage_count, r.overage_count,
  r.latest_count_id, r.latest_count_no, r.latest_count_date, r.latest_variance_percent, r.latest_variance_qty, r.latest_uom,
  r.rank_order
from ranked_items r where r.rank_order <= 8
union all
select 'branch', r.branch_id::text, r.branch_name, null::date, r.branch_id,
  r.high_variance_count, r.shortage_count, r.overage_count,
  r.latest_count_id, r.latest_count_no, r.latest_count_date, r.latest_variance_percent, r.latest_variance_qty, r.latest_uom,
  r.rank_order
from ranked_branches r where r.rank_order <= 8
order by row_kind, rank_order;
$$;

revoke all on function public.get_stock_count_variance_insight(uuid) from public, anon;
grant execute on function public.get_stock_count_variance_insight(uuid) to authenticated;
