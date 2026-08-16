-- Keep stock-card and movement-ledger reads bounded at the database boundary.
--
-- The previous implementation materialised every posted transaction before
-- calculating the opening balance for a short date window. That defeated the
-- purpose of the bounded RPC and was the direct cause of the recurring 57014
-- timeouts in the supplied Supabase logs. The daily summary is maintained by
-- migration 138 triggers and is the canonical aggregate for historical
-- opening quantities; only the requested transaction window is expanded.

create index if not exists inventory_daily_summary_branch_item_date_idx
  on public.inventory_daily_summary(branch_id, item_id, transaction_date);

-- Date is the leading predicate for the opening window. Keep an index whose
-- first key matches that access pattern so all-branch/all-item reads do not
-- fall back to a full historical summary scan.
create index if not exists inventory_daily_summary_date_branch_item_idx
  on public.inventory_daily_summary(transaction_date, branch_id, item_id);

create or replace function public.get_stock_card_bounded(
  p_from date,
  p_to date,
  p_item_id uuid default null,
  p_branch_id uuid default null,
  p_transaction_type text default null,
  p_direction text default null,
  p_search text default null,
  p_source text default null
)
returns table (
  stock_transaction_id uuid,
  transaction_no text,
  transaction_date date,
  transaction_type text,
  status text,
  document_id uuid,
  reference_type text,
  reference_id text,
  created_by uuid,
  posted_at timestamptz,
  stock_transaction_line_id uuid,
  item_id uuid,
  item_code text,
  item_name text,
  base_unit text,
  branch_id uuid,
  branch_name text,
  quantity_in numeric,
  quantity_out numeric,
  unit_cost numeric,
  total_cost numeric,
  running_balance numeric
)
language sql
stable
security invoker
set search_path = public
as $$
with visible_branches as materialized (
  select b.id, b.company_id, b.branch_name
  from public.branches b
  where (p_branch_id is null or b.id = p_branch_id)
    and public.can_access_inventory_branch(b.company_id, b.id)
),
opening as (
  select
    d.item_id,
    d.branch_id,
    sum(coalesce(d.quantity_in, 0) - coalesce(d.quantity_out, 0))::numeric as opening_balance
  from public.inventory_daily_summary d
  join visible_branches vb on vb.id = d.branch_id and vb.company_id = d.company_id
  where d.transaction_date < p_from
    and (p_item_id is null or d.item_id = p_item_id)
  group by d.item_id, d.branch_id
),
period_rows as (
  select
    st.id as stock_transaction_id,
    st.transaction_no::text,
    st.transaction_date,
    st.transaction_type::text,
    st.status::text,
    st.document_id,
    st.reference_type::text,
    st.reference_id,
    st.created_by,
    st.posted_at,
    null::uuid as stock_transaction_line_id,
    st.item_id,
    i.item_code::text,
    i.item_name::text,
    i.base_unit::text,
    st.branch_id,
    vb.branch_name::text,
    coalesce(st.quantity_in, 0)::numeric as quantity_in,
    coalesce(st.quantity_out, 0)::numeric as quantity_out,
    coalesce(st.unit_cost, 0)::numeric as unit_cost,
    coalesce(st.total_cost, coalesce(st.unit_cost, 0) * greatest(coalesce(st.quantity_in, 0), coalesce(st.quantity_out, 0)))::numeric as total_cost,
    st.created_at
  from public.stock_transactions st
  join visible_branches vb on vb.id = st.branch_id
  join public.items i on i.id = st.item_id
  where st.status = 'posted'
    and st.transaction_date between p_from and p_to
    and (p_item_id is null or st.item_id = p_item_id)
    and not exists (
      select 1
      from public.stock_transaction_lines stl
      where stl.stock_transaction_id = st.id
    )

  union all

  select
    st.id,
    st.transaction_no::text,
    st.transaction_date,
    st.transaction_type::text,
    st.status::text,
    st.document_id,
    st.reference_type::text,
    st.reference_id,
    st.created_by,
    st.posted_at,
    stl.id,
    stl.item_id,
    i.item_code::text,
    i.item_name::text,
    i.base_unit::text,
    coalesce(stl.branch_id, st.branch_id),
    vb.branch_name::text,
    coalesce(stl.quantity_in, 0)::numeric,
    coalesce(stl.quantity_out, 0)::numeric,
    coalesce(stl.unit_cost, st.unit_cost, 0)::numeric,
    coalesce(stl.total_cost, st.total_cost, coalesce(stl.unit_cost, st.unit_cost, 0) * greatest(coalesce(stl.quantity_in, 0), coalesce(stl.quantity_out, 0)))::numeric,
    st.created_at
  from public.stock_transaction_lines stl
  join public.stock_transactions st on st.id = stl.stock_transaction_id
  join public.branches line_branch on line_branch.id = coalesce(stl.branch_id, st.branch_id)
  join visible_branches vb on vb.id = line_branch.id
  join public.items i on i.id = stl.item_id
  where st.status = 'posted'
    and st.transaction_date between p_from and p_to
    and (p_item_id is null or stl.item_id = p_item_id)
),
calculated as (
  select
    p.*,
    coalesce(o.opening_balance, 0)
      + sum(p.quantity_in - p.quantity_out) over (
        partition by p.item_id, p.branch_id
        order by p.transaction_date, p.created_at, p.stock_transaction_id, p.stock_transaction_line_id
        rows between unbounded preceding and current row
      ) as calculated_running_balance
  from period_rows p
  left join opening o on o.item_id = p.item_id and o.branch_id = p.branch_id
)
select
  c.stock_transaction_id,
  c.transaction_no,
  c.transaction_date,
  c.transaction_type,
  c.status,
  c.document_id,
  c.reference_type,
  c.reference_id,
  c.created_by,
  c.posted_at,
  c.stock_transaction_line_id,
  c.item_id,
  c.item_code,
  c.item_name,
  c.base_unit,
  c.branch_id,
  c.branch_name,
  c.quantity_in,
  c.quantity_out,
  c.unit_cost,
  c.total_cost,
  c.calculated_running_balance as running_balance
from calculated c
where (p_transaction_type is null or c.transaction_type = p_transaction_type)
  and (p_direction is null
    or (p_direction = 'inbound' and c.quantity_in > 0)
    or (p_direction = 'outbound' and c.quantity_out > 0))
  and (nullif(btrim(p_search), '') is null or concat_ws(' ', c.transaction_no, c.transaction_type, c.item_code, c.item_name, c.branch_name) ilike '%' || btrim(p_search) || '%')
  and (nullif(btrim(p_source), '') is null or concat_ws(' ', c.reference_type, c.reference_id, c.transaction_no) ilike '%' || btrim(p_source) || '%')
order by c.transaction_date, c.created_at, c.stock_transaction_id, c.stock_transaction_line_id;
$$;

revoke all on function public.get_stock_card_bounded(date, date, uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.get_stock_card_bounded(date, date, uuid, uuid, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
