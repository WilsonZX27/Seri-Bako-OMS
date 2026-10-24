const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require, Intl, Date });
  return module.exports;
}

test('receipt balance deducts accepted stock only after posting, preserving its historical snapshot', () => {
  const { remainingAfterReceipt } = load('src/lib/receiving-quantities.ts');
  const line = { pending_qty: 5, received_qty: 5, rejected_qty: 0 };
  assert.equal(remainingAfterReceipt(line, 'posted'), 0);
  assert.equal(remainingAfterReceipt(line, 'draft'), 5);
  assert.equal(remainingAfterReceipt(line, 'cancelled'), 5);
  assert.equal(remainingAfterReceipt({ pending_qty: 5, received_qty: 3, rejected_qty: 2 }, 'posted'), 2);
  assert.equal(remainingAfterReceipt({ pending_qty: 5, received_qty: 7 }, 'posted'), 0);
  assert.equal(remainingAfterReceipt({ pending_qty: 5, received_qty: 0 }, 'posted'), 5);
  assert.equal(line.pending_qty, 5);
});

test('schedule checks group missing days by employee ID, retain blockers and distinguish unsaved edits', () => {
  const { ScheduleValidationSummary } = load('src/components/attendance/schedule-validation-summary.tsx');
  const issues = [
    { code: 'unresolved_staff_day', staffId: 'a', staffName: 'Same name', workDate: '2026-09-07', message: 'a Monday' },
    { code: 'unresolved_staff_day', staffId: 'a', staffName: 'Same name', workDate: '2026-09-08', message: 'a Tuesday' },
    { code: 'unresolved_staff_day', staffId: 'b', staffName: 'Same name', workDate: '2026-09-07', message: 'b Monday' },
    { code: 'cross_branch_collision', staffId: 'a', message: 'Conflicting shift at another outlet.' },
  ];
  const html = renderToStaticMarkup(React.createElement(ScheduleValidationSummary, { issues, dirty: true }));
  assert.match(html, /2 employees have unassigned days/);
  assert.match(html, /Review missing days \(3\)/);
  assert.equal((html.match(/<strong[^>]*>Same name<\/strong>/g) ?? []).length, 2);
  assert.match(html, /Conflicting shift at another outlet/);
  assert.match(html, /Save your changes to refresh/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.equal(renderToStaticMarkup(React.createElement(ScheduleValidationSummary, { issues: [], dirty: false })), '');
});

test('Kitchen scheduling uses one role set in catalog, eligibility and completeness without granting workflow permissions', () => {
  const sql = fs.readFileSync('supabase/migrations/287_kitchen_schedule_eligibility.sql', 'utf8');
  for (const name of ['get_schedule_staff', 'get_schedule_staff_candidates', 'is_staff_schedule_eligible', 'validate_schedule_week']) {
    const fn = sql.split(`function public.${name}(`)[1]?.split('$$;')[0];
    assert.ok(fn, name);
    assert.match(fn, /'outlet_staff','outlet_supervisor','kitchen'/);
    assert.match(fn, /current_staff_company_id/);
  }
  assert.doesNotMatch(sql, /insert into public\.(?:role_permissions|staff_roles)|update public\.staffs/i);
  const catalog = fs.readFileSync('src/app/api/attendance/schedule/import-catalog/route.ts', 'utf8');
  assert.match(catalog, /\["outlet_staff", "outlet_supervisor", "kitchen", "chef"\]/);
});

test('schedule checks accept SQL timestamp days, deduplicate dates and preserve malformed blockers', () => {
  const { ScheduleValidationSummary } = load('src/components/attendance/schedule-validation-summary.tsx');
  const issues = ['2026-09-07T00:00:00+00:00', '2026-09-07', '2026-09-08T00:00:00+08:00', '2026-02-30', 'invalid'].map((workDate) => ({
    code: 'unresolved_staff_day', staffId: 'a', staffName: 'Employee A', workDate, message: `Unresolved: ${workDate}`,
  }));
  const html = renderToStaticMarkup(React.createElement(ScheduleValidationSummary, { issues, dirty: false }));
  assert.match(html, /Review missing days \(2\)/);
  assert.match(html, /dateTime="2026-09-07"/);
  assert.match(html, /dateTime="2026-09-08"/);
  assert.equal((html.match(/<time /g) ?? []).length, 2);
  assert.match(html, /Unresolved: 2026-02-30/);
  assert.match(html, /Unresolved: invalid/);
});
