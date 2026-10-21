-- Explicit physical stock, not the legacy default-zero evening balance.
alter table public.outlet_daily_record_lines add column saleable_next_day_qty numeric
 check(saleable_next_day_qty>=0 and saleable_next_day_qty<=1000000 and saleable_next_day_qty::text not in ('NaN','Infinity','-Infinity'));

alter function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) rename to save_outlet_daily_record_before_saleable_stock;
revoke all on function public.save_outlet_daily_record_before_saleable_stock(uuid,uuid,date,text,jsonb,text) from public,anon,authenticated;
create function public.save_outlet_daily_record(p_record_id uuid,p_branch_id uuid,p_record_date date,p_notes text,p_lines jsonb,p_target_status text)
returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid; x jsonb; qty numeric;
begin
 -- Existing function owns authorization, record scope, role boundaries and status transitions.
 rid:=public.save_outlet_daily_record_before_saleable_stock(p_record_id,p_branch_id,p_record_date,p_notes,p_lines,p_target_status);
 if public.has_permission('outlet_daily_record.update') then
  for x in select value from jsonb_array_elements(p_lines) loop
   if x ? 'saleable_next_day_qty' then
    qty:=nullif(x->>'saleable_next_day_qty','')::numeric;
    if qty<0 or qty>1000000 or qty::text in ('NaN','Infinity','-Infinity') then raise exception 'Saleable tomorrow count is invalid.'; end if;
    if qty is not null and not exists(select 1 from public.products p join public.outlet_daily_record_lines l on l.product_id=p.id where l.record_id=rid and l.product_id=(x->>'product_id')::uuid and p.daily_tracking='food_carryover' and l.daily_tracking='food_carryover') then
     raise exception 'Only Next day products can have saleable tomorrow stock.';
    end if;
    update public.outlet_daily_record_lines set saleable_next_day_qty=qty where record_id=rid and product_id=(x->>'product_id')::uuid;
   end if;
  end loop;
 end if;
 return rid;
end $$;
revoke all on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) from public,anon;
grant execute on function public.save_outlet_daily_record(uuid,uuid,date,text,jsonb,text) to authenticated;

-- A saved stock deduction must still match its source before a plan can be released.
create function public.guard_production_carryover_snapshot() returns trigger
language plpgsql security definer set search_path=public as $$
declare a record; stock numeric; classification text;
begin
 if new.status not in ('submitted','approved') or old.status=new.status then return new; end if;
 for a in select * from public.production_plan_allocations where plan_id=new.id and evidence ? 'carryover' loop
  select daily_tracking into classification from public.products where id=a.product_id and company_id=new.company_id;
  if classification is distinct from 'food_carryover' then raise exception 'Product expiry classification changed. Recalculate the draft.'; end if;
  stock:=null;
  select l.saleable_next_day_qty into stock from public.outlet_daily_records r join public.outlet_daily_record_lines l on l.record_id=r.id
   where r.company_id=new.company_id and r.branch_id=a.branch_id and r.record_date=new.delivery_date-1
    and r.status in ('evening_completed','reviewed') and l.product_id=a.product_id and l.daily_tracking='food_carryover';
  if stock is distinct from nullif(a.evidence->'carryover'->>'available','')::numeric then raise exception 'Yesterday saleable stock changed. Recalculate before submitting or approving.'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.guard_production_carryover_snapshot() from public,anon,authenticated;
create trigger guard_production_carryover_snapshot before update of status on public.production_plans
 for each row execute function public.guard_production_carryover_snapshot();
notify pgrst,'reload schema';
