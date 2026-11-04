-- REVIEW ONLY: compatibility rollback pauses carryover writes; retains all data and new column.
-- Does not restore the destructive legacy normalizer. No grants changed.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $guard$
begin
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.save_outlet_daily_record_before_saleable_stock(uuid,uuid,date,text,jsonb,text)') and md5(prosrc)='1d98b1a9716638553f2c2fbd2e302839') then
  raise exception 'Installed carryover function differs; stop before pause.';
 end if;
end $guard$;
create or replace function public.save_outlet_daily_record_before_saleable_stock(p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text)
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
  if tracking='food_carryover' then raise exception 'Next-day Daily editing is temporarily paused; existing values are preserved.'; end if;
  if public.has_permission('outlet_daily_record.update') then
   if x->>'daily_tracking' is distinct from tracking then raise exception 'Daily record category changed. Reload before saving.'; end if;
   if tracking='food_carryover' then
    if not coalesce((x->>'carryover_wastage_entry')::boolean,false) then
     if nullif(x->>'usage_qty','')::numeric is distinct from l.usage_qty then
      raise exception 'Reload the updated Daily form: historical Usage is read only.';
     end if;
     -- Old forms cannot edit the new waste fields or erase existing notes.
     x:=x||jsonb_build_object('wastage_qty',coalesce(l.wastage_qty,0),'wastage_reason',l.wastage_reason,
       'wastage_provided',coalesce(l.carryover_wastage_provided,false),'notes',l.notes);
    end if;
    -- Historical Usage is immutable, including an explicit zero or NULL.
    x:=x||jsonb_build_object('usage_qty',l.usage_qty);
   end if;
   consumed:=case when tracking in ('food_carryover','packaging') then nullif(x->>'usage_qty','')::numeric when tracking='beverage' then nullif(x->>'sold_qty','')::numeric else null end;
   if consumed < 0 or consumed > 1000000 or consumed::text in ('NaN','Infinity','-Infinity') then raise exception 'Usage or sold quantity is invalid.'; end if;
   if tracking in ('packaging','beverage') then
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
   carryover_wastage_provided=case when x->>'daily_tracking'='food_carryover' then coalesce((x->>'wastage_provided')::boolean,false) else carryover_wastage_provided end,
   wastage_provided=coalesce((x->>'wastage_provided')::boolean,false)
   where record_id=rid and product_id=(x->>'product_id')::uuid;
  end loop;
 end if;
 -- Snapshot newly-created lines even for Kitchen-only entry.
 update public.outlet_daily_record_lines snapshot_line set daily_tracking=coalesce(p.daily_tracking,case when lower(trim(p.category))='packaging' then 'packaging' else 'food_daily' end)
 from public.products p where snapshot_line.record_id=rid and snapshot_line.product_id=p.id and snapshot_line.daily_tracking is null;
 return rid;
end $$;
notify pgrst,'reload schema';
commit;
