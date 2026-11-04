const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const db=new PGlite();let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
await db.exec(`
create table products(id uuid primary key,daily_tracking text,category text);
create table outlet_daily_records(id uuid primary key,branch_id uuid,record_date date,status text);
create table outlet_daily_record_lines(record_id uuid,product_id uuid,daily_tracking text,do_managed boolean default false,qty_sent numeric default 0,usage_qty numeric,sold_qty numeric,evening_leftover_qty numeric default 0,wastage_qty numeric default 0,wastage_reason text,wastage_provided boolean default false,stockout boolean default false,stockout_time time,notes text,primary key(record_id,product_id));
create function has_permission(text) returns boolean language sql as $$ select coalesce(current_setting('test.can_edit',true),'on')='on' $$;
create function save_outlet_daily_record_before_planning(rid uuid,b uuid,d date,n text,lines jsonb,status text) returns uuid language plpgsql as $$ declare x jsonb; begin
 if not has_permission('outlet_daily_record.update') then raise exception 'Denied by base'; end if;
 if exists(select 1 from outlet_daily_records where id=rid and outlet_daily_records.status='reviewed') then raise exception 'Posted base record locked'; end if;
 for x in select value from jsonb_array_elements(lines) loop
 insert into outlet_daily_record_lines(record_id,product_id,wastage_qty,wastage_reason,notes) values(rid,(x->>'product_id')::uuid,(x->>'wastage_qty')::numeric,x->>'wastage_reason',x->>'notes') on conflict(record_id,product_id) do update set wastage_qty=excluded.wastage_qty,wastage_reason=excluded.wastage_reason,notes=excluded.notes;
 end loop; return rid; end $$;
insert into products values('00000000-0000-0000-0000-000000000001','food_carryover','food'),('00000000-0000-0000-0000-000000000002','food_carryover','food'),('00000000-0000-0000-0000-000000000003','food_daily','food');
insert into outlet_daily_records values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020','2026-11-02','draft');
insert into outlet_daily_record_lines(record_id,product_id,daily_tracking,usage_qty) values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','food_carryover',5);
`);
const root=process.argv[2],migration=fs.readFileSync(root+'/supabase/migrations/363_daily_product_tracking.sql','utf8');
const start=migration.indexOf('create or replace function public.save_outlet_daily_record(');const old=migration.slice(start,migration.indexOf('end $$;',start)+7).replace('function public.save_outlet_daily_record(', 'function public.save_outlet_daily_record_before_saleable_stock(');
await db.exec(old);await db.exec(fs.readFileSync(root+'/sql-candidates/outlet_daily_carryover_wastage.REVIEW.sql','utf8'));
const read=async id=>(await db.query('select usage_qty,wastage_qty,wastage_reason,carryover_wastage_provided,notes from outlet_daily_record_lines where product_id=$1',[id])).rows[0];
const one='00000000-0000-0000-0000-000000000001',two='00000000-0000-0000-0000-000000000002';
const input={product_id:one,daily_tracking:'food_carryover',carryover_wastage_entry:true,wastage_qty:2,wastage_reason:'damaged',wastage_provided:true,morning_received_provided:true,usage_qty:999,notes:'retain note'};
const save=async(payload,status='draft')=>db.query(`select save_outlet_daily_record_before_saleable_stock('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020','2026-11-02',null,$1::jsonb,$2)`,[JSON.stringify([payload]),status]);
await save(input,'evening_completed');eq(await read(one),{usage_qty:'5',wastage_qty:'2',wastage_reason:'damaged',carryover_wastage_provided:true,notes:'retain note'});
await save({...input,product_id:two,usage_qty:null});eq((await read(two)).usage_qty,null);
await save({...input,wastage_qty:0,wastage_reason:null});eq((await read(one)).wastage_qty,'0');eq((await read(one)).carryover_wastage_provided,true);
await save({...input,wastage_qty:0,wastage_reason:null,wastage_provided:false});eq((await read(one)).carryover_wastage_provided,false);
let before=await read(one);await assert.rejects(()=>save({...input,carryover_wastage_entry:false}),/Reload/);checks++;eq(await read(one),before);
await assert.rejects(()=>save({...input,wastage_provided:false},'evening_completed'),/Wastage must/);checks++;eq(await read(one),before);
await db.exec("update outlet_daily_record_lines set usage_qty=0 where product_id='"+one+"'");await save(input);eq((await read(one)).usage_qty,'0');
await db.exec("set test.can_edit='off'");before=await read(one);await assert.rejects(()=>save(input),/Denied by base/);checks++;eq(await read(one),before);await db.exec("set test.can_edit='on'");
await db.exec("update outlet_daily_records set status='reviewed'");await assert.rejects(()=>save(input),/locked/);checks++;eq(await read(one),before);
console.log(`${checks} isolated tracking-wrapper assertions passed (base authorization/locking stubbed; not full RPC/RLS acceptance)`);await db.close();
})().catch(error=>{console.error(error);process.exit(1)});
