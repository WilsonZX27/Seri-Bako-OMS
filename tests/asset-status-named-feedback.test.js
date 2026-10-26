const test=require('node:test'),assert=require('node:assert/strict');
const {compile,React,renderToStaticMarkup}=require('./helpers/render-workspaces.cjs');
const load=require('./helpers/load-source.cjs')();
const {AssetRegisterRows}=compile('src/components/asset-workspace-lists.tsx',{
 '@/lib/asset-quantity-display':load('src/lib/asset-quantity-display.ts'),
 '@/components/ui/badge':load('src/components/ui/badge.tsx'),
 '@/components/ui/table':load('src/components/ui/table.tsx'),
});
test('asset holding status uses the existing status bullet while unknown quantity stays unknown',()=>{
 const assets=[{id:'a',asset_code:'KEEP-1',item_name:'Existing asset',current_details:{}}];
 const render=holdings=>renderToStaticMarkup(React.createElement(AssetRegisterRows,{assets,holdings,locations:new Map([['l','Existing location']])}));
 const html=render([{asset_id:'a',location_id:'l',quantity:0,status:'Active',condition:'Good',latest_check_result:'Checked'}]);
 assert.match(html,/data-status="active"/);assert.match(html,/data-badge-variant="success"/);
 for(const value of ['KEEP-1','Existing location','Condition: Good','Check: Checked'])assert.ok(html.includes(value));
 const unknown=render([]);assert.match(unknown,/data-status="unknown"/);assert.match(unknown,/No accessible holding/);assert.match(unknown,/—/);assert.doesNotMatch(unknown,/data-status="active"/);
});
