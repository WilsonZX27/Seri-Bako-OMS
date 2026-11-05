import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('draft count cards reserve one column below 390 and retain desktop rows',()=>{
 const source=fs.readFileSync('src/components/stock-count-form.tsx','utf8');
 assert.match(source,/grid grid-cols-1 gap-2 p-2 min-\[390px\]:grid-cols-2 lg:block lg:divide-y lg:gap-0 lg:p-0/);
});
