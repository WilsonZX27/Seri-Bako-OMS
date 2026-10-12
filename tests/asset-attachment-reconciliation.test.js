const test=require('node:test'), assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const load=()=>import('../scripts/assets/reconcile-attachments.mjs');
function fixture(){
 const tables=['asset_import_batches','asset_locations','assets','asset_master_updates','asset_holdings','asset_maintenance','asset_maintenance_updates','asset_daily_checks','asset_transfers','asset_transfer_updates','asset_attachments','asset_suppliers','asset_calendar_days'];
 const company='00000000-0000-4000-8000-000000000001', asset='00000000-0000-4000-8000-000000000002',parent='00000000-0000-4000-8000-000000000003';
 const payload=Object.fromEntries(tables.map(t=>[t,[]])), hash='a'.repeat(64),url='https://drive.google.com/file/d/test_file/view',folder='https://drive.google.com/drive/folders/test_folder';
 payload.asset_import_batches=[{id:'00000000-0000-4000-8000-000000000004',company_id:company,source_sha256:hash,state:'rehearsal'}];
 payload.asset_attachments=[{id:'00000000-0000-4000-8000-000000000005',company_id:company,asset_id:asset,maintenance_id:parent,location_id:asset,source_key:'Attachments:2',url,source_data:{'Drive Folder URL':folder}}];
 const snapshot={source_sha256:hash,attachments:[{table:'Attachments',row:2,field:'File URL',url},{table:'Maintenance Requests',row:2,field:'Issue Photo URL',url:'https://drive.google.com/open?id=test_file'},{table:'Attachments',row:2,field:'Drive Folder URL',url:folder}]};
 const bytes=Buffer.from([255,216,255,1]);
 const evidence={source_sha256:hash,files:[{source_url:url,local_path:'/tmp/synthetic-image.jpg',sha256:createHash('sha256').update(bytes).digest('hex'),mime_type:'image/jpeg'}],folders:[{source_url:folder,reviewed_by:'Synthetic reviewer',reviewed_at:'2026-10-08T09:00:00+08:00',file_urls:[url]}]};
 return {payload,snapshot,evidence,bytes};
}
test('offline attachment reconciliation preserves typed parents and resolves aliases without network or cutover',async()=>{
 const {reconcileAttachments}=await load(), f=fixture();let reads=0;
 const result=await reconcileAttachments(f.snapshot,f.payload,f.evidence,async file=>{reads++;assert.equal(file,'/tmp/synthetic-image.jpg');return f.bytes;});
 assert.equal(reads,1);assert.equal(result.summary.original_references,3);assert.equal(result.summary.verified_local_files,1);assert.equal(result.summary.ready_for_storage_copy,true);assert.equal(result.summary.ready_for_cutover,false);assert.equal(result.attachments[0].maintenance_id,f.payload.asset_attachments[0].maintenance_id);
});
test('missing files and unreviewed folders remain explicit unresolved evidence',async()=>{
 const {reconcileAttachments}=await load(),f=fixture();f.evidence.files=[];f.evidence.folders=[];
 const result=await reconcileAttachments(f.snapshot,f.payload,f.evidence,()=>assert.fail('No supplied files to read'));
 assert.equal(result.summary.unresolved,3);assert.equal(result.summary.ready_for_storage_copy,false);
});
test('changed exports, wrong bytes, misleading MIME and duplicate aliases cannot be approved',async()=>{
 const {reconcileAttachments}=await load();
 for(const change of [f=>{f.evidence.source_sha256='b'.repeat(64);},f=>{f.evidence.files[0].sha256='b'.repeat(64);},f=>{f.evidence.files[0].mime_type='application/pdf';},f=>{f.evidence.files.push({...f.evidence.files[0],source_url:'https://drive.google.com/open?id=test_file'});}]){const f=fixture();change(f);await assert.rejects(()=>reconcileAttachments(f.snapshot,f.payload,f.evidence,async()=>f.bytes));}
});
test('reviewed folders must contain linked files and cannot hide unimported files',async()=>{
 const {reconcileAttachments}=await load(),f=fixture();f.evidence.folders[0].file_urls=[];
 let result=await reconcileAttachments(f.snapshot,f.payload,f.evidence,async()=>f.bytes);assert.equal(result.summary.ready_for_storage_copy,false);assert.match(result.issues[0].reason,/omits/);
 f.evidence.folders[0].file_urls.push(f.evidence.files[0].source_url,'https://drive.google.com/file/d/unmapped/view');
 result=await reconcileAttachments(f.snapshot,f.payload,f.evidence,async()=>f.bytes);assert.equal(result.summary.ready_for_storage_copy,false);assert.match(result.issues[0].reason,/no reconciled/);
});
