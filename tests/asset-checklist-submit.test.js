const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const id = value => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
function harness(error = null) {
  const calls = [], module = { exports: {} };
  const bindings = {
    'next/cache': { revalidatePath() {} },
    '@/server/auth/tenant-actor': { requireActiveTenantActor: async () => ({ companyId: id(1), staffId: id(2) }) },
    '@/server/auth/permissions': { requirePermission: async permission => assert.equal(permission, 'assets.check') },
    '@/lib/supabase/server': { createClient: async () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: error ? null : id(4), error: error ? { message: error } : null }; } }) },
    '@/lib/supabase/loose': { looseSupabase: value => value },
    '@/lib/supabase/admin': {}, '@/lib/asset-attachments': {}, '@/lib/asset-master': {}, '@/lib/production-planning/forecast': {},
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/server/actions/assets.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module, exports: module.exports, require: name => bindings[name] ?? require(name) });
  const form = new FormData();
  form.set('location_id', id(3)); form.set('submission_id', id(4)); form.set('date', '2026-10-09');
  return { calls, form, submit: () => module.exports.submitAssetChecklist({ ok: false, message: '' }, form) };
}
test('73 selected condition checks submit once with null counts, explicit zero and preserved exception', async () => {
  const h = harness();
  for (let index = 0; index < 73; index++) { h.form.append('asset_id', id(index + 10)); h.form.set(`result_${id(index + 10)}`, 'Checked'); }
  h.form.set(`quantity_${id(10)}`, '0');
  h.form.set(`result_${id(11)}`, 'Needs Maintenance'); h.form.set(`remark_${id(11)}`, 'Synthetic loose handle');
  assert.equal((await h.submit()).ok, true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].name, 'submit_asset_check');
  const lines = h.calls[0].args.p_lines;
  assert.equal(lines.length, 73); assert.equal(lines[0].quantity, 0); assert.equal(lines[1].quantity, null);
  assert.equal(lines[1].result, 'Needs Maintenance'); assert.equal(lines[1].remark, 'Synthetic loose handle');
  assert.ok(lines.slice(2).every(line => line.quantity === null && line.result === 'Checked'));
});
test('invalid physical counts, unmentioned exceptions and duplicate selections never reach the database', async () => {
  for (const count of ['-1', '0.5', 'NaN', '9007199254740992']) {
    const h = harness(); h.form.append('asset_id', id(10)); h.form.set(`result_${id(10)}`, 'Checked'); h.form.set(`quantity_${id(10)}`, count);
    assert.equal((await h.submit()).ok, false); assert.equal(h.calls.length, 0);
  }
  const exception = harness(); exception.form.append('asset_id', id(10)); exception.form.set(`result_${id(10)}`, 'Damaged');
  assert.equal((await exception.submit()).ok, false); assert.equal(exception.calls.length, 0);
  const duplicate = harness(); duplicate.form.append('asset_id', id(10)); duplicate.form.append('asset_id', id(10));
  assert.equal((await duplicate.submit()).ok, false); assert.equal(duplicate.calls.length, 0);
});
test('permission or concurrent holding failures return failure rather than a successful inspection', async () => {
  const h = harness('Asset checklist permission denied'); h.form.append('asset_id', id(10)); h.form.set(`result_${id(10)}`, 'Checked');
  const result = await h.submit(); assert.equal(result.ok, false); assert.match(result.message, /permission denied/);
});
