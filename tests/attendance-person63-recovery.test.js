const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { z } = require('zod');
const source = fs.readFileSync('src/app/api/attendance/recovery-63/route.ts', 'utf8');
function harness(overrides = {}) {
  const calls = [];
  const state = { enabled: true, tenant: '3b104582-f8cb-4a4d-867f-b99e5ffc6486', allowed: true, csrf: false, error: null, ...overrides };
  const modules = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    zod: { z },
    '@/lib/supabase/server': { createClient: async () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: { status: 'completed', count: 25 }, error: state.error }; } }) },
    '@/lib/supabase/loose': { looseSupabase: x => x },
    '@/server/auth/tenant-actor': { requireActiveTenantActor: async () => ({ companyId: state.tenant }) },
    '@/server/auth/permissions': { hasPermission: async () => state.allowed },
    '@/server/http/request-security': { rejectCrossSiteMutation: () => state.csrf ? { status: 403 } : null },
    '@/server/observability/logger': { logServerError: () => {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name]; },
    process: { env: { OMS_PERSON63_RECOVERY: state.enabled ? 'fixed-25-v1' : '' } },
  });
  return { ...module.exports, calls };
}
const request = body => ({ json: async () => body });
test('fixed recovery route preserves scope and safe failures', async t => {
  await t.test('disabled without RPC', async () => { const h=harness({enabled:false}); assert.equal((await h.GET()).status,503);assert.equal(h.calls.length,0); });
  await t.test('tenant and permission denial', async () => { for(const o of [{tenant:'other'},{allowed:false}]){ const h=harness(o);assert.equal((await h.GET()).status,403);assert.equal(h.calls.length,0); } });
  await t.test('cross-site and scope injection rejected', async () => { const h=harness({csrf:true});assert.equal((await h.POST(request({snapshot:'a'.repeat(32)}))).status,403);const valid=harness();assert.equal((await valid.POST(request({snapshot:'a'.repeat(32),staffId:'other'}))).status,400);assert.equal(valid.calls.length,0); });
  await t.test('preview and execute only dedicated RPC', async () => {const h=harness();await h.GET();await h.POST(request({snapshot:'a'.repeat(32)}));assert.equal(h.calls[0].name,'recover_attendance_person63');assert.equal(h.calls[0].args.p_expected_snapshot,null);assert.equal(h.calls[1].args.p_expected_snapshot,'a'.repeat(32));});
  await t.test('SQL detail never exposed',async()=>{for(const [code,status] of [['P0001',409],['42501',403],['42883',503],['08006',503]]){const h=harness({error:{code,message:'PRIVATE SQL detail',details:'other employee'}});const result=await h.GET();assert.equal(result.status,status);assert.doesNotMatch(JSON.stringify(result.body),/PRIVATE|employee|SQL/);}});
});
