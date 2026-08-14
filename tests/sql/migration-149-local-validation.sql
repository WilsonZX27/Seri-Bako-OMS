begin;

insert into public.stock_counts (id, company_id, count_no, count_date, branch_id, status, tolerance_percent, posted_at)
values
  ('14900000-0000-0000-0000-000000000001', '12b0917f-cb90-4224-ab45-7b6bd7a19566', 'M149-OVER', current_date, 'f63a84bd-edb7-46ea-a6cf-ea7d9dbedd8e', 'posted', 5, now()),
  ('14900000-0000-0000-0000-000000000002', '12b0917f-cb90-4224-ab45-7b6bd7a19566', 'M149-SHORT', current_date - 1, 'f63a84bd-edb7-46ea-a6cf-ea7d9dbedd8e', 'posted', 5, now() - interval '1 day'),
  ('14900000-0000-0000-0000-000000000003', '12b0917f-cb90-4224-ab45-7b6bd7a19566', 'M149-WITHIN', current_date - 2, 'f63a84bd-edb7-46ea-a6cf-ea7d9dbedd8e', 'posted', 5, now() - interval '2 days');

insert into public.stock_count_lines (id, stock_count_id, item_id, theoretical_qty, physical_qty, uom)
values
  ('14910000-0000-0000-0000-000000000001', '14900000-0000-0000-0000-000000000001', '98aa0471-863a-4ad6-aa49-de46457815eb', 100, 110, 'KG'),
  ('14910000-0000-0000-0000-000000000002', '14900000-0000-0000-0000-000000000002', '98aa0471-863a-4ad6-aa49-de46457815eb', 100, 90, 'KG'),
  ('14910000-0000-0000-0000-000000000003', '14900000-0000-0000-0000-000000000003', '98aa0471-863a-4ad6-aa49-de46457815eb', 100, 104, 'KG');

do $$
declare
  item_row record;
  branch_row record;
begin
  if (select count(*) from public.get_stock_count_variance_insight(null) where row_kind = 'day') <> 30 then
    raise exception 'Variance insight did not preserve exactly 30 calendar dates.';
  end if;
  if not exists (
    select 1 from public.get_stock_count_variance_insight(null)
    where row_kind = 'day' and record_date = current_date
      and high_variance_count = 1 and shortage_count = 0 and overage_count = 1
  ) then raise exception 'Current-day overage occurrence is incorrect.'; end if;
  if not exists (
    select 1 from public.get_stock_count_variance_insight(null)
    where row_kind = 'day' and record_date = current_date - 1
      and high_variance_count = 1 and shortage_count = 1 and overage_count = 0
  ) then raise exception 'Prior-day shortage occurrence is incorrect.'; end if;
  if not exists (
    select 1 from public.get_stock_count_variance_insight(null)
    where row_kind = 'day' and record_date = current_date - 2 and high_variance_count = 0
  ) then raise exception 'Within-tolerance line was incorrectly classified as high variance.'; end if;

  select * into item_row from public.get_stock_count_variance_insight(null)
  where row_kind = 'item' and entity_id = '98aa0471-863a-4ad6-aa49-de46457815eb';
  if item_row.high_variance_count <> 2 or item_row.shortage_count <> 1 or item_row.overage_count <> 1
    or item_row.latest_variance_percent <> 10 or item_row.latest_variance_qty <> 10 or item_row.latest_uom <> 'KG'
    or item_row.latest_count_id <> '14900000-0000-0000-0000-000000000001' then
    raise exception 'Item recurrence or latest signed variance is incorrect.';
  end if;

  select * into branch_row from public.get_stock_count_variance_insight('f63a84bd-edb7-46ea-a6cf-ea7d9dbedd8e')
  where row_kind = 'branch' and entity_id = 'f63a84bd-edb7-46ea-a6cf-ea7d9dbedd8e';
  if branch_row.high_variance_count <> 2 or branch_row.shortage_count <> 1 or branch_row.overage_count <> 1 then
    raise exception 'Branch recurrence is incorrect.';
  end if;
end $$;

rollback;
