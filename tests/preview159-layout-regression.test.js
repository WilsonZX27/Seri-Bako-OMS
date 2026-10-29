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
