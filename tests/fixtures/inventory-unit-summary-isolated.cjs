const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
const db=new PGlite();let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
await db.exec(`
create role authenticated;
create table branches(id text,company_id text);
create table items(id text,item_code text,item_name text,base_unit text);
create table inventory_daily_summary(company_id text,branch_id text,item_id text,transaction_date date,transaction_type text,quantity_in numeric,quantity_out numeric,movement_count int);
create table stock_balances_summary(company_id text,branch_id text,item_id text,status text,is_low_stock boolean,current_qty numeric,inventory_value numeric,shortage_quantity numeric,item_name text);
create table goods_receivings(branch_id text,received_date date,deleted_at timestamp);
create table stock_counts(branch_id text,status text,deleted_at timestamp);
create function can_access_inventory_branch(text,text) returns boolean language sql stable as $$ select $1=current_setting('test.company') and $2=current_setting('test.branch') $$;
alter table inventory_daily_summary enable row level security;
create policy scoped on inventory_daily_summary to authenticated using(can_access_inventory_branch(company_id,branch_id));
grant select on all tables in schema public to authenticated;
insert into branches values ('b1','c1'),('b2','c1'),('b3','c2');
insert into items values('a','A','Same name','KG'),('b','B','Same name','LITRE'),('c','C','Flour','KG');
insert into inventory_daily_summary values
('c1','b1','a',current_date,'purchase',2.75,0,4),
('c1','b1','a',current_date-1,'purchase',1.25,0,1),
('c1','b1','b',current_date,'purchase',1000,0,2),
('c1','b1','c',current_date,'purchase',0,0,8),
('c1','b2','a',current_date,'purchase',9999,0,99),
('c2','b3','b',current_date,'purchase',8888,0,88),
('c1','b1','a',current_date-60,'purchase',7777,0,77),
('c1','b1','a',current_date,'production_usage',0,1.5,3),
('c1','b1','b',current_date,'production_usage',0,7,1),
('c1','b1','a',current_date,'wastage',0,999,99);
`);
const before=JSON.stringify((await db.query('select * from inventory_daily_summary order by company_id,branch_id,item_id,transaction_date,transaction_type')).rows);
const baseline=fs.readFileSync('supabase/migrations/138_inventory_daily_summary.sql','utf8').split('create or replace function public.get_inventory_dashboard_summary')[1].split('$$;')[0];
await db.exec('create or replace function public.get_inventory_dashboard_summary'+baseline+'$$;');
await db.exec('revoke all on function get_inventory_dashboard_summary(text) from public;grant execute on function get_inventory_dashboard_summary(text) to authenticated;');
const metadata=async()=> (await db.query("select proacl::text,proowner,prosecdef,proconfig from pg_proc where oid='get_inventory_dashboard_summary(text)'::regprocedure")).rows;
const aclBefore=await metadata();
await db.exec(fs.readFileSync('sql-candidates/inventory_item_unit_summary.REVIEW.sql','utf8'));
eq(await metadata(),aclBefore);
await db.exec("revoke all on function get_inventory_dashboard_summary(text) from public;grant execute on function get_inventory_dashboard_summary(text) to authenticated;set role authenticated;set test.company='c1';set test.branch='b1';");
const get=async()=> (await db.query("select get_inventory_dashboard_summary('7d') as result")).rows[0].result;
let r=await get();eq(r.top_purchased_items.length,2);eq(r.top_purchased_items.map(x=>x.item_id),['a','b']);eq(r.top_purchased_items.map(x=>x.qty),[4,1000]);eq(r.top_purchased_items.map(x=>x.base_unit),['KG','LITRE']);eq(r.top_purchased_items[0].movement_count,5);eq(r.top_consumed_items.map(x=>x.qty),[1.5,7]);eq(r.top_consumed_items.map(x=>x.item_id),['a','b']);eq(r.top_purchased_items.map(x=>x.name),['Same name','Same name']);
await db.exec("set test.branch='b2'");r=await get();eq(r.top_purchased_items.map(x=>x.qty),[9999]);eq(r.top_consumed_items,[]);
await db.exec("set test.branch='b3'");r=await get();eq(r.top_purchased_items,[]);
await db.exec("reset role");eq(JSON.stringify((await db.query('select * from inventory_daily_summary order by company_id,branch_id,item_id,transaction_date,transaction_type')).rows),before);
eq((await db.query("select prosecdef from pg_proc where oid='get_inventory_dashboard_summary(text)'::regprocedure")).rows[0].prosecdef,false);
eq((await db.query("select relrowsecurity from pg_class where oid='inventory_daily_summary'::regclass")).rows[0].relrowsecurity,true);
console.log(`${checks} isolated PostgreSQL assertions passed`);await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
