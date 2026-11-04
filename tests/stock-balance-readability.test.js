import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('src/components/stock-balance-workspace.tsx','utf8'),css=fs.readFileSync('src/app/design-system-v2.css','utf8');
test('Stock Balance dedicates bounded tracks to all nine fields and keeps narrower-canvas scrolling',()=>{
 const widths=JSON.parse(source.match(/<colgroup>\{(\[[\d, ]+\])/)[1]);assert.equal(widths.length,9);assert.equal(widths.reduce((a,b)=>a+b,0),100);
 assert.match(source,/mobileHidden scrollbar="auto" className="sb-stock-balance-table/);
 assert.match(css,/table\.sb-stock-balance-table \{ min-width:50rem; \}/);
 assert.doesNotMatch(css,/sb-stock-balance-table[^\n]*width:(?:70rem|9rem|12rem)/);
 for(const label of ['Available / Reserved','Current','Avg Cost / Value','Last Movement','Status'])assert.ok(source.includes(label));
 assert.match(source,/<StockBalanceTableRows rows=\{rows\} inBasket=\{inBasket\} onToggleBasket=\{toggleBasket\}/);
 assert.match(source,/<StockBalanceOperationalRows rows=\{rows\} inBasket=\{inBasket\} onToggleBasket=\{toggleBasket\}/);
});
