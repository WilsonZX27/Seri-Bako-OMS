const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const source = fs.readFileSync('src/components/ui/interactive-line-chart.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(compiled, { require, exports: moduleObject.exports, module: moduleObject });
const { InteractiveLineChart } = moduleObject.exports;
function render(values) {
  return renderToStaticMarkup(React.createElement(InteractiveLineChart, {
    width: 600, height: 288, inset: { top: 20, right: 12, bottom: 28, left: 42 }, maximum: 10, ariaLabel: 'Usage',
    points: values.map((value, index) => ({ id: String(index), label: String(index), value, previewValue: value === null ? 'No completed records' : `${value} PCS`, previewDetails: [] })),
  }));
}
test('missing dates break the chart path while recorded zero remains a point', () => {
  const html = render([4, null, 0, 5]);
  const path = html.match(/<path d="([^"]*)"/)[1];
  assert.equal((path.match(/M /g) || []).length, 2);
  assert.equal((path.match(/L /g) || []).length, 1);
  assert.equal((html.match(/<circle /g) || []).length, 3);
  assert.match(html, /No completed records/);
});
test('existing complete charts retain their continuous path', () => {
  const path = render([4, 0, 5]).match(/<path d="([^"]*)"/)[1];
  assert.equal((path.match(/M /g) || []).length, 1);
  assert.equal((path.match(/L /g) || []).length, 2);
});
