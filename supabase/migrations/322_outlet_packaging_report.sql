-- One bounded, read-only report replaces per-outlet and line-batch HTTP reads.
-- SECURITY INVOKER preserves existing branch/record/line RLS; no new visibility.
create index if not exists outlet_daily_packaging_latest_idx
 on public.outlet_daily_records(company_id,branch_id,record_date desc)
 where status in ('evening_completed','reviewed');

create or replace function public.get_outlet_packaging_report(p_end_date date, p_days integer default 30)
returns jsonb language sql stable set search_path=public as $$
 with packaging as materialized (
  select id,product_code,product_name,selling_unit from public.products
  where company_id=(select public.current_staff_company_id())
   and lower(trim(category))='packaging' and deleted_at is null
 ), outlets as materialized (
  select id,branch_name from public.branches
  where company_id=(select public.current_staff_company_id())
   and branch_type='outlet' and status='active' and deleted_at is null
 ), latest_records as materialized (
  select r.* from outlets b cross join lateral (
   select id,branch_id,record_date,status from public.outlet_daily_records
   where company_id=(select public.current_staff_company_id()) and branch_id=b.id
    and status in ('evening_completed','reviewed') and record_date<=p_end_date
   order by record_date desc limit 1
  ) r
 ), recent_records as materialized (
  select r.id,r.branch_id,r.record_date,r.status from public.outlet_daily_records r
  join outlets b on b.id=r.branch_id
  where r.company_id=(select public.current_staff_company_id())
   and r.status in ('evening_completed','reviewed')
   and r.record_date between p_end_date-(least(greatest(p_days,1),30)-1) and p_end_date
 ), records as materialized (
  select * from latest_records union select * from recent_records
 ), report_rows as materialized (
  select r.record_date,r.id record_id,jsonb_build_object(
   'id',r.id::text||':'||p.id::text,'date',r.record_date,'branchId',r.branch_id,
   'branch',b.branch_name,'product',p.product_name,'code',p.product_code,'unit',p.selling_unit,
   'received',case when l.morning_received_provided then l.morning_received_qty else null end,
   'usage',l.wastage_qty,'closing',l.evening_leftover_qty,'status',r.status
  ) value from records r join public.outlet_daily_record_lines l on l.record_id=r.id
   join packaging p on p.id=l.product_id join outlets b on b.id=r.branch_id
 )
 select jsonb_build_object(
  'today',p_end_date,
  'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',product_code,'name',product_name,'unit',selling_unit) order by product_code) from packaging),'[]'::jsonb),
  'outlets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',branch_name) order by branch_name) from outlets),'[]'::jsonb),
  'rows',coalesce((select jsonb_agg(value order by record_date desc,record_id) from report_rows where record_date>=p_end_date-(least(greatest(p_days,1),30)-1)),'[]'::jsonb),
  'latest',coalesce((select jsonb_agg(value order by record_date desc,record_id) from report_rows where record_id in (select id from latest_records)),'[]'::jsonb)
 );
$$;
revoke all on function public.get_outlet_packaging_report(date,integer) from public,anon;
grant execute on function public.get_outlet_packaging_report(date,integer) to authenticated;
notify pgrst,'reload schema';
