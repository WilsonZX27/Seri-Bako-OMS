const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const load = require('./helpers/load-source.cjs')({setTimeout, clearTimeout});
const {inventoryReadDeadline} = load('src/lib/inventory-read-deadline.ts');
test('stalled inventory read rejects instead of reporting empty or zero stock', async () => {
  await assert.rejects(inventoryReadDeadline(new Promise(() => {}), 5), /Inventory summary read timed out/);
});
test('successful summary and real read failures retain exact results', async () => {
  const summary = {lowStockItems: 7, movementUnavailable: true};
  assert.equal(await inventoryReadDeadline(Promise.resolve(summary), 50), summary);
  const error = new Error('synthetic read denied');
  await assert.rejects(inventoryReadDeadline(Promise.reject(error), 50), e => e === error);
});
test('late rejection remains handled and deadline is scoped only to inventory read', async () => {
  let reject;
  const pending = new Promise((_, r) => {reject = r;});
  await assert.rejects(inventoryReadDeadline(pending, 5));
  reject(new Error('late failure'));
  await new Promise(r => setImmediate(r));
  const page = fs.readFileSync('src/app/(app)/inventory/page.tsx','utf8');
  assert.match(page, /inventoryReadDeadline\(Promise\.all\(/);
  const boundary = fs.readFileSync('src/app/(app)/inventory/error.tsx','utf8');
  assert.match(boundary, /RecordDetailError/);
  assert.match(boundary, /collectionHref="\/dashboard"/);
  assert.doesNotMatch(page, /catch.*(?:return \[\]|return 0)/);
});
