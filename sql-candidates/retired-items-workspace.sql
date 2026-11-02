-- Local candidate only; assign migration number after production compatibility review.
create or replace function public.get_retired_items_workspace(p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public as $$
declare result jsonb;
  stock_filter text := coalesce(p_filters->>'low_stock','all');
  control_filter text := coalesce(p_filters->>'stock_control','all');
  sort_key text := coalesce(p_filters->>'sort','retired_at');
  direction text := coalesce(p_filters->>'dir','desc');
  requested_page integer := 1;
begin
  if stock_filter not in ('all','yes','no') or control_filter not in ('all','with_safety_stock','without_safety_stock') then
    raise exception 'Unsupported stock filter.' using errcode='22023';
  end if;
  if stock_filter <> 'all' and not public.has_any_permission(array['inventory.read','stock_balance.read','low_stock.view']) then
    raise exception 'Inventory read access is required for the stock-level filter.' using errcode='42501';
  end if;
  if sort_key not in ('retired_at','item_code','item_name','branch_name') then sort_key := 'retired_at'; end if;
  if direction not in ('asc','desc') then direction := 'desc'; end if;
  if coalesce(p_filters->>'page','') ~ '^[0-9]{1,8}$' then requested_page := greatest((p_filters->>'page')::integer,1); end if;
  with visible_stock as (
    select item_id, bool_or(is_low_stock) as is_low_stock
    from public.stock_balances_summary
    where stock_filter <> 'all'
    group by item_id
  ), filtered as (
    select scope.id, scope.item_id, scope.branch_id, scope.retirement_reason,
      scope.retirement_note, scope.last_physical_qty, scope.retired_at,
      i.item_code, i.item_name, b.branch_name,
      case when i.id is not null then jsonb_build_object('item_code',i.item_code,'item_name',i.item_name,'base_unit',i.base_unit) end as item,
      case when b.id is not null then jsonb_build_object('branch_name',b.branch_name) end as branch
    from public.branch_stock_count_items scope
    left join public.items i on i.id=scope.item_id and i.company_id=scope.company_id
    left join public.branches b on b.id=scope.branch_id and b.company_id=scope.company_id
    left join public.suppliers supplier on supplier.id=i.supplier_id and supplier.company_id=scope.company_id
    left join visible_stock stock on stock.item_id=scope.item_id
    where scope.status='retired' and scope.company_id=public.current_staff_company_id()
      and (nullif(trim(p_filters->>'search'),'') is null or
        strpos(lower(concat_ws(' ',i.item_code,i.item_name,i.autocount_code,to_jsonb(i)->>'brand_name',i.category,supplier.name,b.branch_name)),lower(trim(p_filters->>'search')))>0)
      and (coalesce(p_filters->>'supplier','all') in ('','all') or i.supplier_id::text=p_filters->>'supplier')
      and (control_filter='all' or control_filter='with_safety_stock' and i.safety_stock>0 or control_filter='without_safety_stock' and i.safety_stock=0)
      -- No visible summary row is unknown, never classified as healthy.
      and (stock_filter='all' or stock_filter='yes' and stock.is_low_stock is true or stock_filter='no' and stock.is_low_stock is false)
  ), totals as (
    select count(*) as total_rows, greatest(ceil(count(*)/15.0)::integer,1) as total_pages from filtered
  ), bounds as (
    select *,least(requested_page,total_pages) as page from totals
  ), ranked as (
    select filtered.*,row_number() over(order by
      case when sort_key='retired_at' and direction='desc' then retired_at end desc nulls last,
      case when sort_key='retired_at' and direction='asc' then retired_at end asc nulls last,
      case when sort_key='item_code' and direction='asc' then public.natural_sort_key(item_code) end asc nulls last,
      case when sort_key='item_code' and direction='desc' then public.natural_sort_key(item_code) end desc nulls last,
      case when sort_key='item_name' and direction='asc' then item_name end asc nulls last,
      case when sort_key='item_name' and direction='desc' then item_name end desc nulls last,
      case when sort_key='branch_name' and direction='asc' then branch_name end asc nulls last,
      case when sort_key='branch_name' and direction='desc' then branch_name end desc nulls last,
      id asc) as position from filtered
  ), page_rows as (
    select ranked.* from ranked,bounds where position>(page-1)*15 and position<=page*15 order by position
  ) select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(r)-'position'-'item_code'-'item_name'-'branch_name' order by position) from page_rows r),'[]'::jsonb),
    'total_rows',total_rows,'page',page,'page_size',15,'total_pages',total_pages
  ) into result from bounds;
  return result;
end $$;
revoke all on function public.get_retired_items_workspace(jsonb) from public,anon,service_role;
grant execute on function public.get_retired_items_workspace(jsonb) to authenticated;
