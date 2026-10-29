const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
test('Branches status belongs to the Search form without a competing router navigation', () => {
  const page = fs.readFileSync('src/app/(app)/branches/page.tsx', 'utf8');
  assert.doesNotMatch(page, /StatusTabs/);
  assert.match(page, /<SelectControl key=\{filters.status \?\? "all"\} name="status" defaultValue=\{filters.status \?\? "all"\}/);
  assert.match(page, /value: "archived"/);
  assert.match(page, /<MasterDataFilters search=\{filters.search\}/);
});
