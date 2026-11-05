import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url);
const wrapper=({children,rightRail})=>React.createElement(React.Fragment,null,children,rightRail);
function load(file,stubs={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,crypto:webcrypto,require(name){
  if(name in stubs)return stubs[name];
  if(name==='@/lib/utils')return {formatNumber:String,formatCurrency:String,getToday:()=> '2026-11-05',formatDateOnly:String};
  if(name.startsWith('@/components/'))return new Proxy({},{get:()=>wrapper});
  if(name==='next/link')return {default:wrapper};
  return require(name);
 }});return exports;
}
const uom=load('src/lib/uom.ts');
async function delivery(lines,status='confirmed'){
 const page=load('src/app/(app)/outlet-daily-records/delivery-orders/page.tsx',{
  './filters.module.css':{default:{}},'@/lib/uom':uom,
  '@/server/queries/common':{getCurrentProfile:async()=>({company_id:'c'})},
  '@/lib/mock-mode':{isMockMode:()=>false},'@/lib/supabase/server':{createClient:async()=>({})},'@/lib/supabase/loose':{looseSupabase:x=>x},
  '@/server/production-planning/data':{loadDeliveryOrders:async()=>lines===null?[]:[{id:'1',do_no:'DO1',status,lines}],complete:async()=>[]},
  '@/lib/business-date':{todayInKualaLumpur:()=> '2026-11-05'},'@/lib/production-planning/forecast':{addDays:()=>{}}
 }).default;
 return renderToStaticMarkup(await page({searchParams:Promise.resolve({})}));
}
test('delivery summary separates mixed units and combines only normalized same units',async()=>{
 const html=await delivery([{unit:'kg',qty:2},{unit:'KG',qty:3},{unit:'LITRE',qty:7}]);
 assert.match(html,/5 KG · 7 LITRE/);assert.doesNotMatch(html,/>12</);
});
test('delivery summary retains unit on confirmed zero',async()=>assert.match(await delivery([{unit:'KG',qty:0}]),/0 KG/));
test('delivery summary fails closed on missing unit or invalid quantity',async()=>{
 for(const line of [{unit:'',qty:2},{unit:'KG',qty:NaN},{unit:'KG',qty:null}])assert.match(await delivery([line]),/Unavailable units or quantities/);
});
test('delivery no orders, unconfirmed, and empty confirmed lines remain distinct',async()=>{
 assert.match(await delivery(null),/No orders/);assert.match(await delivery([{unit:'KG',qty:22}],'void'),/Not confirmed/);
 assert.doesNotMatch(await delivery([{unit:'KG',qty:22}],'void'),/22 KG/);assert.match(await delivery([]),/No quantity lines/);
});
test('receiving actual form renders pending line count instead of heterogeneous pending quantity',()=>{
 const Form=load('src/components/goods-receiving-form.tsx',{
  'next/navigation':{useRouter:()=>({push(){throw Error('unexpected mutation');}})},
  '@/components/ui/select-control':{SelectControl:({options})=>React.createElement('span',null,options.map(x=>x.label).join('|'))}
 }).GoodsReceivingForm;
 const html=renderToStaticMarkup(React.createElement(Form,{purchaseOrders:[{id:'po',po_no:'PO1',supplier_name:'Supplier',pending_qty:99,pending_lines:2}],selectedOrder:null,lines:[],branches:[],action:()=>{throw Error('unexpected mutation');}}));
 assert.match(html,/Pending lines: 2/);assert.doesNotMatch(html,/Pending 99/);assert.match(html,/name="idempotency_key"/);
});
test('void actual dialog shows reversal line count and preserves fingerprint and confirmation gates',()=>{
 const Dialog=load('src/components/stock-count-void-dialog.tsx',{'@/components/ui/submit-button':{SubmitButton:({disabled,children})=>React.createElement('button',{disabled},children)}}).StockCountVoidDialog;
 const html=renderToStaticMarkup(React.createElement(Dialog,{preview:{fingerprint:'test-fingerprint',adjustment_line_count:2,reverse_quantity_in:777,reverse_quantity_out:888},action:()=>{throw Error('unexpected mutation');}}));
 assert.match(html,/Adjustment lines to reverse/);assert.match(html,/own unit/);assert.doesNotMatch(html,/777|888|Qty in|Qty out/);
 assert.match(html,/name="expected_fingerprint" value="test-fingerprint"/);assert.match(html,/name="idempotency_key"/);assert.match(html,/disabled=""/);
});
