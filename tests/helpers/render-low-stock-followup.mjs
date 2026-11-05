import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const loadDependency=createRequire(import.meta.url);
const h=React.createElement,cache=new Map();
const branches=[{id:'branch',branch_code:'CK',branch_name:'CK @ ALMA',status:'active'}];
const overrides={
 '@/components/ui/page-header':{PageHeader:({title,description})=>h('header',null,h('h1',null,title),h('p',null,description))},
 '@/server/actions/procurement':{createPurchaseRequestsFromBasket:undefined},
 '@/components/ui/submit-button':{SubmitButton:(props)=>{const buttonProps={...props};delete buttonProps.pendingLabel;return h('button',buttonProps);}},
 '@/components/layout/workspace-layout':{WorkspaceGrid:({children})=>h('main',null,children)},
 '@/components/layout/right-console':{ConsoleSection:({children})=>h('section',null,children)},
 '@/server/auth/permissions':{hasPermission:async()=>true},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({staffId:'fixture'})},
 '@/server/queries/common':{getBranchesForSelect:async()=>branches},'@/server/queries/inventory':{getLowStockResult:async()=>({rows:[],count:0,unavailable:false})},
 'next/link':{__esModule:true,default:({children,...props})=>h('a',props,children)}
};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exp={};cache.set(file,exp);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports:exp,crypto:webcrypto,require(name){if(name.endsWith('.css'))return {};if(name in overrides)return overrides[name];if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve('src',name.slice(2)):path.resolve(path.dirname(file),name);return load([base,base+'.ts',base+'.tsx'].find(x=>fs.existsSync(x)&&fs.statSync(x).isFile()));}return loadDependency(name);}},{filename:file});return exp;}
const base={branch_id:'branch',branch_name:'CK @ ALMA',item_id:'item',item_code:'EXAMPLE00001',item_name:'Long ingredient name with 包装说明 and an unbrokenidentifierforwrapping',suggested_reorder_qty:8.25,base_unit:'KG',purchase_unit:'BAG',supplier_id:'supplier',supplier_name:'Example Long Supplier Sdn Bhd',cost:3.45,stock_status:'low_stock',current_stock:-1.75,safety_stock:5};
const items=[base,{...base,item_id:'missing',item_code:'EXAMPLE00002',supplier_id:null,supplier_name:null,item_name:'Missing supplier item'},{...base,item_id:'monitor',item_code:'EXAMPLE00003',current_stock:8,item_name:'Monitor stock item',stock_status:'sufficient'}];
export const baseItem=base;
export const renderLines=(rows=items)=>renderToStaticMarkup(h(load('src/components/low-stock-pr-form.tsx').LowStockPrForm,{items:rows,branches,defaultBranchId:'branch',basketOwnerId:'fixture',disabled:false}));
export const renderPage=async filters=>renderToStaticMarkup(await load('src/app/(app)/low-stock/page.tsx').default({searchParams:Promise.resolve(filters)}));
