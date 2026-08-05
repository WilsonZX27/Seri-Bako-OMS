-- Bounded Items workspace read model.
-- Returns one filtered page plus compact facets/summary without transferring the
-- complete items or stock-balance tables to the application server.

create or replace function public.get_items_workspace(
  p_search text default null,
  p_status text default null,
  p_category text default null,
  p_supplier_id uuid default null,
  p_stock_control text default null,
  p_low_stock text default null,
  p_sort text default 'item_name',
  p_direction text default 'asc',
  p_page integer default 1,
  p_page_size integer default 15
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with stock_rollup as (
  select
    s.item_id,
    coalesce(sum(s.current_qty), 0)::numeric as current_stock,
    coalesce(bool_or(s.is_low_stock), false) as is_low_stock
  from public.stock_balances_summary s
  group by s.item_id
), item_read_model as (
  select
    i.id,
    i.company_id,
    i.item_code,
    i.autocount_code,
    i.item_name,
    i.category,
    i.purchase_unit,
    i.base_unit,
    i.conversion_to_base_unit,
    i.supplier_id,
    supplier.name as supplier_name,
    i.cost,
    i.safety_stock,
    i.lead_time_days,
    i.moq,
    i.status,
    i.item_image_url,
    i.created_at,
    i.updated_at,
    i.deleted_at,
    coalesce(stock.current_stock, 0)::numeric as current_stock,
    coalesce(stock.is_low_stock, false) as is_low_stock
  from public.items i
  left join public.suppliers supplier on supplier.id = i.supplier_id
  left join stock_rollup stock on stock.item_id = i.id
), filtered as (
  select *
  from item_read_model row
  where
    (nullif(trim(p_search), '') is null or
      row.item_code ilike '%' || trim(p_search) || '%' or
      row.item_name ilike '%' || trim(p_search) || '%' or
      row.category ilike '%' || trim(p_search) || '%' or
      coalesce(row.supplier_name, '') ilike '%' || trim(p_search) || '%')
    and (
      p_status = 'archived' and row.deleted_at is not null
      or (nullif(p_status, '') is null or p_status = 'all') and row.deleted_at is null
      or p_status not in ('all', 'archived') and row.deleted_at is null and row.status::text = p_status
    )
    and (nullif(p_category, '') is null or p_category = 'all' or row.category = p_category)
    and (p_supplier_id is null or row.supplier_id = p_supplier_id)
    and (
      nullif(p_stock_control, '') is null or p_stock_control = 'all'
      or p_stock_control = 'with_safety_stock' and row.safety_stock > 0
      or p_stock_control = 'without_safety_stock' and row.safety_stock = 0
    )
    and (
      nullif(p_low_stock, '') is null or p_low_stock = 'all'
      or p_low_stock = 'yes' and row.is_low_stock
      or p_low_stock = 'no' and not row.is_low_stock
    )
), ranked as (
  select
    filtered.*,
    row_number() over (order by
      case when p_sort = 'item_code' and lower(p_direction) = 'asc' then item_code end asc,
      case when p_sort = 'item_code' and lower(p_direction) = 'desc' then item_code end desc,
      case when p_sort = 'category' and lower(p_direction) = 'asc' then category end asc,
      case when p_sort = 'category' and lower(p_direction) = 'desc' then category end desc,
      case when p_sort = 'cost' and lower(p_direction) = 'asc' then cost end asc,
      case when p_sort = 'cost' and lower(p_direction) = 'desc' then cost end desc,
      case when p_sort = 'current_stock' and lower(p_direction) = 'asc' then current_stock end asc,
      case when p_sort = 'current_stock' and lower(p_direction) = 'desc' then current_stock end desc,
      case when (p_sort not in ('item_code', 'category', 'cost', 'current_stock') or p_sort is null) and lower(p_direction) = 'desc' then item_name end desc,
      item_name asc,
      id asc
    ) as sort_position
  from filtered
), ordered_page as (
  select *
  from ranked
  order by
    case when p_sort = 'item_code' and lower(p_direction) = 'asc' then item_code end asc,
    case when p_sort = 'item_code' and lower(p_direction) = 'desc' then item_code end desc,
    case when p_sort = 'category' and lower(p_direction) = 'asc' then category end asc,
    case when p_sort = 'category' and lower(p_direction) = 'desc' then category end desc,
    case when p_sort = 'cost' and lower(p_direction) = 'asc' then cost end asc,
    case when p_sort = 'cost' and lower(p_direction) = 'desc' then cost end desc,
    case when p_sort = 'current_stock' and lower(p_direction) = 'asc' then current_stock end asc,
    case when p_sort = 'current_stock' and lower(p_direction) = 'desc' then current_stock end desc,
    case when (p_sort not in ('item_code', 'category', 'cost', 'current_stock') or p_sort is null) and lower(p_direction) = 'desc' then item_name end desc,
    item_name asc,
    id asc
  limit greatest(1, least(coalesce(p_page_size, 15), 100))
  offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(1, least(coalesce(p_page_size, 15), 100))
), summary as (
  select
    count(*)::integer as total,
    count(*) filter (where deleted_at is null and status::text = 'active')::integer as active,
    count(*) filter (where deleted_at is null and status::text = 'inactive')::integer as inactive,
    count(*) filter (where deleted_at is not null)::integer as archived,
    count(*) filter (where deleted_at is null and is_low_stock)::integer as low_stock
  from item_read_model
), categories as (
  select coalesce(jsonb_agg(category order by category), '[]'::jsonb) as values
  from (select distinct category from item_read_model where nullif(trim(category), '') is not null) facet
)
select jsonb_build_object(
  'rows', coalesce((select jsonb_agg(to_jsonb(page_row) - 'sort_position' order by page_row.sort_position) from ordered_page page_row), '[]'::jsonb),
  'total_rows', (select count(*) from filtered),
  'page', greatest(coalesce(p_page, 1), 1),
  'page_size', greatest(1, least(coalesce(p_page_size, 15), 100)),
  'summary', to_jsonb((select summary from summary)),
  'categories', (select values from categories)
);
$$;

comment on function public.get_items_workspace(text, text, text, uuid, text, text, text, text, integer, integer)
is 'RLS-scoped bounded Items workspace page, facets, and summary.';

grant execute on function public.get_items_workspace(text, text, text, uuid, text, text, text, text, integer, integer) to authenticated;
