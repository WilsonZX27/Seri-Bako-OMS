import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const component=({children,rightRail})=>React.createElement(React.Fragment,null,children,rightRail);
async function render(purchases,canRead=true){const exports={};const code=ts.transpileModule(fs.readFileSync('src/app/(app)/inventory/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,require(name){
 if(name==='@/server/queries/inventory')return{getInventoryDashboard:async()=>({lowStockRows:[],topConsumedItems:[],topPurchasedItems:purchases}),getInventoryDailyMovement:async()=>({rows:[]})};
 if(name==='@/server/auth/permissions')return{getPermissionMap:async()=>({"stock_transactions.read":canRead})};
 if(name==='@/lib/inventory-read-deadline')return{inventoryReadDeadline:p=>p};
 if(name==='@/lib/utils')return{formatNumber:String};
 if(name.startsWith('@/components/'))return new Proxy({},{get:()=>component});
 if(name==='next/link')return{default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
 return require(name);
 }});return renderToStaticMarkup(await exports.default({searchParams:Promise.resolve({})}));}
test('unitless name-grouped summary preserves names and review route without presenting quantity rankings',async()=>{const html=await render([{name:'Sugar',qty:400},{name:'Milk',qty:204}]);assert.match(html,/Sugar/);assert.match(html,/Milk/);assert.match(html,/Quantity totals are unavailable/);assert.match(html,/href="\/stock-transactions\?type=purchase"/);assert.doesNotMatch(html,/400|204|Top Purchased Items/);});
test('empty summary does not invent purchase names or quantities',async()=>{const html=await render([]);assert.doesNotMatch(html,/Purchased items|Quantity totals are unavailable|Review purchase movements/);});

test("purchase review link respects existing ledger read permission",async()=>{const html=await render([{name:"Sugar",qty:400}],false);assert.match(html,/Sugar/);assert.doesNotMatch(html,/href="\/stock-transactions\?type=purchase"/);});
