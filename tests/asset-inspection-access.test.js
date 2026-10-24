const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
function load(role = 'outlet_staff', count = 73, duplicate = false) {
  const module = { exports: {} }, calls = [], queryCalls = [];
  const policyModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset-access.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: policyModule, exports: policyModule.exports });
  const db = { rpc: async (name,args) => { queryCalls.push({table:name,method:"rpc",args}); return {data:name==="get_asset_register_source_fields" ? args.p_assets.map(asset_id=>({asset_id,details:{Category:"Device"}})) : name==="get_asset_register" ? {total:count,assets:[],holdings:[],filterOptions:{categories:[],statuses:[]}} : true,error:null}; }, from(table) {
    calls.push(table);
    let start = 0, end = 49, ids = [];
    const query = {};
    for (const method of ['select', 'eq', 'order']) query[method] = (...args) => { queryCalls.push({ table, method, args }); return query; };
    query.range = (a, b) => { start = a; end = b; return query; };
    query.in = (_, value) => { ids = value; return query; };
    query.maybeSingle = async () => ({ data: { id: 'location' }, error: null });
    query.then = (resolve, reject) => Promise.resolve({ data: table === 'asset_locations' ? [{ id: 'location', source_name: 'Assigned store' }] : table === 'asset_holdings' ? Array.from({ length: Math.max(0, Math.min(count, end + 1) - start) }, (_, offset) => ({ asset_id: `asset-${duplicate ? offset : start + offset}`, location_id: 'location', quantity: offset === 0 ? null : 0 })) : ids.map(id => ({ id, asset_code: id, item_name: id })), count, error: null }).then(resolve, reject);
    return query;
  }};
  const bindings = {'@/lib/asset-location-display': require('./helpers/load-source.cjs')()('src/lib/asset-location-display.ts'),  react: { cache: fn => fn }, '@/lib/asset-access': policyModule.exports, '@/lib/mock-mode': { isMockMode: () => false }, '@/lib/business-date': {}, '@/lib/production-planning/forecast': {}, '@/server/auth/tenant-actor': { requireActiveTenantActor: async () => ({ companyId: 'company', roleCode: role }) }, '@/server/auth/permissions': { requirePermission: async permission => { if(permission === "assets.report") throw new Error("Reporting permission required"); } }, '@/lib/supabase/server': { createClient: async () => db }, '@/server/queries/asset-feature-capabilities':{assetFeatureCapabilities:async()=>({automaticId:false,transferBatch:false})},'@/lib/asset-transfer':require('./helpers/load-source.cjs')()('src/lib/asset-transfer.ts'),'@/lib/supabase/loose': { looseSupabase: value => value } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/queries/assets.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, require: name => bindings[name] ?? require(name) });
  return { queries: module.exports, calls, queryCalls, policy: policyModule.exports };
}
test('inspection loads the entire 73-asset store and preserves unknown versus zero', async () => {
  const h = load(), data = await h.queries.getAssetInspection('location');
  assert.equal(data.holdings.length, 73);
  assert.equal(data.assets.length, 73);
  assert.ok(data.assets.every(asset => asset.current_details.Category === "Device"));
  const metadataCalls = h.queryCalls.filter(call => call.table === "get_asset_register_source_fields");
  assert.equal(metadataCalls.length, 2);
  assert.equal(metadataCalls[0].args.p_assets.length, 50);
  assert.equal(metadataCalls[1].args.p_assets.length, 23);
  assert.equal(data.holdings[0].quantity, null);
  assert.equal(data.holdings[1].quantity, 0);
  assert.equal(new Set(data.holdings.map(row => row.asset_id)).size, 73);
});
test('inspection refuses an incomplete or duplicate cross-page asset set', async () => {
  await assert.rejects(() => load('outlet_staff', 73, true).queries.getAssetInspection('location'), /changed/);
  await assert.rejects(() => load('outlet_staff', 5001).queries.getAssetInspection('location'), /limit/);
});
test('overview requires management; maintenance queries require an explicit reporting grant for other roles', async () => {
  for (const role of ['outlet_staff', 'finance', 'purchasing', 'people_operations', 'unknown']) {
    const h = load(role);
    await assert.rejects(() => h.queries.getAssetWorkspace('overview'), /management role/);
    await assert.rejects(() => h.queries.getAssetWorkspace('maintenance'), /Reporting permission/);
    await assert.rejects(() => h.queries.getAssetMaintenanceDetail('request', 1), /Reporting permission/);
    await assert.rejects(() => h.queries.getAssetAttachmentRegister('maintenance', 'request', 1), /Reporting permission/);
    assert.equal(h.calls.length, 0);
  }
  const kitchen = load('kitchen');
  await assert.rejects(() => kitchen.queries.getAssetWorkspace('overview'), /only access the assigned asset checklist/);
  await assert.rejects(() => kitchen.queries.getAssetWorkspace('assets'), /only access the assigned asset checklist/);
  assert.equal(kitchen.calls.length, 0);
  for (const role of ['super_admin', 'manager', 'outlet_supervisor']) assert.equal(load(role).policy.canAccessAssetManagement(role), true);
});

test('location filters are authorized before querying assets and sorting stays allowlisted', async () => {
  const blocked = load();
  await assert.rejects(() => blocked.queries.getAssetWorkspace('assets', 1, '', '', '', 'other-store', 'name'), /location unavailable/);
  assert.deepEqual(blocked.calls, ['asset_locations']);
  const allowed = load();
  await allowed.queries.getAssetWorkspace('assets', 1, '', '', '', 'location', 'name');
  const catalog=allowed.queryCalls.find(call=>call.table==='get_asset_register');
  assert.equal(catalog.args.p_location,'location');
  assert.equal(catalog.args.p_sort,'name');
});
