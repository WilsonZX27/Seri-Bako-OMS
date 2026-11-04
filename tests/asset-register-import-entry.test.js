/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness uses CommonJS source loaders. */
const test=require('node:test'),assert=require('node:assert/strict');
const {compile,renderToStaticMarkup,React}=require('./helpers/render-workspaces.cjs');
const load=require('./helpers/load-source.cjs')();
const button=load('src/components/ui/button.tsx');
const layout=compile('src/components/layout/workspace-layout.tsx',{'@/components/layout/right-console':{RightConsoleMount:()=>null}});
const header=compile('src/components/ui/page-header.tsx',{'@/components/ui/button':button,'@/components/layout/workspace-layout':layout});
async function render(role='super_admin',denied=false){const permissions=[];const Page=compile('src/app/(app)/asset-management/assets/new/page.tsx',{
 'node:crypto':{randomUUID:()=> 'fixture-key'},'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({roleCode:role})},
 '@/server/auth/permissions':{requirePermission:async p=>{permissions.push(p);if(denied)throw Error('denied');}},
 '@/server/queries/assets':{getAssetRegistration:async()=>({active:true,locations:[]}),getAssetMasterOptions:async()=>({})},
 '@/lib/asset-master':{assetMasterValues:()=>({})},'@/components/asset-master-form':{AssetMasterForm:()=>React.createElement('section',null,'Registration details')},
 '@/components/ui/button':button,'@/components/layout/workspace-layout':layout,'@/components/ui/page-header':header,'@/components/ui/empty-state':{EmptyState:()=>null},
 }).default;const html=renderToStaticMarkup(await Page());assert.deepEqual(permissions,['assets.manage']);return html;}
test('Owner gets the shared secondary import link with icon, correct destination, no underline',async()=>{const html=await render();assert.equal((html.match(/href="\/asset-management\/import"/g)||[]).length,1);assert.match(html,/bg-white/);assert.match(html,/Import from Excel/);assert.doesNotMatch(html,/\bunderline\b/);assert.ok(html.indexOf('Import from Excel')<html.indexOf('Registration details'));});
test('non-Owner has no import entry and assets.manage denial remains enforced',async()=>{assert.doesNotMatch(await render('manager'),/Import from Excel/);await assert.rejects(()=>render('super_admin',true),/denied/);});
module.exports={render};
