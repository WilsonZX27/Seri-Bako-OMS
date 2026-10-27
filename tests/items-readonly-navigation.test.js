const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
async function render(canEdit){
 const out={},requested=[];const row={id:'fixture-item',item_code:'SC01',item_name:'Synthetic item',brand_name:'Brand',base_unit:'PACK',supplier_name:'Synthetic supplier',cost:12,safety_stock:4,current_stock:9,status:'active'};
 const runtime={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(app)/items/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:out,require:id=>{
  if(id==='react/jsx-runtime')return runtime;
  if(id==='@/server/queries/items')return {getItemsWithStockPage:async()=>({rows:[row],summary:{low_stock:0,active:1,inactive:0},totalRows:1,page:1,totalPages:1}),getRetiredBranchStockCountItems:async()=>[]};
  if(id==='@/server/queries/common')return {getSuppliersForSelect:async()=>[]};
  if(id==='@/server/auth/permissions')return {getPermissionMap:async codes=>{requested.push(...codes);return {'items.update':canEdit,'items.create':Boolean(canEdit)};}};
  if(id==='@/lib/utils')return {formatCurrency:n=>`RM ${n}`,formatNumber:String};
  if(id==='@/lib/table-state')return {hasActiveFilters:()=>false};
  return new Proxy({},{get:(_,name)=>name});
 }});
 const tree=await out.default({searchParams:Promise.resolve({})});const nodes=[];
 function walk(n){if(Array.isArray(n)){n.forEach(walk);return;}if(!n||typeof n!=='object')return;if(n.type)nodes.push(n);if(n.props)Object.values(n.props).forEach(walk);}walk(tree);return {tree,nodes,requested};
}
test('actual Items page removes phone and desktop edit navigation for readonly or missing permission without removing fields',async()=>{
 for(const permission of [false,undefined]){
  const {tree,nodes,requested}=await render(permission);assert.ok(requested.includes('items.update'));
  assert.equal(nodes.filter(n=>n.type==='DataGridRow'||n.type==='TableActionLink'||n.type==='DataGridHint').length,0);
  const mobile=nodes.find(n=>n.type==='OperationalListRow');assert.equal(mobile.props.href,undefined);assert.equal(mobile.props.label,'Synthetic item');
  const text=JSON.stringify(tree);for(const value of ['SC01','Synthetic item','Brand','PACK','Synthetic supplier','RM 12','active'])assert.ok(text.includes(value),value);
  assert.ok(nodes.some(n=>n.type==='TableRow'&&n.props.children?.type==='Fragment'));
 }
});
test('actual Items page preserves authorized editor row, pencil, phone link and hint',async()=>{
 const {nodes}=await render(true);for(const type of ['DataGridRow','TableActionLink','OperationalListRow'])assert.equal(nodes.find(n=>n.type===type).props.href,'/items/fixture-item');assert.equal(nodes.filter(n=>n.type==='DataGridHint').length,1);
});
