const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const read = (path) => fs.readFileSync(path, 'utf8');

test('dashboard role/scope keeps its flex owner instead of global definition grid', () => {
  assert.match(read('src/components/dashboard-workspace.tsx'), /<dl data-dashboard-context className="flex/);
  assert.match(read('src/app/design-system-v2.css'), /dl:not\(\[data-dashboard-context\]\):has\(> div > dt\)/);
});

test('content-aligned desktop rail is opt-in and the stock-transfer caller opts in', () => {
  const workspace = read('src/components/layout/workspace-layout.tsx');
  assert.match(workspace, /desktopRailPlacement = "shell"/);
  assert.match(workspace, /hideDesktopConsole=\{hideDesktopConsole \|\| desktopRailPlacement === "content"\}/);
  assert.match(read('src/app/(app)/stock-transfers/new/page.tsx'), /desktopRailPlacement="content"/);
  assert.doesNotMatch(read('src/app/(app)/purchase-orders/[id]/page.tsx'), /desktopRailPlacement="content"/);
  assert.match(read('src/app/design-system-v2.css'), /\[data-tablet-document-split\]\[data-desktop-rail-placement="content"\]/);
});

 test('asset detail retains its single identity on phones without changing list headers', () => {
  assert.match(read('src/app/(app)/asset-management/assets/[id]/page.tsx'), /<PageHeader showMobileIdentity/);
  assert.match(read('src/components/ui/page-header.tsx'), /data-mobile-identity=\{props.showMobileIdentity \|\| undefined\}/);
  assert.match(read('src/app/design-system-v2.css'), /\[data-page-header\]:not\(\[data-mobile-identity\]\)/);
});
