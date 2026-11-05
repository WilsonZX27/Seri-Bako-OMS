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
async function render(purchases,canRead=true,activity={}){const exports={};const code=ts.transpileModule(fs.readFileSync('src/app/(app)/inventory/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,require(name){
 if(name==='@/server/queries/inventory')return{getInventoryDashboard:async()=>({lowStockRows:[],topConsumedItems:[],topPurchasedItems:purchases,...activity}),getInventoryDailyMovement:async()=>({rows:[]})};
 if(name==='@/server/auth/permissions')return{getPermissionMap:async()=>({"stock_transactions.read":canRead})};
 if(name==='@/server/observability/inventory-read')return{createInventoryReadDiagnostics:()=>({run:read=>read(),track:(_name,read)=>read()})};
 if(name==='@/lib/inventory-read-deadline')return{inventoryReadDeadline:p=>p};
 if(name==='@/lib/utils')return{formatNumber:String};
 if(name.startsWith('@/components/'))return new Proxy({},{get:()=>component});
 if(name==='next/link')return{default:({href,children,...props})=>React.createElement('a',{href,...props},children)};
 return require(name);
 }});return renderToStaticMarkup(await exports.default({searchParams:Promise.resolve({})}));}
test('unitless name-grouped summary preserves names and review route without presenting quantity rankings',async()=>{const html=await render([{name:'Sugar',qty:400},{name:'Milk',qty:204}]);assert.match(html,/Sugar/);assert.match(html,/Milk/);assert.match(html,/Quantity totals are unavailable/);assert.match(html,/href="\/stock-transactions\?type=purchase"/);assert.doesNotMatch(html,/400|204|Top Purchased Items/);});
test('empty summary does not invent purchase names or quantities',async()=>{const html=await render([]);assert.doesNotMatch(html,/Purchased items|Quantity totals are unavailable|Review purchase movements/);});

test("purchase review link respects existing ledger read permission",async()=>{const html=await render([{name:"Sugar",qty:400}],false);assert.match(html,/Sugar/);assert.doesNotMatch(html,/href="\/stock-transactions\?type=purchase"/);});

test('activity payload displays record counts and explicit unavailable historical quantities',async()=>{const html=await render([],true,{purchasedActivity:[{item_id:'a',item_code:'A',name:'Sugar',movement_count:4}],consumedActivity:[]});assert.match(html,/Purchase activity/);assert.match(html,/4 records/);assert.match(html,/not quantities or invoice counts/);assert.match(html,/No posted movement records in this period/);assert.doesNotMatch(html,/4 KG/);});
test('old consumption payload never displays an unverified quantity',async()=>{const html=await render([],true,{topConsumedItems:[{name:'Milk',qty:12345}]});assert.match(html,/Milk/);assert.match(html,/Historical unit not verified/);assert.doesNotMatch(html,/12345/);});
