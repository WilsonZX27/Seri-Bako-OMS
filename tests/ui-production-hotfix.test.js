const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('Inventory retains actions and overview ahead of chart', () => {
 const s=fs.readFileSync('src/app/(app)/inventory/page.tsx','utf8');
 for (const id of ['inventory-overview','inventory-actions']) {
  assert.equal(s.split(`id="${id}"`).length-1,1);
  assert.ok(s.indexOf(`id="${id}"`)<s.indexOf('id="inventory-movement-activity"'));
 }
 assert.match(s,/visibleModules\.map/);
 assert.match(s,/InventoryDailyMovementChart points=\{movement.rows\}/);
});
test('Due soon fills the finance tail row without changing amount or route', () => {
 const s=fs.readFileSync('src/components/dashboard-workspace.tsx','utf8');
 assert.match(s, /href="\/supplier-invoices\/cash-flow" label="Due soon" className="col-span-2" value=\{formatCurrency\(summary.payablesAttention.due_today_amount \+ summary.payablesAttention.due_next_7_amount\)\}/);
});
