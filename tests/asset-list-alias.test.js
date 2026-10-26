const test = require('node:test');
const assert = require('node:assert/strict');
const {compile} = require('./helpers/render-workspaces.cjs');
const page = compile('src/app/(app)/asset-management/assets/page.tsx', {
  'next/navigation': {redirect: url => { throw new Error(url); }},
}).default;

test('legacy asset-list URL keeps filters and repeated parameters, while selecting only the assets view', async () => {
  await assert.rejects(page({searchParams: Promise.resolve({q: 'Kitchen & store', location: ['one', 'two'], page: '2', view: 'maintenance', missing: undefined})}), error => {
    const url = new URL(error.message, 'https://fixture.invalid');
    assert.equal(url.pathname, '/asset-management');
    assert.equal(url.searchParams.get('view'), 'assets');
    assert.equal(url.searchParams.get('q'), 'Kitchen & store');
    assert.deepEqual(url.searchParams.getAll('location'), ['one', 'two']);
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.has('missing'), false);
    return true;
  });
});
