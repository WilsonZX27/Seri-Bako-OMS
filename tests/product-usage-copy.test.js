import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('product category help preserves the approved historical Usage boundary', () => {
  const source = fs.readFileSync('src/components/product-form.tsx', 'utf8');
  assert.match(source, /Enter Wastage and Tomorrow in Daily Records; historical Usage remains read-only/);
  assert.doesNotMatch(source, /Usage is recorded separately from wastage/);
  assert.match(source, /This does not set a fixed expiry date/);
});
