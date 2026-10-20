const test = require('node:test');
const assert = require('node:assert/strict');
const load = require('./helpers/load-source.cjs')();
const { formatStockCountQuantity, stockCountQuantityInput, stockCountInputStep } = load('src/lib/stock-count-quantity.ts');
const { stockCountSchema } = load('src/lib/validations/stock-count.ts');
const payload = (value, uom = 'KG') => ({ count_date: '2026-10-18', branch_id: '11111111-1111-4111-8111-111111111111', lines: [{ item_id: '22222222-2222-4222-8222-222222222222', theoretical_qty: '0.112', physical_qty: String(value), uom }] });
test('count input, validation and display preserve three decimals and legacy four decimals', () => {
  for (const value of [0.112, 0.108, 0, 0.001, 999999.999, 1000000, 12, 0.1123]) {
    assert.equal(stockCountQuantityInput(value), String(value));
    assert.equal(Number(formatStockCountQuantity(value).replaceAll(',', '')), value);
    assert.equal(stockCountSchema.parse(payload(value)).lines[0].physical_qty, value);
  }
  assert.equal(formatStockCountQuantity(0.108 - 0.112), '-0.004');
  assert.equal(stockCountInputStep('KG', '0.112'), 0.001);
  assert.equal(stockCountInputStep('KG', '0.1123'), 0.0001);
  assert.equal(stockCountInputStep('PCS', '1'), 1);
});
test('invalid bounds and existing whole-unit rules remain enforced, without silent rounding', () => {
  for (const value of [-0.001, 1000000.001, 0.11234, Infinity]) assert.equal(stockCountSchema.safeParse(payload(value)).success, false);
  assert.equal(stockCountSchema.safeParse(payload(0.112, 'PCS')).success, false);
  assert.equal(stockCountQuantityInput(0.11234), '0.11234');
});
