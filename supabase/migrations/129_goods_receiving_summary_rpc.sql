-- Keep the GRN list summary exact without transferring every receiving and
-- receiving line to the application server. SECURITY INVOKER deliberately
-- preserves the existing row-level access policies for the signed-in staff.

create or replace function public.get_goods_receiving_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with visible_receivings as (
  select gr.id, gr.status
  from public.goods_receivings gr
  where gr.deleted_at is null
), status_summary as (
  select
    count(*) as total,
    count(*) filter (where status = 'draft') as draft,
    count(*) filter (where status = 'posted') as posted,
    count(*) filter (where status = 'cancelled') as cancelled
  from visible_receivings
), quantity_summary as (
  select
    coalesce(sum(grl.received_qty), 0) as received_total,
    coalesce(sum(grl.rejected_qty), 0) as rejected_total
  from public.goods_receiving_lines grl
  join visible_receivings gr on gr.id = grl.goods_receiving_id
)
select jsonb_build_object(
  'total', status_summary.total,
  'draft', status_summary.draft,
  'posted', status_summary.posted,
  'cancelled', status_summary.cancelled,
  'received_total', quantity_summary.received_total,
  'rejected_total', quantity_summary.rejected_total
)
from status_summary
cross join quantity_summary;
$$;

revoke all on function public.get_goods_receiving_summary() from public, anon;
grant execute on function public.get_goods_receiving_summary() to authenticated;

