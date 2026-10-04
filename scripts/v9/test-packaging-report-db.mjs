import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE??'@electric-sql/pglite');const db=new PGlite();
const c=randomUUID(),foreign=randomUUID(),auth=randomUUID(),staff=randomUUID(),outlet=randomUUID(),oldOutlet=randomUUID(),otherOutlet=randomUUID(),p=randomUUID(),food=randomUUID();
const q=async(s,args=[]) => (await db.query(s,args)).rows;
try {
 await db.exec(readFileSync('tests/fixtures/production-planning/base.sql','utf8'));
 await q('insert into companies values($1,\'Own\'),($2,\'Foreign\')',[c,foreign]);
 await q("insert into branches(id,company_id,branch_type,branch_name) values($1,$2,'outlet','Current'),($3,$2,'outlet','Old'),($4,$5,'outlet','Foreign')",[outlet,c,oldOutlet,otherOutlet,foreign]);
 await q('insert into staffs(id,company_id,auth_user_id,default_branch_id) values($1,$2,$3,$4)',[staff,c,auth,outlet]);
 await q("insert into products(id,company_id,product_code,product_name,category) values($1,$2,'PKG01','Box','PACKAGING'),($3,$2,'SC01','Cake','STEAMED CAKE')",[p,c,food]);
 await db.exec("create function current_staff_company_id() returns uuid language sql stable security definer as $$ select company_id from staffs where auth_user_id=auth.uid() $$; grant select on all tables in schema public to authenticated; alter table outlet_daily_records enable row level security; create policy visible_record on outlet_daily_records for select to authenticated using(branch_id=(select default_branch_id from staffs where auth_user_id=auth.uid())); alter table outlet_daily_record_lines enable row level security; create policy visible_line on outlet_daily_record_lines for select to authenticated using(exists(select 1 from outlet_daily_records r where r.id=record_id));");
 await db.exec(readFileSync('supabase/migrations/322_outlet_packaging_report.sql','utf8'));
 await q("select set_config('request.jwt.claim.sub',$1,false)",[auth]);
 const add=async(branch,date,status,qty,closing)=>{const r=randomUUID();await q('insert into outlet_daily_records(id,company_id,branch_id,record_date,status) values($1,$2,$3,$4,$5)',[r,branch===otherOutlet?foreign:c,branch,date,status]);await q('insert into outlet_daily_record_lines(record_id,product_id,morning_received_qty,morning_received_provided,wastage_qty,evening_leftover_qty) values($1,$2,0,false,$3,$4)',[r,p,qty,closing]);return r;};
 await add(outlet,'2026-10-03','reviewed',0,0);await add(oldOutlet,'2026-08-01','reviewed',9,12);await add(otherOutlet,'2026-10-03','reviewed',99,99);await add(outlet,'2026-10-02','draft',100,100);
 const report=async()=> (await q("select get_outlet_packaging_report('2026-10-03',30) r"))[0].r;
 const own=await report();assert.equal(own.rows.length,1);assert.equal(own.products.length,1);assert.equal(own.latest.length,2);assert.equal(own.latest.find(x=>x.branchId===oldOutlet).closing,12);assert.equal(own.rows[0].received,null);assert.equal(own.rows[0].usage,0);assert.equal(own.rows[0].closing,0);assert.ok(!own.outlets.some(x=>x.id===otherOutlet));
 // One RPC returns >1,000 rows without PostgREST's table pagination truncation.
 for(let i=0;i<40;i++){const id=randomUUID();await q("insert into products(id,company_id,product_code,product_name,category) values($1,$2,$3,'Box','PACKAGING')",[id,c,'PKG'+(i+2)]);await q('insert into outlet_daily_record_lines(record_id,product_id,wastage_qty) select id,$1,0 from outlet_daily_records where branch_id=$2 and status=\'reviewed\'',[id,outlet]);}
 for(let day=4;day<=29;day++){const r=await add(outlet,`2026-09-${String(day).padStart(2,'0')}`,'reviewed',1,2);await q('insert into outlet_daily_record_lines(record_id,product_id,wastage_qty) select $1,id,0 from products where company_id=$2 and category=\'PACKAGING\' and id<>$3',[r,c,p]);}
 assert.ok((await report()).rows.length>1000);
 await db.exec('set role authenticated');const scoped=await report();assert.ok(scoped.latest.every(x=>x.branchId===outlet));assert.ok(scoped.rows.every(x=>x.branchId===outlet));
 // Compare exact visible line sets before/after the uncorrelated policy candidate.
 const lineSet=async()=> (await q('select record_id::text,product_id::text from outlet_daily_record_lines order by record_id,product_id'));
 const beforeLines=await lineSet();const beforeReport=await report();
 await db.exec('reset role');
 await db.exec(readFileSync('tests/fixtures/packaging/line-policy-candidate.sql','utf8'));
 await db.exec('set role authenticated');
 assert.deepEqual(await lineSet(),beforeLines);assert.deepEqual(await report(),beforeReport);
 // Missing actors cannot gain access through the changed subquery form.
 await q("select set_config('request.jwt.claim.sub',$1,false)",[randomUUID()]);
 assert.equal((await lineSet()).length,0);
 await q("select set_config('request.jwt.claim.sub',$1,false)",[auth]);
 assert.deepEqual(await lineSet(),beforeLines);
 await db.exec('reset role; set role anon');await assert.rejects(report,/permission denied/);
 console.log('Packaging SQL: zeros, missing receipt, old balances, draft exclusion, >1,000 rows, company/branch RLS, anonymous denial and exact line-policy equivalence passed.');
}finally{await db.close();}
