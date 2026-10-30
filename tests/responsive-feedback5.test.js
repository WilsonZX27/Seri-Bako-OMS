const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('src/app/design-system-v2.css','utf8');
test('daily four-column metrics are excluded from generic definition-list stacking',()=>{
 assert.ok(css.includes('dl:not([data-dashboard-context], .sb-daily-record-metrics):has(> div > dt)'));
 assert.ok(css.includes('dl:not(.sb-daily-record-metrics) > div:not(:has(> svg))'));
 assert.match(css, /\.sb-daily-record-metrics \{\s*display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});
test('packaging keeps tablet rail and inline filter controls',()=>{
 const source=fs.readFileSync('src/components/outlet-packaging-report.tsx','utf8');
 assert.ok(source.includes('tabletRailMode="split" tabletRailBreakpoint="md"'));
 assert.ok(source.includes('phoneMode="inline" tabletMode="inline"'));
});
test('transfers have desktop semantic columns and a complementary compact list',()=>{
 const source=fs.readFileSync('src/components/asset-transfer-rows.tsx','utf8');
 assert.ok(source.includes('<Table mobileHidden aria-label="Asset transfers">'));
 for(const label of ['Date','From','To','Assets','Quantity','Status','Requested by'])assert.ok(source.includes(`<TableHead>${label}</TableHead>`));
 assert.ok(source.includes('<ul className="xl:hidden'));
});
test('daily desktop filters remain explicit without the more-filters disclosure',()=>{
 const source=fs.readFileSync('src/app/(app)/outlet-daily-records/page.tsx','utf8');
 assert.ok(!source.includes('FilterBarMore'));
 for(const name of ['date','branch','status','sent_state'])assert.ok(source.includes(`name="${name}"`));
 assert.ok(source.includes('canViewSentGaps ? <SelectControl name="sent_state"'));
});
test('generic description-list declarations stay identical outside the daily opt-out',()=>{
 const {execFileSync}=require('node:child_process');
 const baseline=execFileSync('git',['show','04dbbb92d961ca6327ffdef43ac4d861092872e1:src/app/design-system-v2.css'],{encoding:'utf8'});
 const restored=css.replaceAll('dl:not([data-dashboard-context], .sb-daily-record-metrics)','dl:not([data-dashboard-context])').replaceAll('dl:not(.sb-daily-record-metrics) > div','dl > div');
 assert.equal(restored,baseline);
});
