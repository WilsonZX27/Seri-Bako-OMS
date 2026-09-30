const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadReport({ overflow = false } = {}) {
  const calls = [];
  const old = { id: 'old', branch_id: 'outlet', record_date: '2026-08-01', status: 'reviewed' };
  const recent = { id: 'recent', branch_id: 'outlet', record_date: '2026-09-30', status: 'evening_completed' };
  const db = { from(table) {
    const query = { table, filters: [] };
    const chain = new Proxy({}, { get(_, method) {
      if (method === 'then') return (resolve) => {
        calls.push(query);
        let data;
        if (table === 'products') data = [{ id: 'p', product_code: 'PKG01', product_name: 'Bag', selling_unit: 'PCS' }];
        else if (table === 'branches') data = [{ id: 'outlet', branch_name: 'Outlet' }];
        else if (table === 'outlet_daily_records') data = query.filters.some(([key]) => key === 'gte') ? [recent] : [old];
        else if (table === 'outlet_daily_record_lines') data = [old, recent].map((record) => ({ record_id: record.id, product_id: 'p', morning_received_provided: false, morning_received_qty: 0, wastage_qty: record.id === 'old' ? 9 : 0, evening_leftover_qty: record.id === 'old' ? 12 : 0 }));
        resolve({ data, error: null, count: overflow && table === 'outlet_daily_records' && query.filters.some(([key]) => key === 'gte') ? 1001 : data.length });
      };
      return (...args) => { query.filters.push([method, ...args]); return chain; };
    } });
    return chain;
  } };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/server/queries/outlet-packaging.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require(name) {
    if (name.includes('business-date')) return { todayInKualaLumpur: () => '2026-10-01', shiftBusinessDate: () => '2026-09-25' };
    if (name.includes('mock-mode')) return { isMockMode: () => false };
    if (name.includes('supabase/server')) return { createClient: async () => db };
    throw new Error(name);
  } });
  return { report: exports.getOutletPackagingReport, calls };
}

test('latest closing remains independent of trend window; recorded zero differs from missing received', async () => {
  const { report, calls } = loadReport();
  const result = await report(7);
  assert.equal(result.latest[0].date, '2026-08-01');
  assert.equal(result.latest[0].closing, 12);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].usage, 0);
  assert.equal(result.rows[0].received, null);
  assert.ok(calls.every((call) => !['items', 'outlet_packaging_item_links', 'stock_balances_summary'].includes(call.table)));
  assert.ok(calls.filter((call) => call.table === 'outlet_daily_records').every((call) => call.filters.some(([key, field, values]) => key === 'in' && field === 'status' && values.includes('evening_completed'))));
});

test('incomplete reads fail explicitly instead of displaying partial totals', async () => {
  const { report } = loadReport({ overflow: true });
  await assert.rejects(report(30), /exceeded the read limit/);
});
