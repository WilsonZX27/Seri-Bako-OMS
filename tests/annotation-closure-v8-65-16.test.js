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

test("Outlet Daily aligns quantities and details in five desktop columns", () => {
  const form = read("src/components/outlet-daily-record-form.tsx");
  assert.match(form, /sb-daily-line-head/);
  assert.match(form, /sb-daily-product-line/);
  const css=read("src/app/design-system-v2.css");
  assert.match(css, /grid-template-columns: minmax\(180px, 2fr\) repeat\(4, minmax\(72px, 1fr\)\)/);
  assert.match(form, /tracking !== "food_daily" \? <span>/);
  assert.match(form, /xl:col-start-2 xl:col-span-4/);
  assert.doesNotMatch(form, />Sold out</);
  assert.match(form, /type="hidden" name="stockout"/);
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
