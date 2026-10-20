-- Isolated fictional audit fixture ONLY; never production.
-- Run: docker exec -i oms-audit-full-db psql -U postgres -d postgres < tests/sql/final-audit-daily-save-regression.sql
-- Uses existing fixture IDs; no schema replacement; every mutation ROLLBACK.
-- Regression for migration363 row-variable/table-alias ambiguity plus362/363 persistence semantics.
\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub',(select auth_user_id::text from staffs where id='30000000-0000-4000-8000-000000000001'),true) is not null as identity_set;
set local role authenticated;
do $$
declare rid uuid:='b2100000-0000-4000-8000-000000000003'; branch uuid:='b1500000-0000-4000-8000-000000000001'; lines jsonb; channels jsonb; changed jsonb; p jsonb; n integer; total numeric;
begin
 select jsonb_agg(jsonb_build_object('product_id',id,'daily_tracking',coalesce(daily_tracking,'food_daily'),'qty_sent',10,'morning_received_qty',10,'morning_received_provided',true,'wastage_qty',0,'wastage_provided',true,'usage_qty',case when daily_tracking in ('food_carryover','packaging') then 0 end,'sold_qty',case when daily_tracking='beverage' then 0 end,'evening_leftover_qty',10,'closing_balance_provided',true)) into lines from products where product_code in ('AUDIT-B08-BUN','FICTIONAL-CARRY','FICTIONAL-DRINK','FICTIONAL-PACK');
 if jsonb_array_length(lines)<>4 then raise exception 'fixture missing'; end if;
 select jsonb_agg(jsonb_build_object('channel',c,'amount',case when c='voucher' then 3 when c='credit_card' then 7 else 0 end)) into channels from unnest(array['visa','master','debit','union_pay','alipay','jcb','feedme_card','duitnow','bank_transfer','feedme_wallet','grabfood','foodpanda','shopee_food','voucher','credit_card']) c;
 perform save_outlet_daily_record_v92(rid,branch,'2026-10-17','rollback fixture',lines,'draft',10,channels,null);
 select count(*),sum(amount) into n,total from outlet_daily_sales_breakdowns where record_id=rid;
 if n<>15 or total<>10 then raise exception 'tender readback mismatch'; end if;
 if (select count(distinct daily_tracking) from outlet_daily_record_lines where record_id=rid)<>4 then raise exception 'profile snapshot mismatch'; end if;
 raise notice 'PASS 15 tender channels preserve Voucher3+legacy CreditCard7 separately; four profiles saved/read back';
 perform save_outlet_daily_record_v92(rid,branch,'2026-10-17','rollback fixture',lines,'draft',null,'[]',null);
 if (select sum(amount) from outlet_daily_sales_breakdowns where record_id=rid)<>10 then raise exception 'blank POS erased tenders'; end if;
 raise notice 'PASS blank POS preserves existing tender values';
 begin
  perform save_outlet_daily_record_v92(rid,branch,'2026-10-17','should rollback',lines,'draft',-1,channels,null);
  raise exception 'FAIL negative POS accepted';
 exception when others then if sqlerrm not like '%cannot be negative%' then raise; end if; end;
 if (select notes from outlet_daily_records where id=rid)='should rollback' then raise exception 'failed tender operation partially saved'; end if;
 raise notice 'PASS negative POS rejects and rolls back underlying record update';
 select jsonb_agg(case when x->>'daily_tracking'='beverage' then x-'sold_qty' else x end) into changed from jsonb_array_elements(lines) x;
 begin
  perform save_outlet_daily_record(rid,branch,'2026-10-17',null,changed,'evening_completed');
  raise exception 'FAIL blank sold accepted';
 exception when others then if sqlerrm not like '%independently confirmed%' then raise; end if; end;
 select jsonb_agg(case when x->>'daily_tracking'='packaging' then x||'{"closing_balance_provided":false}'::jsonb else x end) into changed from jsonb_array_elements(lines) x;
 begin
  perform save_outlet_daily_record(rid,branch,'2026-10-17',null,changed,'evening_completed');
  raise exception 'FAIL blank closing accepted';
 exception when others then if sqlerrm not like '%Physical balance is required%' then raise; end if; end;
 raise notice 'PASS missing sold quantity and missing physical closing block completion';
 perform save_outlet_daily_record_v92(rid,branch,'2026-10-17','rollback fixture',lines,'evening_completed',11,channels,null);
 if (select status::text from outlet_daily_records where id=rid)<>'evening_completed' or (select sales_review_status from outlet_daily_records where id=rid)<>'needs_review' then raise exception 'completion/reconciliation mismatch'; end if;
 if (select count(*) from outlet_daily_record_lines where record_id=rid and ((daily_tracking in ('packaging','food_carryover') and usage_qty=0) or (daily_tracking='beverage' and sold_qty=0)))<>3 then raise exception 'zero quantities lost'; end if;
 raise notice 'PASS explicit-zero usage/sold completes; tender variance becomes needs_review without blocking';

 select jsonb_agg(case when x->>'daily_tracking'='food_carryover' then x||'{"usage_qty":-1}'::jsonb else x end) into changed from jsonb_array_elements(lines) x;
 begin
  perform save_outlet_daily_record(rid,branch,'2026-10-17',null,changed,'evening_completed');
  raise exception 'FAIL negative usage accepted';
 exception when others then if sqlerrm not like '%Usage or sold quantity is invalid%' then raise; end if; end;
 select jsonb_agg(case when x->>'daily_tracking'='food_carryover' then x||'{"daily_tracking":"beverage"}'::jsonb else x end) into changed from jsonb_array_elements(lines) x;
 begin
  perform save_outlet_daily_record(rid,branch,'2026-10-17',null,changed,'evening_completed');
  raise exception 'FAIL altered line profile accepted';
 exception when others then if sqlerrm not like '%category changed%' then raise; end if; end;
 begin
  perform save_outlet_daily_record_v92(rid,branch,'2026-10-17',null,lines,'evening_completed',10,channels-0,null);
  raise exception 'FAIL missing channel accepted';
 exception when others then if sqlerrm not like '%All sales channels are required%' then raise; end if; end;
 select jsonb_agg(case when x->>'channel'='visa' then x||'{"channel":"master"}'::jsonb else x end) into changed from jsonb_array_elements(channels) x;
 begin
  perform save_outlet_daily_record_v92(rid,branch,'2026-10-17',null,lines,'evening_completed',10,changed,null);
  raise exception 'FAIL duplicate channel accepted';
 exception when unique_violation then null; end;
 if (select count(*) from outlet_daily_sales_breakdowns where record_id=rid)<>15 then raise exception 'rejected channels partially deleted existing tenders'; end if;
 raise notice 'PASS negative usage, changed line profile, missing/duplicate channels reject atomically';
 p:=get_outlet_packaging_report('2026-10-17',30);
 if jsonb_array_length(p->'rows')<1 then raise exception 'packaging report missing saved row'; end if;
 raise notice 'PASS packaging report returns saved completed fixture';
end $$;
reset role;
rollback;
