import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const component = ({ children, rightRail }) => React.createElement(React.Fragment, null, children, rightRail);
async function render(filters, unavailable = false) {
  const exports = {};
  const items = [{id:'kg',item_code:'KG1',item_name:'Flour',base_unit:'KG'}, {id:'litre',item_code:'L1',item_name:'Milk',base_unit:'LITRE'}];
  const rows = items.map((item,index) => ({...item,stock_transaction_id:item.id,item_id:item.id,quantity_in:index ? 63 : 0,quantity_out:index ? 0 : 2.7,transaction_type:'stock_count_adjustment',transaction_no:item.id,transaction_date:'2026-11-04',running_balance:10,unit_cost:0,total_cost:0}));
  const code = ts.transpileModule(fs.readFileSync('src/app/(app)/stock-transactions/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require(name){
    if(name === '@/server/queries/common') return {getItemsForSelect:async()=>items,getBranchesForSelect:async()=>[]};
    if(name === '@/server/queries/inventory') return {getStockBalanceSummary:async()=>({total:2,inventoryValue:200}),getStockLedger:async()=>({unavailable,totalRows:2,rows:unavailable?[]:filters.item_id && filters.item_id !== 'all' ? rows.filter(r=>r.item_id===filters.item_id):rows})};
    if(name === '@/server/auth/permissions') return {hasPermission:async()=>false};
    if(name === '@/server/observability/logger') return {logServerError:()=>{}};
    if(name === '@/lib/business-date') return {todayInKualaLumpur:()=> '2026-11-05',shiftBusinessDate:()=> '2026-10-07'};
    if(name === '@/lib/utils') return {getToday:()=> '2026-11-04',formatNumber:n=>String(n),formatCurrency:n=>`RM ${n}`,formatDateOnly:d=>d};
    if(name === '@/lib/table-state') return {hasActiveFilters:()=>true};
    if(name.startsWith('@/components/')) return new Proxy({}, {get:(_, key)=>key === 'OperationalListRow' ? ({primary,meta})=>React.createElement('p',null,primary,' ',meta) : component});
    if(name === 'next/link') return {default:component};
    return require(name);
  }});
  return renderToStaticMarkup(await exports.default({searchParams:Promise.resolve(filters)}));
}
test('mixed-item page does not total KG with LITRE while preserving row units and currency valuation',async()=>{
  const html=await render({item_id:'all'});
  assert.match(html,/Select an item for page quantity totals/);
  assert.match(html,/63 LITRE/); assert.match(html,/2.7 KG/);
  assert.match(html,/RM 200/);
  assert.doesNotMatch(html,/Page quantity in<\/span><strong>63/);
});
test('single-item totals are labelled as page quantities with base unit',async()=>{
  const html=await render({item_id:'kg'});
  assert.match(html,/Page quantity out<\/span><strong>2.7 KG/);
  assert.doesNotMatch(html,/Select an item for page quantity totals/);
});
test('unavailable ledger retains unavailable summary instead of zero quantities',async()=>{
  const html=await render({item_id:'kg'},true);
  assert.match(html,/Page quantity out<\/span><strong>Unavailable/);
  assert.doesNotMatch(html,/Page quantity out<\/span><strong>0 KG/);
});
