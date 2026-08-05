-- Stock Card is a date-bounded read model. Do not read stock_ledger_view here:
-- that view evaluates an unbounded running window before PostgREST filters.

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
with expanded as (
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
    b.branch_name::text,
    coalesce(st.quantity_in, 0)::numeric as quantity_in,
    coalesce(st.quantity_out, 0)::numeric as quantity_out,
    coalesce(st.unit_cost, 0)::numeric as unit_cost,
    coalesce(st.total_cost, coalesce(st.unit_cost, 0) * greatest(coalesce(st.quantity_in, 0), coalesce(st.quantity_out, 0)))::numeric as total_cost,
    st.created_at
  from public.stock_transactions st
  join public.items i on i.id = st.item_id
  join public.branches b on b.id = st.branch_id
  where st.status = 'posted'
    and not exists (
      select 1 from public.stock_transaction_lines stl
      where stl.stock_transaction_id = st.id
    )
    and public.can_access_inventory_branch(b.company_id, b.id)

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
    b.branch_name::text,
    coalesce(stl.quantity_in, 0)::numeric,
    coalesce(stl.quantity_out, 0)::numeric,
    coalesce(stl.unit_cost, st.unit_cost, 0)::numeric,
    coalesce(stl.total_cost, st.total_cost, coalesce(stl.unit_cost, st.unit_cost, 0) * greatest(coalesce(stl.quantity_in, 0), coalesce(stl.quantity_out, 0)))::numeric,
    st.created_at
  from public.stock_transaction_lines stl
  join public.stock_transactions st on st.id = stl.stock_transaction_id
  join public.items i on i.id = stl.item_id
  join public.branches b on b.id = coalesce(stl.branch_id, st.branch_id)
  where st.status = 'posted'
    and public.can_access_inventory_branch(b.company_id, b.id)
), scoped as (
  select *
  from expanded e
  where (p_item_id is null or e.item_id = p_item_id)
    and (p_branch_id is null or e.branch_id = p_branch_id)
), opening as (
  select item_id, branch_id, sum(quantity_in - quantity_out)::numeric as opening_balance
  from scoped
  where transaction_date < p_from
  group by item_id, branch_id
), period_rows as (
  select s.*
  from scoped s
  where s.transaction_date between p_from and p_to
), calculated as (
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
  p.stock_transaction_id,
  p.transaction_no,
  p.transaction_date,
  p.transaction_type,
  p.status,
  p.document_id,
  p.reference_type,
  p.reference_id,
  p.created_by,
  p.posted_at,
  p.stock_transaction_line_id,
  p.item_id,
  p.item_code,
  p.item_name,
  p.base_unit,
  p.branch_id,
  p.branch_name,
  p.quantity_in,
  p.quantity_out,
  p.unit_cost,
  p.total_cost,
  p.calculated_running_balance as running_balance
from calculated p
where (p_transaction_type is null or p.transaction_type = p_transaction_type)
  and (p_direction is null
    or (p_direction = 'inbound' and p.quantity_in > 0)
    or (p_direction = 'outbound' and p.quantity_out > 0))
  and (nullif(btrim(p_search), '') is null or concat_ws(' ', p.transaction_no, p.transaction_type, p.item_code, p.item_name, p.branch_name) ilike '%' || btrim(p_search) || '%')
  and (nullif(btrim(p_source), '') is null or concat_ws(' ', p.reference_type, p.reference_id, p.transaction_no) ilike '%' || btrim(p_source) || '%')
order by p.transaction_date, p.created_at, p.stock_transaction_id, p.stock_transaction_line_id;
$$;

revoke all on function public.get_stock_card_bounded(date, date, uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.get_stock_card_bounded(date, date, uuid, uuid, text, text, text, text) to authenticated;
