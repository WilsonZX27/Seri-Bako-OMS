const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const kitchen = '10000000-0000-4000-8000-000000000001';
const product = '10000000-0000-4000-8000-000000000002';
const outlet = '10000000-0000-4000-8000-000000000003';
const key = '10000000-0000-4000-8000-000000000004';
function fixture({role = 'manager', rpcError = null, mail = {unavailable: true}, readDb=null} = {}) {
 const calls = [], invalidations = [];
 const db = {rpc: async (name, args) => { calls.push({name, args}); return {data: name === 'update_production_plan' ? {id: kitchen} : kitchen, error: rpcError}; }};
 const shared = {
  'next/navigation': {redirect() {}},
  'next/dist/client/components/redirect-error': {isRedirectError: () => false},
  '@/server/auth/permissions': {hasPermission: () => false},
  '@/server/observability/logger': {logServerError() {}},
  '@/lib/reliability/operation-result': {operationFailure() {}},
 };
 function compile(path, dependencies) {
  const context = {exports: {}, Error, String, require(name) {if (!(name in dependencies)) throw Error('Missing test dependency ' + name); return dependencies[name];}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, context);
  return context.exports;
 }
 const errors = compile('src/server/actions/error-handling.ts', shared);
 const actions = compile('src/server/actions/production-planning.ts', {
  ...shared, 'zod': require('zod'), 'next/cache': {revalidatePath: path => invalidations.push(path)},
  '@/lib/supabase/server': {createClient: async () => readDb??db}, '@/lib/supabase/loose': {looseSupabase: value => value},
  '@/server/queries/common': {getCurrentProfile: async () => ({company_id: kitchen, role_code: role})},
  '@/server/production-planning/data': {buildPlanPayload() {throw Error('Unexpected forecast');},async complete(factory){const result=await factory();if(result.error)throw Error(result.error.message);return result.data;}},
  '@/lib/production-planning/forecast': {addDays(value) {if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Invalid date'); return value;}},
  '@/server/production-planning/email': {deliverPlanningEmails: async () => mail},
  '@/server/actions/error-handling': errors,
 });
 return {actions, calls, invalidations};
}
function config() {return {kitchen_id:kitchen, enabled:false, draft_time:'20:00', buffer_percent:10, max_decrease_percent:10, recipients:[], batches:[{product_id:product,yield_per_tray:16,forecast_basis:'same_day'}], minimums:[{branch_id:outlet,product_id:product,minimum_qty:0}]};}
test('planning configuration accepts an explicit zero minimum and no recipients without fabricating release', async () => {
 const f=fixture();const result=await f.actions.configurePlanning(config());
 assert.equal(result.ok,true);assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'configure_production_planning');
 const payload=f.calls[0].args.p_payload;
 assert.equal(payload.minimums[0].minimum_qty,0);assert.equal(payload.recipients.length,0);assert.equal(payload.enabled,false);
 assert.ok(!f.calls.some(call => /dispatch|update_production_plan/.test(call.name)));
});
test('invalid configuration fails before RPC and formats validation without raw Zod output',async()=>{
 const f=fixture();const result=await f.actions.configurePlanning({...config(),recipients:['not-email']});
 assert.equal(result.ok,false);assert.equal(f.calls.length,0);assert.equal(f.invalidations.length,0);
 assert.ok(result.message.length<220);assert.ok(!result.message.includes('"code"'));assert.ok(!result.message.includes('Zod'));
});
test('outlet staff cannot configure production planning even with a valid payload',async()=>{
 const f=fixture({role:'staff'});assert.equal((await f.actions.configurePlanning(config())).ok,false);assert.equal(f.calls.length,0);
});
test('event quantities must be positive and invalid events do not write',async()=>{
 const f=fixture();const event={kitchen_id:kitchen,branch_id:null,event_date:'2026-10-05',name:'Corporate',notes:'',confirmed:true,lines:[{product_id:product,qty:0}]};
 assert.equal((await f.actions.savePlanningEvent(event)).ok,false);assert.equal(f.calls.length,0);
 const result=await f.actions.savePlanningEvent({...event,lines:[{product_id:product,qty:32}]});
 assert.equal(result.ok,true);assert.equal(f.calls[0].name,'save_production_event');assert.equal(f.calls[0].args.p_payload.branch_id,null);
});
test('approval remains successful when mail is unavailable and says queued, without claiming delivery',async()=>{
 const f=fixture();const result=await f.actions.changePlan(kitchen,1,'approve',{},key);
 assert.equal(result.ok,true);assert.match(result.message,/queued/);assert.ok(!/sent|processed/.test(result.message));
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].args.p_action,'approve');assert.equal(f.calls[0].args.p_key,key);
});
test('database failures do not expose table or connection internals as operator instructions',async()=>{
 const f=fixture({rpcError:{message:'Could not find the table public.production_planning_settings in the schema cache'}});
 const result=await f.actions.configurePlanning(config());assert.equal(result.ok,false);
 assert.ok(!result.message.includes('public.production_planning_settings'));assert.ok(!result.message.includes('schema cache'));
});

test('draft saves preserve unknown quantities separately from explicit zero',async()=>{
 const f=fixture();const payload={allocations:[{product_id:product,branch_id:outlet,approved_qty:null,reason:''}],product_lines:[{product_id:product,trays:null,retained_qty:0,reason:''}]};
 assert.equal((await f.actions.changePlan(kitchen,1,'save',payload,key)).ok,true);
 assert.equal(f.calls[0].args.p_payload.allocations[0].approved_qty,null);
 assert.equal(f.calls[0].args.p_payload.product_lines[0].trays,null);
 assert.equal(f.calls[0].args.p_payload.product_lines[0].retained_qty,0);
 for (const invalid of [-1,Infinity,1000001]) {
  const bad=fixture();assert.equal((await bad.actions.changePlan(kitchen,1,'save',{...payload,allocations:[{...payload.allocations[0],approved_qty:invalid}]},key)).ok,false);assert.equal(bad.calls.length,0);
 }
 const bad=fixture();assert.equal((await bad.actions.changePlan(kitchen,1,'save',{...payload,product_lines:[{...payload.product_lines[0],trays:0.5}]},key)).ok,false);assert.equal(bad.calls.length,0);
});

test('event supply lookup validates role, date and outlet before read-only RPC',async()=>{
 for(const role of ['staff','kitchen']){const f=fixture({role});assert.equal((await f.actions.resolveEventSupply('2026-10-05',outlet)).ok,false);assert.equal(f.calls.length,0);}
 for(const [dateValue,branchId] of [['invalid',outlet],['2026-10-05','invalid']]){const f=fixture();assert.equal((await f.actions.resolveEventSupply(dateValue,branchId)).ok,false);assert.equal(f.calls.length,0);}
 const f=fixture();assert.equal((await f.actions.resolveEventSupply('2026-10-05',outlet)).ok,true);assert.equal(f.calls[0].name,'resolve_production_event_supply');assert.equal(f.calls[0].args.p_branch,outlet);assert.equal(f.calls[0].args.p_date,'2026-10-05');assert.equal(f.invalidations.length,0);
});
test('event route failure is reported without confirmation or write',async()=>{
 const f=fixture({rpcError:{message:'No active primary supply route for this outlet on the event date. Configure its route first.'}});const result=await f.actions.resolveEventSupply('2026-10-05',outlet);assert.equal(result.ok,false);assert.match(result.message,/primary supply route/);assert.equal(f.calls.length,1);assert.equal(f.invalidations.length,0);assert.ok(!f.calls.some(call=>call.name==='save_production_event'));
});
test('save action preserves explicit automatic/manual modes and legacy omission',async()=>{
 for(const tray_mode of ['automatic','manual',undefined]){const f=fixture();const production={product_id:product,trays:1,retained_qty:0,reason:'Reviewed override',...(tray_mode?{tray_mode}:{})};assert.equal((await f.actions.changePlan(kitchen,1,'save',{allocations:[],product_lines:[production]},key)).ok,true);assert.equal(f.calls[0].args.p_payload.product_lines[0].tray_mode,tray_mode);}
 const bad=fixture();assert.equal((await bad.actions.changePlan(kitchen,1,'save',{allocations:[],product_lines:[{product_id:product,trays:1,retained_qty:0,reason:'',tray_mode:'invented'}]},key)).ok,false);assert.equal(bad.calls.length,0);
});

test('history preview scopes the parent company, outlets, product and dates without writes; unknown inputs stay null',async()=>{
 const reads=[];
 const data={production_plans:{id:kitchen,delivery_date:'2026-10-06'},production_plan_allocations:[{branch_id:outlet}],outlet_daily_records:[{id:key,branch_id:outlet,record_date:'2026-10-04'}],outlet_daily_record_lines:[{id:product,record_id:key,morning_received_qty:0,morning_received_provided:true,evening_leftover_qty:0,wastage_qty:0,wastage_provided:false}]};
 const readDb={from(table){const calls=[];reads.push({table,calls});const q={};for(const method of ['select','eq','in','gte','lt','order','range'])q[method]=(...args)=>{calls.push({method,args});return q;};q.single=async()=>({data:data[table],error:null});q.then=(resolve,reject)=>Promise.resolve({data:data[table],error:null}).then(resolve,reject);return q;}};
 const f=fixture({readDb});const result=await f.actions.readPlanningHistory(kitchen,product);
 assert.equal(result.ok,true);assert.equal(result.rows.length,1);assert.equal(result.rows[0].received,0);assert.equal(result.rows[0].wastage,null);assert.equal(f.calls.length,0);assert.equal(f.invalidations.length,0);
 assert.ok(reads.find(r=>r.table==='production_plans').calls.some(c=>c.method==='eq'&&c.args[0]==='company_id'&&c.args[1]===kitchen));
 assert.ok(reads.find(r=>r.table==='outlet_daily_records').calls.some(c=>c.method==='in'&&c.args[0]==='branch_id'&&c.args[1][0]===outlet));
 assert.ok(reads.find(r=>r.table==='outlet_daily_record_lines').calls.some(c=>c.method==='eq'&&c.args[0]==='product_id'&&c.args[1]===product));
});
