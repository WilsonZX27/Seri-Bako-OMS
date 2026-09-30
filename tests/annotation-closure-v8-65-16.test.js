const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("shared number inputs block accidental wheel and arrow stepping", () => {
  const input = read("src/components/ui/input.tsx");
  assert.match(input, /type === "number" && \(event\.key === "ArrowUp" \|\| event\.key === "ArrowDown"\)/);
  assert.match(input, /event\.preventDefault\(\)/);
  assert.match(input, /type === "number" && event\.currentTarget === document\.activeElement/);
  assert.match(input, /event\.currentTarget\.blur\(\)/);
});

test("Outlet Daily uses one six-column authority only at wide desktop", () => {
  const form = read("src/components/outlet-daily-record-form.tsx");
  const wideGrid = /xl:grid-cols-\[minmax\(12rem,1fr\)_repeat\(3,minmax\(4\.5rem,6rem\)\)_minmax\(7rem,9rem\)_minmax\(12rem,1\.5fr\)\]/g;
  assert.equal(form.match(wideGrid)?.length, 2);
  assert.match(form, /Daily Product Lines<\/h2>/);
  assert.match(form, /hidden xl:col-span-2 xl:block">Wastage details/);
  assert.match(form, /grid-cols-\[7\.5rem_minmax\(0,1fr\)\][^\n]+xl:contents/);
  assert.doesNotMatch(form, /grid-cols-\[7\.5rem_minmax\(0,1fr\)\][^\n]+md:contents/);
});

test("dashboard headers and workflow identities have one semantic visual authority", () => {
  const design = read("src/app/design-system-v2.css");
  const badge = read("src/components/ui/status-badge.tsx");
  assert.match(design, /--sb-dashboard-header-surface:\s*#d7e7df/);
  assert.match(design, /\[data-status-icon\]::before\s*\{\s*display:\s*none/);
  for (const icon of ["ShieldCheck", "ShoppingCart", "Landmark", "Send", "CircleCheck", "CircleX"]) {
    assert.match(badge, new RegExp(icon));
  }
  assert.match(badge, /aria-hidden="true"/);
});

test("Goods Receiving keeps concise DO copy and meaningful action icons", () => {
  const detail = read("src/app/(app)/goods-receivings/[id]/page.tsx");
  const guard = read("src/components/documents/receiving-post-guard.tsx");
  const upload = read("src/components/documents/attachment-upload-form.tsx");
  assert.doesNotMatch(detail, /Attach the supplier DO before posting\. Upload a replacement before removing a mistaken draft file\./);
  assert.doesNotMatch(detail, /Attach the Delivery Order or document an exception before posting\./);
  assert.match(detail, /uploadLabel="Attach DO"/);
  assert.match(detail, /ReceivingPostGuard/);
  assert.match(detail, /required=\{receiving\.status === "draft"\}/);
  assert.match(guard, /Delivery Order required/);
  assert.match(guard, /Post with exception/);
  assert.match(detail, /ExternalLink/);
  assert.match(upload, /<Upload[^>]+aria-hidden="true"/);
});
