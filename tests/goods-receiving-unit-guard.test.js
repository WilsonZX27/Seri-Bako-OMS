import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('src/app/(app)/goods-receivings/page.tsx','utf8');
test('GRN overview does not present mixed-unit quantity sums as valid totals',()=>{
 assert.doesNotMatch(source,/receiving\.(received_total|rejected_total)|summary\.(receivedTotal|rejectedTotal)/);
 assert.match(source,/Quantities across units are not combined/);
 assert.match(source,/formatNumber\(receiving.line_count\)/);
 assert.match(source,/View quantities for/);
});
test('receipt details retain received and rejected quantities with their unit',()=>{
 const detail=fs.readFileSync('src/app/(app)/goods-receivings/[id]/page.tsx','utf8');
 assert.match(detail,/received_qty/);assert.match(detail,/rejected_qty/);assert.match(detail,/uom/);
});
