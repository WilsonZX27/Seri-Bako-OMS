import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { PGlite }=await import(pathToFileURL(process.env.PGLITE_MODULE));
const db=new PGlite(), id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
try{
 const fixture=await fs.readFile('scripts/assets/test-asset-db.mjs','utf8');
 await db.exec(fixture.split('await db.exec(`')[1].split('`);')[0]);
 await db.exec(await fs.readFile('supabase/migrations/337_asset_management_foundation.sql','utf8'));
 await db.query('insert into companies values($1)',[id(1)]);
 await db.query("insert into asset_import_batches(id,company_id,source_sha256,reconciliation,state) values($1,$2,$3,'{}','rehearsal')",[id(10),id(1),'a'.repeat(64)]);
 await db.query("insert into assets(id,company_id,asset_code,item_name,import_batch_id) values($1,$2,'SB-SYNTHETIC','Synthetic',$3)",[id(20),id(1),id(10)]);
 await db.query("insert into asset_attachments(id,company_id,asset_id,source_key,url,source_data) values($1,$2,$3,'Attachments:2','https://source.invalid/photo',$4)",[id(30),id(1),id(20),JSON.stringify({'File Name':'Original photo','Uploaded By':'Original author','Uploaded Date':'2026-10-01T09:00:00'})]);
 const args=[id(1),id(30),'a'.repeat(64),'Attachments:2','https://source.invalid/photo',id(20),null,null,'image/jpeg'];
 const target=()=>db.query('select legacy_asset_attachment_target($1,$2,$3,$4,$5,$6,$7,$8,$9) path',args);
 const path=`${id(1)}/${id(20)}/legacy-${id(30)}.jpg`,verify=(sha='b'.repeat(64),p=path)=>db.query('select verify_legacy_asset_attachment($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) valid',[...args,p,sha]);
 await db.exec('set role authenticated');await assert.rejects(target,/permission denied/);await assert.rejects(verify,/permission denied/);
 await db.exec('reset role;set role service_role');assert.equal((await target()).rows[0].path,path);
 for(const [index,value] of [[0,id(2)],[2,'c'.repeat(64)],[3,'Attachments:3'],[4,'https://source.invalid/changed'],[5,id(21)],[6,id(99)],[7,id(98)],[8,'text/html']]){const old=args[index];args[index]=value;await assert.rejects(target);args[index]=old;}
 await assert.rejects(verify,/copy mismatch/);
 await db.exec('reset role');await db.query("insert into storage.objects(bucket_id,name) values('asset-documents',$1)",[path]);
 await db.exec('set role service_role');await assert.rejects(()=>verify('bad'),/copy mismatch/);await assert.rejects(()=>verify('b'.repeat(64),path+'/other'),/copy mismatch/);
 assert.equal((await verify()).rows[0].valid,true);assert.equal((await verify()).rows[0].valid,true);await assert.rejects(()=>verify('c'.repeat(64)),/verification changed/);
 await db.exec('reset role');const row=(await db.query('select source_data,verified_at,content_sha256 from asset_attachments where id=$1',[id(30)])).rows[0];assert.equal(row.source_data['Uploaded By'],'Original author');assert.equal(row.source_data['Uploaded Date'],'2026-10-01T09:00:00');assert.equal(row.content_sha256,'b'.repeat(64));assert.ok(row.verified_at);
 assert.equal((await db.query('select state from asset_import_batches where id=$1',[id(10)])).rows[0].state,'rehearsal');
 await db.query("update asset_import_batches set state='live' where id=$1",[id(10)]);await db.exec('set role service_role');await assert.rejects(target,/inactive source batch/);
 console.log('Legacy attachment database checks passed: exact source/parent binding, service-only verification, storage existence, immutable authors/dates, consistent retries and no activation.');
}finally{await db.close();}
