const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const routes = require('./fixtures/ui-loading-route-shapes.json');
const read = p => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
function compile(file, bindings) {
  const module = { exports: {} };
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, require: n => n in bindings ? bindings[n] : require(n) });
  return module.exports;
}
// Layout adapters isolate sizing; the real loading canvas, accessibility and rail
// content are rendered. Browser fixtures separately verify actual layout and CSS.
const wrapper = ({ children }) => React.createElement('div', null, children);
const shared = compile('src/components/ui/system-states.tsx', {
  '@/components/ui/button': { Button: wrapper },
  '@/components/layout/workspace-layout': {
    WorkspaceCanvas: wrapper,
    WorkspaceGrid: ({ children, rightRail }) => React.createElement('div', null, children, React.createElement('aside', null, rightRail)),
  },
  '@/lib/utils': { cn: (...v) => v.filter(Boolean).join(' ') },
  'next/link': wrapper,
});
for (const row of routes) test(`route fallback ${row.route} renders ${row.afterVariant}`, () => {
  assert.ok(fs.existsSync(row.source), 'Mapped destination must exist');
  const Loading = compile(row.loadingSource, { '@/components/ui/system-states': shared }).default;
  const html = renderToStaticMarkup(React.createElement(Loading));
  assert.match(html, new RegExp(`data-loading-variant="${row.afterVariant}"`));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /Loading page actions/);
  assert.match(html, /Loading page summary/);
  assert.doesNotMatch(html, /<button|<input|<form/); // feedback cannot perform business actions
});
test('nearest loading inheritance preserves child collection fallbacks', () => {
  for (const row of routes) {
    let dir = path.dirname(row.source), found;
    while (dir.startsWith('src/app')) {
      const candidate = path.join(dir, 'loading.tsx');
      if (fs.existsSync(candidate)) { found = candidate; break; }
      dir = path.dirname(dir);
    }
    assert.equal(found, row.loadingSource, row.route);
  }
  assert.equal(routes.filter(r => r.kind === 'corrected-destination').length, 47);
  assert.equal(routes.filter(r => r.kind === 'preserved-child-list').length, 3);
});
test('collection exceptions and synchronous unverified route retain their owners', () => {
  for (const route of ['asset-management/locations/[id]', 'outlet-compliance/[branchId]', 'suppliers/new']) {
    assert.equal(fs.existsSync(`src/app/(app)/${route}/loading.tsx`), false, route);
  }
  assert.doesNotMatch(read('src/app/(app)/loading.tsx'), /variant=/);
});
test('import summary drops only the redundant parent decoration', () => {
  const source = read('src/components/imports/import-workflow.tsx');
  const summary = source.slice(source.indexOf('{result ? <div data-import-result-summary'), source.indexOf('</CardContent>', source.indexOf('{result ? <div data-import-result-summary')));
  assert.match(summary, /className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"/);
  for (const name of ['imported','updated','skipped','errors']) assert.ok(summary.includes(`{summary.${name}}`));
  assert.equal((summary.match(/data-inset-surface/g) || []).length, 4);
  assert.doesNotMatch(summary, /tabIndex|role="alert"|autoFocus/);
  assert.match(source, /result\?\.errorRows\.length/);
});
