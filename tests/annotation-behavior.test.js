const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadFunctions(path, names, bindings = {}) {
  const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const text = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(source).replace(/^export /, '')).join('\n');
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), `${js}; return {${names.join(',')}};`)(...Object.values(bindings));
}

test('low stock reads every page and rejects a partial failed result', async () => {
  const { readLowStockPages } = loadFunctions('src/server/queries/inventory.ts', ['readLowStockPages']);
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const ranges = [];
  const result = await readLowStockPages({ range: async (start, end) => { ranges.push([start, end]); return { data: rows.slice(start, end + 1), error: null }; } });
  assert.equal(result.data.length, 1001);
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
  const failure = await readLowStockPages({ range: async start => start ? { data: null, error: { message: 'Connection lost' } } : { data: rows.slice(0, 500), error: null } });
  assert.equal(failure.data, null);
  assert.equal(failure.error.message, 'Connection lost');
});

test('compliance expires at Kuala Lumpur midnight and retains review priority', () => {
  const { todayInKualaLumpur } = loadFunctions('src/lib/business-date.ts', ['todayInKualaLumpur']);
  const { complianceState } = loadFunctions('src/server/queries/compliance.ts', ['complianceState'], { todayInKualaLumpur });
  assert.equal(complianceState('2026-09-04', 'approved', true, new Date('2026-09-04T15:59:59Z')), 'due_7');
  assert.equal(complianceState('2026-09-04', 'approved', true, new Date('2026-09-04T16:00:00Z')), 'expired');
  assert.equal(complianceState('2026-09-04', 'pending_review', true, new Date('2026-09-04T16:00:00Z')), 'pending_review');
});

test('keyboard and modified link clicks bypass touch double-tap suppression', () => {
  const path = 'src/components/ui/table.tsx';
  const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handlePointerOpen') handler = node.initializer.getText(source); ts.forEachChild(node, visit); }
  visit(source);
  const js = ts.transpileModule(`const handler = ${handler};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const click = new Function('lastTapAt', 'window', `${js};return handler;`)({ current: 0 }, { setTimeout() {} });
  for (const props of [{ detail: 0 }, { detail: 1, ctrlKey: true }, { detail: 1, metaKey: true }]) {
    let prevented = false;
    click({ ...props, preventDefault() { prevented = true; } });
    assert.equal(prevented, false);
  }
});

test('invalid optional sales does not invalidate valid outlet quantities', () => {
  const text = fs.readFileSync('src/server/actions/outlet-daily-records.ts', 'utf8').split('export async function saveOutletDailyRecord')[0].replace(/^import .*;\r?\n/gm, '');
  const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const extract = new Function('z', `${js}; return extractOutletDailyPayload;`)(require('zod').z);
  const form = new FormData();
  form.set('branch_id', '11111111-1111-4111-8111-111111111111');
  form.set('record_date', '2026-09-05');
  form.set('line_product_id', '22222222-2222-4222-8222-222222222222');
  form.set('morning_received_qty', '4');
  form.set('wastage_qty', '1');
  form.set('wastage_reason', 'unsold');
  form.set('pos_total_sales', '-4');
  form.set('target_status', 'evening_completed');
  const result = extract(form);
  assert.equal(result.target_status, 'evening_completed');
  assert.equal(result.lines[0].wastage_qty, 1);
  assert.equal(result.sales_unavailable, true);
  form.set('wastage_qty', '-1');
  assert.throws(() => extract(form));
});


test('a successful empty low-stock eligible scope does not query the expensive ledger views', async () => {
  const sources = [];
  const query = { select(){return this;}, eq(){return this;}, order(){return this;}, range: async () => ({data: [], error: null}) };
  const { loadLowStockItems } = loadFunctions('src/server/queries/inventory.ts', ['readLowStockPages', 'loadLowStockItems'], {
    isMockMode: () => false,
    createClient: async () => ({from(name) { sources.push(name); if(name !== 'stock_count_eligible_items') throw new Error('Unexpected fallback'); return query; }}),
    warnOptionalInventoryQuery: () => {},
  });
  assert.deepEqual(await loadLowStockItems(), []);
  assert.deepEqual(sources, ['stock_count_eligible_items']);
});

test('the two observed production Outlet Daily errors report pending database rules, not missing inputs', () => {
  const { formatActionError } = loadFunctions('src/server/actions/error-handling.ts', ['formatActionError'], {
    logServerError: () => {}, classifyActionError: () => 'validation_failed',
  });
  for(const message of ['Invalid outlet daily record action.', 'POS Total Sales is required before completing this record.']) {
    assert.match(formatActionError(new Error(message)), /pending Outlet Daily migrations/);
  }
});


test('item image removal is explicit and a validated replacement takes precedence', async () => {
  for (const [remove, replacement, expected] of [[false, null, undefined], [true, null, null], [true, '/validated-image.webp', '/validated-image.webp']]) {
    let written;
    let permission;
    const scopeChecks = [];
    const redirected = new Error('redirect');
    const query = { select(){return this;}, eq(key,value){scopeChecks.push([key,value]);return this;}, maybeSingle:async()=>({data:{id:'item'},error:null}), update(value){written=value;return this;}, then(resolve){return Promise.resolve({error:null}).then(resolve);} };
    const { updateItem } = loadFunctions('src/server/actions/items.ts', ['updateItem'], {
      requirePermissionOrRedirect: async value => {permission=value;}, isMockMode:()=>false,
      parseItemId:value=>value, createClient:async()=>({from:()=>query}), requireActiveTenantActor:async()=>({companyId:'company'}),
      payload:()=>({item_name:'Test item'}), uploadMasterDataImage:async()=>replacement,
      revalidatePath:()=>{}, redirect:()=>{throw redirected;}, rethrowRedirect:error=>{throw error;},
    });
    const form = new FormData();
    if(remove) form.set('remove_item_image','true');
    await assert.rejects(updateItem('item',form), error=>error===redirected);
    assert.equal(written.item_image_url,expected);
    assert.equal(Object.hasOwn(written,'item_image_url'),expected!==undefined);
    assert.equal(permission,'items.update');
    assert.equal(scopeChecks.filter(([key,value])=>key==='company_id'&&value==='company').length,2);
  }
});
