import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync("src/components/action-error-notice.tsx", "utf8");

test("shared action error notice targets the invalid control instead of only showing a toast", () => {
  assert.match(source, /"use client"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(source, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /border-rose-500/);
  assert.match(source, /ring-2/);
  assert.match(source, /disclosure\.open = true/);
});

test("high-impact create forms use the shared action error notice", () => {
  for (const page of [
    "src/app/(app)/stock-counts/new/page.tsx",
    "src/app/(app)/purchase-requests/new/page.tsx",
    "src/app/(app)/goods-receivings/new/page.tsx",
    "src/app/(app)/stock-wastage/new/page.tsx",
    "src/app/(app)/stock-transfers/new/page.tsx",
    "src/app/(app)/purchase-returns/new/page.tsx",
    "src/app/(app)/supplier-invoices/new/page.tsx",
    "src/app/(app)/production/jobs/new/page.tsx",
  ]) {
    const pageSource = fs.readFileSync(page, "utf8");
    assert.match(pageSource, /ActionErrorNotice/);
    assert.doesNotMatch(pageSource, /filters\.error \? <Card|params\.error \? <Card/);
  }
});
