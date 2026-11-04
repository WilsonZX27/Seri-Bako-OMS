const {PGlite}=require('@electric-sql/pglite');const fs=require('fs');const assert=require('assert/strict');
(async()=>{const db=new PGlite();let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++};
await db.exec(`create table outlet_daily_records(id text,status text,record_date date);create table products(id text,category text,status text,available_from date,available_until date);create table outlet_daily_record_lines(id text,record_id text,product_id text,daily_tracking text,qty_sent_source text,qty_sent_confirmed boolean,morning_received_provided boolean,wastage_provided boolean,do_managed boolean,stockout boolean,qty_sent numeric,morning_received_qty numeric,evening_leftover_qty numeric,wastage_qty numeric,qty_sent_estimated numeric,usage_qty numeric,sold_qty numeric,saleable_next_day_qty numeric,wastage_reason text,notes text,stockout_time text);insert into outlet_daily_records values('r','reviewed','2026-11-02');insert into products values('real','food','active',null,null),('moon','food','active',null,'2026-10-01');insert into outlet_daily_record_lines(id,record_id,product_id,daily_tracking,qty_sent_source,qty_sent_confirmed,morning_received_provided,qty_sent,morning_received_qty,wastage_qty) values('real','r','real','food_daily','authorized_confirmed',true,true,4,4,1),('moon','r','moon','food_daily','unavailable',false,false,0,0,0);`);
const root=process.argv[2];for(const file of ['310_outlet_daily_today_summary.sql','332_outlet_daily_completed_summary.sql']){const s=fs.readFileSync(root+'/supabase/migrations/'+file,'utf8');await db.exec(s.slice(s.indexOf('create or replace'),s.indexOf('$$;')+3))}
const get=async name=>(await db.query(`select * from ${name}('2026-11-02')`)).rows[0];
for(const n of ['get_outlet_daily_today_summary','get_outlet_daily_completed_summary'])eq((await get(n)).today_received_unavailable,1);
const before=JSON.stringify((await db.query('select * from outlet_daily_record_lines order by id')).rows);
await db.exec(fs.readFileSync(root+'/sql-candidates/outlet_daily_empty_history_summary.REVIEW.sql','utf8'));
for(const n of ['get_outlet_daily_today_summary','get_outlet_daily_completed_summary']){const r=await get(n);eq(r.today_received_unavailable,0);eq(r.today_received,'4');eq(r.today_sent,null);eq(r.posted_today,1)}
eq(JSON.stringify((await db.query('select * from outlet_daily_record_lines order by id')).rows),before);
for(const set of ["notes='keep'","qty_sent=2","morning_received_provided=true","do_managed=true","wastage_qty=1"]){await db.exec('begin');await db.exec(`update outlet_daily_record_lines set ${set} where id='moon'`);eq((await get('get_outlet_daily_today_summary')).today_received_unavailable,set.includes('morning_received_provided')?0:1);await db.exec('rollback')}
await db.exec("update products set available_until='2026-11-02' where id='moon'");eq((await get('get_outlet_daily_today_summary')).today_received_unavailable,1);
await db.exec("update products set available_until='2026-10-01' where id='moon'");
const preRollback=JSON.stringify((await db.query('select * from outlet_daily_record_lines order by id')).rows);
await db.exec(fs.readFileSync(root+'/sql-candidates/outlet_daily_empty_history_summary.ROLLBACK.sql','utf8'));
for(const n of ['get_outlet_daily_today_summary','get_outlet_daily_completed_summary'])eq((await get(n)).today_received_unavailable,1);
eq(JSON.stringify((await db.query('select * from outlet_daily_record_lines order by id')).rows),preRollback);
console.log(`${checks} isolated PostgreSQL assertions passed`);await db.close()})().catch(e=>{console.error(e);process.exit(1)});
