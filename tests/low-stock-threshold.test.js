const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/load-source.cjs')();
const { matchesStockThreshold } = load('src/lib/low-stock-threshold.ts');
test('threshold filters strictly below the selected base unit without conversion', () => {
 assert.equal(matchesStockThreshold(9.999, 'KG', '10', 'kg'), true);
 assert.equal(matchesStockThreshold(10, 'KG', '10', 'KG'), false);
 assert.equal(matchesStockThreshold(2, 'PCS', '10', 'KG'), false);
 assert.equal(matchesStockThreshold(999, 'g', '10', 'KG'), false);
 assert.equal(matchesStockThreshold(-1, 'KG', '0', 'KG'), true);
 for (const limit of ['', '-1', 'oops', 'Infinity']) assert.equal(matchesStockThreshold(20, 'KG', limit, 'KG'), true);
});
