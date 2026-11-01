const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), ts = require("typescript");
function load({owner=true,permission=true,error=null,count=1}={}) {
  const calls=[];
  const exports={};
  const mocks={
    "@/lib/mock-mode":{isMockMode:()=>false},
    "@/server/auth/asset-settings":{requireAssetDestinationManager:async()=>{if(!owner||!permission)throw Error("Denied");return{companyId:"company"};}},
    "@/lib/supabase/server":{createClient:async()=>({rpc:async(name,args)=>{calls.push([name,args]);return {data:{rows:[{id:"hostel",source_name:"Hostel"}],total:count},error};}})},
    "@/lib/supabase/loose":{looseSupabase:value=>value}
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/server/queries/asset-settings.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>mocks[name]});
  return{get:exports.getAssetOtherLocations,calls};
}
test("Asset Settings scopes other destinations to company with bounded stable pagination",async()=>{
  const {get,calls}=load();const result=await get(2);
  assert.equal(result.total,1);assert.equal(calls.length,1);assert.equal(calls[0][0],"get_asset_other_location_settings");assert.equal(calls[0][1].p_page,2);
});
test("Asset Settings denies nonOwner or missing permission before querying",async()=>{
  for(const options of [{owner:false},{permission:false}]){const {get,calls}=load(options);await assert.rejects(get(1));assert.equal(calls.length,0);}
});
test("Asset Settings read failure and missing count never become empty success",async()=>{
  for(const options of [{error:{message:"unavailable"}},{count:null}])await assert.rejects(load(options).get(1));
});
test("Settings entry uses destination roles and creation remains separately guarded",()=>{
  const nav=fs.readFileSync("src/components/asset-workspace-navigation.tsx","utf8");
  const page=fs.readFileSync("src/app/(app)/asset-management/page.tsx","utf8");
  assert.match(nav,/canSettings=false/);assert.match(nav,/concat\(canSettings \?/);
  assert.match(page,/canSettings=\{canManageAssetDestinations\(actor.roleCode\)\}/);
  const settings=fs.readFileSync("src/app/(app)/asset-management/settings/page.tsx","utf8");
  assert.match(settings,/requireAssetDestinationManager\(\)/);assert.match(settings,/canCreate \?/);
  assert.match(settings,/AssetOtherLocationForm/);assert.match(settings,/role="alert"/);
  assert.doesNotMatch(settings,/Delete|Deactivate|disabled/);
});
test("Settings uses divided rows and a separate trailing new-destination disclosure",()=>{
 const page=fs.readFileSync("src/app/(app)/asset-management/settings/page.tsx","utf8");
 assert.ok(page.indexOf('<ul className="divide-y">') < page.indexOf('New destination'));
 assert.match(page,/<AssetOtherLocationForm horizontal/);
 const row=fs.readFileSync("src/components/asset-destination-row.tsx","utf8");
 assert.match(row,/Deactivate/);assert.match(row,/Reactivate/);assert.match(row,/onReset=/);
 assert.match(row,/deactivate \? !row.other_active : row.other_active/);
});
test("Transfer timeline follows mobile content while unrelated rails keep their default placement",()=>{
 const layout=fs.readFileSync("src/components/layout/workspace-layout.tsx","utf8");
 assert.match(layout,/mobileRailPlacement = "before"/);
 assert.ok(layout.indexOf('mobileRailPlacement === "after"') > layout.indexOf('{children}</div>'));
 for(const path of ['src/app/(app)/asset-management/transfers/[id]/page.tsx','src/components/asset-transfer-batch-detail.tsx'])assert.match(fs.readFileSync(path,'utf8'),/mobileRailPlacement="after"/);
});
test('destination guard admits only four roles with existing assets.view permission',async()=>{
 const roleExports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset-settings-access.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:roleExports});
 for(const role of ['super_admin','manager','finance','purchasing','chef','kitchen','outlet_supervisor','outlet_staff','people_operations'])for(const permission of [true,false]){
  const exports={};const deps={'@/lib/asset-settings-access':roleExports,'@/server/auth/tenant-actor':{requireActiveTenantActor:async()=>({roleCode:role})},'@/server/auth/permissions':{requirePermission:async code=>{assert.equal(code,'assets.view');if(!permission)throw Error('denied');}}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/auth/asset-settings.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>deps[name],Error});
  if(permission&&['super_admin','manager','finance','purchasing'].includes(role))assert.equal((await exports.requireAssetDestinationManager()).roleCode,role);else await assert.rejects(exports.requireAssetDestinationManager());
 }
});
