/* eslint-disable @typescript-eslint/no-require-imports -- Node source contract harness. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('weight review copy scopes the exception to KG lines without contradicting posted document status',()=>{
 for(const path of ['src/app/(app)/stock-counts/page.tsx','src/components/stock-count-weight-reviews.tsx']){
  const source=fs.readFileSync(path,'utf8');
  assert.match(source, path.includes("components/") ? /items not posted · weight review needed/ : /KG lines awaiting weight review · inventory unchanged/);
  assert.doesNotMatch(source,/weight reviews pending · not posted/);
 }
 assert.match(fs.readFileSync('src/app/(app)/stock-counts/page.tsx','utf8'),/StatusBadge status=\{row.status\}/);
});
