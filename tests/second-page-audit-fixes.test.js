import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(receipts,error=null){
 const selections=[];
 const data={purchase_requests:{id:'pr',request_no:'PR-1',document_id:null,status:'converted'},purchase_orders:[{id:'po',document_id:null,po_no:'PO-1',status:'received'}],goods_receivings:receipts,supplier_invoices:[{id:'invoice',document_id:null,invoice_no:'INV-1',status:'draft'}]};
 const db={from(table){const q={select(fields){selections.push({table,fields});return q},maybeSingle:async()=>({data:data[table],error:null}),then(resolve,reject){return Promise.resolve({data:data[table],error:table==='goods_receivings'?error:null}).then(resolve,reject)}};for(const key of ['eq','is','in','order'])q[key]=()=>q;return q}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/procurement.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='@/lib/mock-mode')return {isMockMode:()=>false};if(name==='@/lib/supabase/server')return {createClient:async()=>db};return {};}});
 return {run:()=>exports.getProcurementChainForRequest('pr'),selections};
}
test('linked receipts use finance closure while preserving raw posting and other document states',async()=>{
 const receipts=[{id:'closed',status:'posted',finance_closed_at:'2026-11-03T00:00:00Z'},{id:'posted',status:'posted',finance_closed_at:null},{id:'draft',status:'draft',finance_closed_at:null},{id:'cancelled',status:'cancelled',finance_closed_at:null}].map(r=>({...r,document_id:null,grn_no:r.id}));
 const h=harness(receipts),result=await h.run();
 assert.equal(h.selections.find(s=>s.table==='goods_receivings').fields,'id, document_id, purchase_order_id, grn_no, status, finance_closed_at');
 for(const [id,state] of [['closed','closed'],['posted','posted'],['draft','draft'],['cancelled','cancelled'],['pr','converted'],['po','received'],['invoice','draft']])assert.equal(result.nodes.find(n=>n.id===id).status,state);
 assert.equal(receipts[0].status,'posted');assert.equal(result.nodes.find(n=>n.id==='closed').href,'/goods-receivings/closed');
});
test('chain read errors remain failures rather than fabricated statuses',async()=>{await assert.rejects(harness([],{message:'receipt read failed'}).run(),/receipt read failed/)});
