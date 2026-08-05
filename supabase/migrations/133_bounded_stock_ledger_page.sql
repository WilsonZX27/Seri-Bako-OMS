-- Movement Ledger list reads a bounded period and paginates in PostgreSQL.
-- The underlying Stock Card function calculates opening and running balances
-- before display filters, so paging never changes inventory semantics.

create or replace function public.get_stock_ledger_bounded_page(
  p_from date,
  p_to date,
  p_item_id uuid default null,
  p_branch_id uuid default null,
  p_transaction_type text default null,
  p_direction text default null,
  p_search text default null,
  p_source text default null,
  p_sort text default 'transaction_date',
  p_dir text default 'desc',
  p_offset integer default 0,
  p_limit integer default 15
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
  running_balance numeric,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
with filtered as materialized (
  select *
  from public.get_stock_card_bounded(
    p_from,
    p_to,
    p_item_id,
    p_branch_id,
    p_transaction_type,
    p_direction,
    p_search,
    p_source
  )
), counted as (
  select f.*, count(*) over () as total_count
  from filtered f
)
select *
from counted c
order by
  case when p_sort = 'transaction_no' and p_dir = 'asc' then c.transaction_no end asc,
  case when p_sort = 'transaction_no' and p_dir = 'desc' then c.transaction_no end desc,
  case when p_sort = 'transaction_type' and p_dir = 'asc' then c.transaction_type end asc,
  case when p_sort = 'transaction_type' and p_dir = 'desc' then c.transaction_type end desc,
  case when p_sort = 'item_code' and p_dir = 'asc' then c.item_code end asc,
  case when p_sort = 'item_code' and p_dir = 'desc' then c.item_code end desc,
  case when p_sort = 'item_name' and p_dir = 'asc' then c.item_name end asc,
  case when p_sort = 'item_name' and p_dir = 'desc' then c.item_name end desc,
  case when p_sort = 'branch_name' and p_dir = 'asc' then c.branch_name end asc,
  case when p_sort = 'branch_name' and p_dir = 'desc' then c.branch_name end desc,
  case when p_sort = 'quantity_in' and p_dir = 'asc' then c.quantity_in end asc,
  case when p_sort = 'quantity_in' and p_dir = 'desc' then c.quantity_in end desc,
  case when p_sort = 'quantity_out' and p_dir = 'asc' then c.quantity_out end asc,
  case when p_sort = 'quantity_out' and p_dir = 'desc' then c.quantity_out end desc,
  case when p_sort = 'running_balance' and p_dir = 'asc' then c.running_balance end asc,
  case when p_sort = 'running_balance' and p_dir = 'desc' then c.running_balance end desc,
  case when p_sort = 'transaction_date' and p_dir = 'asc' then c.transaction_date end asc,
  c.transaction_date desc,
  c.posted_at desc nulls last,
  c.stock_transaction_id desc,
  c.stock_transaction_line_id desc nulls last
offset greatest(coalesce(p_offset, 0), 0)
limit case when p_limit is null then null else greatest(least(p_limit, 50000), 1) end;
$$;

revoke all on function public.get_stock_ledger_bounded_page(date, date, uuid, uuid, text, text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.get_stock_ledger_bounded_page(date, date, uuid, uuid, text, text, text, text, text, text, integer, integer) to authenticated;
