import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(file){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(name){
  if(name==='next/link')return {default:({children,...props})=>React.createElement('a',props,children)};
  if(name==='@/components/ui/status-badge')return {StatusBadge:({status,...props})=>React.createElement('span',props,status)};
  if(name==='@/components/ui/use-preview-selection')return {usePreviewSelection:()=>({activeValue:null,boundaryProps:{}})};
  if(name==='@/lib/utils')return {formatNumber:String,formatDateOnly:value=>value};
  return require(name);
 }});return exports;
}
const {ProcurementChain}=load('src/components/procurement/procurement-chain.tsx');
const {InventoryDailyMovementChart}=load('src/components/reports/inventory-daily-movement-chart.tsx');
const nodes=[{id:'p',kind:'PR',number:'PR/NOV26/007',href:'/purchase-requests/fixture',status:'Converted to PO'},{id:'o',kind:'PO',number:'PO-000352',href:'/purchase-orders/fixture',status:'Approved'}];
const points=[{transaction_date:'2026-10-07',inbound_entries:8,outbound_entries:152,movement_entries:160},{transaction_date:'2026-11-05',inbound_entries:4,outbound_entries:0,movement_entries:4}];
const chain=renderToStaticMarkup(React.createElement(ProcurementChain,{nodes}));
const chart=renderToStaticMarkup(React.createElement(InventoryDailyMovementChart,{points}));
test('phone identifier wraps while desktop truncation and destinations remain',()=>{
 assert.match(chain,/whitespace-normal break-words[^\"]*sm:truncate/);
 assert.match(chain,/grid-cols-1 gap-2 min-\[390px\]:grid-cols-2/);
 assert.match(chain,/>PR\/NOV26\/007</);assert.match(chain,/href="\/purchase-requests\/fixture"/);
});
test('mobile scale and dates are unscaled HTML with desktop visibility guard',()=>{
 assert.match(chart,/<p class="[^"]*text-\[11px\][^"]*sm:hidden" data-inventory-mobile-scale="true">Scale: 0–152 entries/);
 assert.match(chart,/data-inventory-mobile-dates/);
 assert.match(chart,/<text class="hidden sm:block"/);
 assert.match(chart,/2026-10-07/);assert.match(chart,/2026-11-05/);
 assert.match(chart,/Daily data · 164 posted entries/);
});
test('empty chart does not access absent date endpoints',()=>{
 const html=renderToStaticMarkup(React.createElement(InventoryDailyMovementChart,{points:[]}));
 assert.match(html,/No posted movement entries/);assert.doesNotMatch(html,/data-inventory-mobile-scale/);
});
if(process.env.OMS_NARROW_FIXTURE){fs.writeFileSync(process.env.OMS_NARROW_FIXTURE,`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styles.css"><main style="padding:12px;max-width:760px;margin:auto"><h1>Synthetic component check</h1>${chain}<div style="margin-top:24px">${chart}</div></main>`);}
