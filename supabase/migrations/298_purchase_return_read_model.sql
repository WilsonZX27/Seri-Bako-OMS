-- Bounded purchase-return queue and one-pass summary.
-- The view is security-invoker so the existing purchase_returns and line RLS
-- policies remain the tenant and permission authority.

create or replace view public.purchase_returns_list_view
with (security_invoker = true) as
select
  pr.*,
  gr.grn_no,
  po.po_no,
  supplier.name as supplier_name,
  branch.branch_name,
  count(line.id)::integer as line_count,
  coalesce(sum(line.return_qty), 0)::numeric as return_total,
  coalesce(sum(line.line_total), 0)::numeric as return_value
from public.purchase_returns pr
join public.goods_receivings gr on gr.id = pr.goods_receiving_id
join public.purchase_orders po on po.id = pr.purchase_order_id
join public.suppliers supplier on supplier.id = pr.supplier_id
left join public.branches branch on branch.id = pr.branch_id
left join public.purchase_return_lines line on line.purchase_return_id = pr.id
where pr.deleted_at is null
group by pr.id, gr.grn_no, po.po_no, supplier.name, branch.branch_name;

create or replace function public.get_purchase_return_summary()
returns table(total bigint, draft bigint, posted bigint, cancelled bigint, value numeric)
language sql
stable
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where status = 'draft')::bigint,
    count(*) filter (where status = 'posted')::bigint,
    count(*) filter (where status = 'cancelled')::bigint,
    coalesce(sum(return_value), 0)::numeric
  from public.purchase_returns_list_view;
$$;

create index if not exists purchase_returns_updated_at_idx
  on public.purchase_returns(updated_at desc, id desc)
  where deleted_at is null;

revoke all on public.purchase_returns_list_view from public, anon;
grant select on public.purchase_returns_list_view to authenticated;
revoke all on function public.get_purchase_return_summary() from public, anon;
grant execute on function public.get_purchase_return_summary() to authenticated;
