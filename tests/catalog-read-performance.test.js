const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports, require(n) {
      if (n in mocks) return mocks[n];
      if (n === 'react/jsx-runtime') return require(n);
      if (n.startsWith('@/components/') || n === 'lucide-react') return new Proxy({}, { get: () => () => null });
      throw Error(n);
    },
  });
  return module.exports;
}
const order = load('src/lib/product-order.ts');
const { paginateRows } = load('src/lib/table-state.ts');
function products(rows, cap = Infinity, failSummary = false, reorderProjection = false) {
  const calls = [];
  const db = { from(table) {
    const call = { table, filters: [], select: null };
    const q = {
      select(s) { call.select = s; return q; },
      eq(k, v) { call.filters.push([k, v]); return q; },
      or(s) { call.search = s; return q; },
      then(resolve, reject) {
        calls.push(call);
        let data = rows.filter(r => call.filters.every(([k, v]) => r[k] === v));
        if (call.search) { const search = call.search.match(/%([^%]*)%/)[1].toLowerCase(); data = data.filter(r => [r.product_code, r.product_name, r.category].some(v => v.toLowerCase().includes(search))); }
        if (reorderProjection && call.select !== '*') data = [...data].reverse();
        data = data.slice(0, cap).map(r => call.select === '*' ? r : Object.fromEntries(call.select.split(',').map(k => [k, r[k]])));
        call.bytes = Buffer.byteLength(JSON.stringify(data));
        return Promise.resolve({ data, error: failSummary && !call.filters.length && !call.search ? { message: 'unavailable' } : null }).then(resolve, reject);
      },
    }; return q;
  } };
  return { calls, queries: load('src/server/queries/products.ts', {
    '@/lib/mock-mode': { isMockMode: () => false }, '@/lib/supabase/server': { createClient: async () => db },
    '@/server/queries/detail': {}, '@/lib/product-order': order,
    '@/server/queries/common': { requireReadRows: d => { if (!d) throw Error('missing'); return d; } },
    '@/lib/business-date': { todayInKualaLumpur: () => '2026-11-01' },
  }) };
}
const fixture = n => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, company_id: 'visible-only', product_code: `SC${i}`, product_name: `Product ${i}`, category: i % 2 ? 'B' : 'A', status: i % 3 ? 'active' : 'inactive', available_from: i % 7 ? null : '2026-12-01', available_until: i % 11 ? null : '2026-10-01', description: 'x'.repeat(150), selling_unit: 'PCS' }));
for (const filters of [{}, { status: 'all', sort: 'product_name', dir: 'desc' }, { search: 'product 2' }, { category: 'B', sort: 'status' }, { status: 'inactive' }, { status: 'active', search: 'SC', category: 'A', dir: 'desc', sort: 'product_code' }, { status: 'invalid' }]) {
  test(`workspace preserves original capped list and global metadata ${JSON.stringify(filters)}`, async () => {
    const old = products(fixture(120), 37);
    const [list, all] = await Promise.all([old.queries.getProducts(filters), old.queries.getProducts()]);
    const next = products(fixture(120), 37);
    const result = await next.queries.getProductsWorkspace(filters);
    assert.equal(JSON.stringify(result.products), JSON.stringify(list));
    for (const page of [undefined, "2", "999", "bad"]) assert.equal(JSON.stringify(paginateRows(result.products, page)), JSON.stringify(paginateRows(list, page)));
    assert.equal(JSON.stringify(result.categories), JSON.stringify([...new Set(all.map(p => p.category))].sort()));
    assert.equal(result.activeCount, all.filter(p => p.status === 'active').length);
    assert.ok(next.calls.every(c => c.table === 'products'));
  });
}
test('summary errors fail closed and empty data stays empty', async () => {
  await assert.rejects(products(fixture(2), Infinity, true).queries.getProductsWorkspace({ category: 'A' }), /unavailable/);
  const r = await products([]).queries.getProductsWorkspace(); assert.equal(r.products.length, 0); assert.equal(r.activeCount, 0);
});
test('scale comparison: five samples per size, unchanged results and reduced queries or JSON bytes', async () => {
  const evidence = [];
  for (const n of [100, 1000, 10000]) for (const filters of [{}, { category: 'B' }]) {
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const old = products(fixture(n)); await Promise.all([old.queries.getProducts(filters), old.queries.getProducts()]);
      const next = products(fixture(n)); await next.queries.getProductsWorkspace(filters);
      const before = old.calls.reduce((s, c) => s + c.bytes, 0), after = next.calls.reduce((s, c) => s + c.bytes, 0);
      assert.ok(filters.category ? after === before : after < before); assert.equal(next.calls.length, filters.category ? 2 : 1);
      samples.push({ beforeQueries: old.calls.length, afterQueries: next.calls.length, beforeJsonBytes: before, afterJsonBytes: after });
    }
    evidence.push({ rows: n, filters, samples });
  }
  console.log('SYNTHETIC_SCALE ' + JSON.stringify(evidence));
});
test('actual Items page skips only unused retired read, keeps summary, supplier and permission reads', async () => {
  for (const status of [undefined, 'active', 'inactive', 'all', 'retired']) {
    let retiredCalls = 0, itemCalls = 0, supplierCalls = 0, permissionCalls = 0;
    const page = load('src/app/(app)/items/page.tsx', {
      '@/server/queries/items': { getItemsWithStockPage: async f => { itemCalls++; assert.equal(f.status, status === 'retired' ? 'all' : status); return { summary: { active: 1, inactive: 1, low_stock: 0 }, rows: [], totalRows: 0 }; }, getRetiredBranchStockCountItems: async () => { retiredCalls++; return { rows: [{ id: 'retired', item_id: 'i', branch: null, item: null }], totalRows: 1, page: 1, totalPages: 1 }; } },
      '@/server/actions/items': { restoreBranchStockCountItem() {} }, '@/server/queries/common': { getSuppliersForSelect: async () => { supplierCalls++; return []; } },
      '@/server/auth/permissions': { getPermissionMap: async () => { permissionCalls++; return {}; } },
      '@/lib/utils': {}, '@/lib/table-state': { hasActiveFilters: () => false },
    }).default;
    await page({ searchParams: Promise.resolve({ status }) });
    assert.equal(retiredCalls, status === 'retired' ? 1 : 0); assert.equal(itemCalls, 1); assert.equal(supplierCalls, 1); assert.equal(permissionCalls, 1);
  }
});
test('Supplier Items deferred: late joined-field search and sort must precede pagination', async () => {
  const suppliers = [{ id: 's', name: 'Visible supplier', supplier_code: 'V', supplier_group: 'Kitchen' }];
  const items = Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, item_code: `I${i}`, item_name: i === 39 ? 'Needle' : `Item ${i}`, base_unit: 'KG' }));
  const rows = items.map((item, i) => ({ id: `si${i}`, supplier_id: 's', item_id: item.id, supplier_item_code: `S${i}`, supplier_item_name: `Term ${i}`, purchase_uom: 'KG', status: 'active', unit_cost: i }));
  const q = load('src/server/queries/master-data.ts', {
    '@/lib/mock-mode': { isMockMode: () => true, mockSupplierItems: rows, mockSuppliers: suppliers, mockItems: items },
    '@/lib/supabase/server': {}, '@/server/queries/detail': {}, '@/lib/table-state': load('src/lib/table-state.ts'), '@/lib/supabase/loose': {},
  });
  const matching = await q.getSupplierItems({ search: 'needle' });
  assert.equal(matching.length, 1); assert.equal(matching[0].id, 'si39');
  const sorted = await q.getSupplierItems({ sort: 'unit_cost', dir: 'desc', supplier: 's', status: 'active' });
  assert.equal(paginateRows(sorted, '1').rows[0].id, 'si39'); assert.equal(paginateRows(sorted, '1').totalRows, 40);
  assert.equal((await q.getSupplierItems({ supplier: 'other' })).length, 0);
});

test('filtered summaries preserve SELECT* subset when projections reorder capped results', async () => {
  const rows = fixture(12).map((r, i) => ({ ...r, category: i < 3 ? 'Original subset' : 'Other plan subset', status: i < 3 ? 'active' : 'inactive', available_from: null, available_until: null }));
  for (const filters of [{ category: 'Other plan subset' }, { search: 'Product' }, { status: 'inactive' }]) {
    const before = products(rows, 3, false, true);
    const expected = await before.queries.getProducts();
    const next = products(rows, 3, false, true);
    const actual = await next.queries.getProductsWorkspace(filters);
    assert.equal(actual.activeCount, expected.filter(p => p.status === 'active').length);
    assert.equal(JSON.stringify(actual.categories), JSON.stringify([...new Set(expected.map(p => p.category))].sort()));
    assert.ok(next.calls.every(c => c.select === '*'));
    assert.equal(actual.activeCount, 3);
    assert.equal(JSON.stringify(actual.categories), '["Original subset"]');
  }
});

// Items must use the query form owner rather than a second router-owning status control.
test("Items status selection has one query owner and retains retirement option", () => {
  const source = fs.readFileSync("src/app/(app)/items/page.tsx", "utf8");
  assert.doesNotMatch(source, /StatusTabs/);
  assert.match(source, /leadingFilter=\{<SelectControl[\s\S]*name="status"/);
  assert.match(source, /value: "retired", label: "Retired from counts"/);
});

// Actual page uses the RPC total, never the current page length.
test('Items count follows view semantics across filters, pages and return navigation', async () => {
  for (const status of ['all', 'retired', 'all', 'retired']) {
    for (const search of ['', 'needle', 'no-match']) for (const pageNumber of ['1', '2', '999']) {
      const expectedTotal = search === 'no-match' ? 0 : 826;
      let headerProps;
      const Header = () => null;
      const page = load('src/app/(app)/items/page.tsx', {
        '@/components/master-data-filters': { MasterDataFilters: Header },
        '@/server/queries/items': {
          getItemsWithStockPage: async () => ({ summary: { active: 826, inactive: 0, low_stock: 0 }, rows: [], totalRows: expectedTotal }),
          getRetiredBranchStockCountItems: async f => { assert.equal(f.page, pageNumber); assert.equal(f.search, search); return { rows: Array.from({ length: search === 'no-match' ? 0 : 15 }, (_, i) => ({ id: String(i), item_id: String(i), branch: null, item: null })), totalRows: search === 'no-match' ? 0 : 1202, page: 1, totalPages: 81 }; },
        },
        '@/server/actions/items': { restoreBranchStockCountItem() {} },
        '@/server/queries/common': { getSuppliersForSelect: async () => [] },
        '@/server/auth/permissions': { getPermissionMap: async () => ({}) },
        '@/lib/utils': {}, '@/lib/table-state': { hasActiveFilters: () => Boolean(search) },
      }).default;
      const tree = await page({ searchParams: Promise.resolve({ status, search, page: pageNumber }) });
      function visit(node) {
        if (Array.isArray(node)) return node.forEach(visit);
        if (!node || typeof node !== 'object') return;
        if (node.type === Header) headerProps = node.props;
        visit(node.props?.children);
      }
      visit(tree);
      assert.ok(headerProps);
      assert.equal(headerProps.resultCount, status === 'retired' ? (search === 'no-match' ? 0 : 1202) : expectedTotal);
      assert.equal(headerProps.search, search);
      assert.equal(headerProps.resetHref, '/items');
    }
  }
});
