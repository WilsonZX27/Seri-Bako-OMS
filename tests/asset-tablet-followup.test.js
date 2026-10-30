const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');
test('Asset compact filters use one form and explicitly opt into inline submission', () => {
 const page=read('src/app/(app)/asset-management/page.tsx');
 assert.match(page,/compactAutoSubmit=\{view !== "assets"\}/);
 assert.match(page,/tabletMode=\{view === "assets" \? "auto" : "inline"\}/);
 assert.doesNotMatch(page,/stableResponsive=/);
 const header=read('src/components/common/UnifiedListHeader.tsx');
 assert.match(header,/compactAutoSubmit = false/);
 assert.match(header,/compactAutoSubmit && compactInline \? queryControl\(editable, index\) : editable/);
 assert.match(header,/compactAutoSubmit && compactInline && resolvedPhoneMode === "inline" && isHiddenControl\(child\)/);
 assert.match(header,/compactPinnedFields.length \|\| compactAutoSubmit/);
});
test('Asset tablet metrics and compact query sizing remain in a local CSS module', () => {
 const css=read('src/app/(app)/asset-management/annotation21.module.css');
 assert.match(css,/\.overviewMetrics[\s\S]*?repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/\.maintenanceMetrics[\s\S]*?repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.compactQuery[\s\S]*?--sb-control-height: 2.75rem/);
 assert.match(css,/\.unified-list-inline-fields\) \{ display: contents !important/);
 assert.match(css,/max-width:639px/);
});
