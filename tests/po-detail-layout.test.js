import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('src/app/(app)/purchase-orders/[id]/page.tsx','utf8');
test('PO detail bounds its ten columns while preserving their data and smaller-canvas scrolling',()=>{
 const columns=JSON.parse(source.match(/<colgroup>\{(\[[\d, ]+\])/)[1]);assert.equal(columns.length,10);assert.equal(columns.reduce((a,b)=>a+b,0),100);
 assert.match(source,/minWidth: "46rem" \}\} scrollbar="auto" mobileHidden aria-label="Ordered items"/);
 for(const field of ['qty_ordered','qty_received','qty_cancelled','uom','unit_price','remarks'])assert.ok(source.includes('line.'+field));
 assert.match(source,/formatCurrency\(line.qty_ordered \* line.unit_price\)/);
 assert.match(source,/xl:hidden" role="list" aria-label="Ordered items"/);
 assert.match(source,/break-words text-xs text-muted-foreground">\{line.remarks/);
});
