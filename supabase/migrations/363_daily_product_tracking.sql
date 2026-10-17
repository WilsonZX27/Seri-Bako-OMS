-- Operational capture profile is separate from catalogue category and expiry dates.
-- Existing lines keep their original profile when the product master changes.
alter table public.products add column daily_tracking text check (daily_tracking in ('food_daily','food_carryover','beverage','packaging'));
alter table public.outlet_daily_record_lines
 add column daily_tracking text check (daily_tracking in ('food_daily','food_carryover','beverage','packaging')),
 add column usage_qty numeric check (usage_qty >= 0 and usage_qty <= 1000000),
 add column sold_qty numeric check (sold_qty >= 0 and sold_qty <= 1000000);
update public.outlet_daily_record_lines l set daily_tracking=case when lower(trim(p.category))='packaging' then 'packaging' else 'food_daily' end,
 usage_qty=case when lower(trim(p.category))='packaging' and l.wastage_provided then l.wastage_qty end
from public.products p where p.id=l.product_id;
create or replace function public.save_outlet_daily_record(p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid; r public.outlet_daily_records%rowtype; x jsonb; normalized jsonb:='[]'; l public.outlet_daily_record_lines%rowtype; tracking text; consumed numeric;
begin
 if p_record_id is not null then
  select * into r from public.outlet_daily_records where id=p_record_id for update;
  if exists(select 1 from public.outlet_daily_record_lines where record_id=p_record_id and do_managed) and (r.branch_id<>p_branch_id or r.record_date<>p_record_date) then raise exception 'DO-managed daily records cannot change outlet or date.'; end if;
 end if;
 for x in select value from jsonb_array_elements(p_lines) loop
  select * into l from public.outlet_daily_record_lines where record_id=p_record_id and product_id=(x->>'product_id')::uuid;
  select coalesce(l.daily_tracking,p.daily_tracking,case when lower(trim(p.category))='packaging' then 'packaging' else 'food_daily' end)
  into tracking from public.products p where p.id=(x->>'product_id')::uuid;
  if tracking is null then raise exception 'Product not found.'; end if;
  if public.has_permission('outlet_daily_record.update') then
   if x->>'daily_tracking' is distinct from tracking then raise exception 'Daily record category changed. Reload before saving.'; end if;
   consumed:=case when tracking in ('food_carryover','packaging') then nullif(x->>'usage_qty','')::numeric when tracking='beverage' then nullif(x->>'sold_qty','')::numeric else null end;
   if consumed < 0 or consumed > 1000000 or consumed::text in ('NaN','Infinity','-Infinity') then raise exception 'Usage or sold quantity is invalid.'; end if;
   if tracking <> 'food_daily' then
    if p_target_status='evening_completed' and consumed is null then raise exception 'Usage or Qty Sold must be independently confirmed, including zero.'; end if;
    if p_target_status='evening_completed' and tracking in ('packaging','beverage') and not coalesce((x->>'closing_balance_provided')::boolean,false) then raise exception 'Physical balance is required.'; end if;
    x:=x||jsonb_build_object('wastage_qty',0,'wastage_reason',null,'wastage_provided',consumed is not null);
   end if;
  end if;
  x:=x||jsonb_build_object('daily_tracking',tracking);
  if l.do_managed then x:=x||jsonb_build_object('qty_sent',l.qty_sent); end if;
  if public.has_permission('outlet_daily_record.update') and p_target_status='evening_completed' then
   if not coalesce((x->>'morning_received_provided')::boolean,false) then raise exception 'Received must be independently confirmed, including zero.'; end if;
   if not coalesce((x->>'wastage_provided')::boolean,false) then raise exception 'Wastage must be independently confirmed, including zero.'; end if;
  end if;
  normalized:=normalized||jsonb_build_array(x);
 end loop;
 rid:=public.save_outlet_daily_record_before_planning(p_record_id,p_branch_id,p_record_date,p_notes,normalized,p_target_status);
 if public.has_permission('outlet_daily_record.update') then
  for x in select value from jsonb_array_elements(normalized) loop
   update public.outlet_daily_record_lines set stockout=coalesce((x->>'stockout')::boolean,false),stockout_time=nullif(x->>'stockout_time','')::time,
   daily_tracking=x->>'daily_tracking',
   usage_qty=case when x->>'daily_tracking' in ('food_carryover','packaging') then nullif(x->>'usage_qty','')::numeric else null end,
   sold_qty=case when x->>'daily_tracking'='beverage' then nullif(x->>'sold_qty','')::numeric else null end,
   evening_leftover_qty=case when x->>'daily_tracking' in ('packaging','beverage') then coalesce(nullif(x->>'evening_leftover_qty','')::numeric,0) else evening_leftover_qty end,
   wastage_provided=coalesce((x->>'wastage_provided')::boolean,false)
   where record_id=rid and product_id=(x->>'product_id')::uuid;
  end loop;
 end if;
 -- Snapshot newly-created lines even for Kitchen-only entry.
 update public.outlet_daily_record_lines l set daily_tracking=coalesce(p.daily_tracking,case when lower(trim(p.category))='packaging' then 'packaging' else 'food_daily' end)
 from public.products p where l.record_id=rid and l.product_id=p.id and l.daily_tracking is null;
 return rid;
end $$;
revoke all on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) from public,anon;
grant execute on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) to authenticated;
notify pgrst,'reload schema';

-- Add bounded pre-period closing observations. SECURITY INVOKER and existing RLS/grants are preserved.
create or replace function public.get_outlet_packaging_report(p_end_date date, p_days integer default 30)
returns jsonb language sql stable set search_path=public as $$
 with packaging as materialized (
  select id,product_code,product_name,selling_unit from public.products
  where company_id=(select public.current_staff_company_id())
   and coalesce(daily_tracking,case when lower(trim(category))='packaging' then 'packaging' else 'food_daily' end)='packaging' and deleted_at is null
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
 ), opening_records as materialized (
  select r.* from outlets b cross join lateral (
   select id,branch_id,record_date,status from public.outlet_daily_records
   where company_id=(select public.current_staff_company_id()) and branch_id=b.id
    and status in ('evening_completed','reviewed')
    and record_date < p_end_date-(least(greatest(p_days,1),30)-1)
   order by record_date desc limit 1
  ) r
 ), recent_records as materialized (
  select r.id,r.branch_id,r.record_date,r.status from public.outlet_daily_records r
  join outlets b on b.id=r.branch_id
  where r.company_id=(select public.current_staff_company_id())
   and r.status in ('evening_completed','reviewed')
   and r.record_date between p_end_date-(least(greatest(p_days,1),30)-1) and p_end_date
 ), records as materialized (
  select * from latest_records union select * from recent_records union select * from opening_records
 ), report_rows as materialized (
  select r.record_date,r.id record_id,jsonb_build_object(
   'id',r.id::text||':'||p.id::text,'date',r.record_date,'branchId',r.branch_id,
   'branch',b.branch_name,'product',p.product_name,'code',p.product_code,'unit',p.selling_unit,
   'received',case when l.morning_received_provided then l.morning_received_qty else null end,
   'usage',coalesce(l.usage_qty,l.wastage_qty),'closing',l.evening_leftover_qty,'status',r.status
  ) value from records r join public.outlet_daily_record_lines l on l.record_id=r.id
   join packaging p on p.id=l.product_id join outlets b on b.id=r.branch_id
 )
 select jsonb_build_object(
  'today',p_end_date,
  'products',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',product_code,'name',product_name,'unit',selling_unit) order by product_code) from packaging),'[]'::jsonb),
  'outlets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',branch_name) order by branch_name) from outlets),'[]'::jsonb),
  'rows',coalesce((select jsonb_agg(value order by record_date desc,record_id) from report_rows where record_date>=p_end_date-(least(greatest(p_days,1),30)-1)),'[]'::jsonb),
  'opening',coalesce((select jsonb_agg(value order by record_date desc,record_id) from report_rows where record_id in (select id from opening_records)),'[]'::jsonb),
  'latest',coalesce((select jsonb_agg(value order by record_date desc,record_id) from report_rows where record_id in (select id from latest_records)),'[]'::jsonb)
 );
$$;
notify pgrst,'reload schema';

-- Capture profile at insertion (including DO-created lines), not at first edit.
create or replace function public.snapshot_daily_tracking() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.daily_tracking is null then
  select coalesce(daily_tracking,case when lower(trim(category))='packaging' then 'packaging' else 'food_daily' end)
  into new.daily_tracking from public.products where id=new.product_id;
 end if;
 return new;
end $$;
create trigger snapshot_daily_tracking before insert on public.outlet_daily_record_lines
for each row execute function public.snapshot_daily_tracking();
notify pgrst,'reload schema';
