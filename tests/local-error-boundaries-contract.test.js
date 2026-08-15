import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");
const shared = read("src/components/ui/record-detail-error.tsx");

test("record detail errors distinguish missing records from failed verification", () => {
  assert.match(shared, /Cannot coerce the result to a single JSON object/);
  assert.match(shared, /Do not assume it was removed or changed/);
  assert.match(shared, /Reference: \$\{error\.digest\}/);
  assert.match(shared, /!missingRecord \? <Button[^>]*onClick=\{reset\}>Retry/);
  assert.match(shared, /Back to \{collectionLabel\}/);
  assert.equal((shared.match(/min-h-11 xl:min-h-9/g) ?? []).length, 2);
});

test("document and procurement detail boundaries reuse the trustworthy shared recovery", () => {
  for (const file of [
    "src/app/(app)/documents/[id]/error.tsx",
    "src/app/(app)/purchase-orders/[id]/error.tsx",
    "src/app/(app)/purchase-requests/[id]/error.tsx",
    "src/app/(app)/purchase-returns/[id]/error.tsx",
  ]) {
    const source = read(file);
    assert.match(source, /<RecordDetailError error=\{error\} reset=\{reset\}/, file);
    assert.doesNotMatch(source, /may not exist, or you may not have access/, file);
  }
});

test("remaining local boundaries expose both retry and safe escape with touch targets", () => {
  const production = read("src/app/(app)/production/jobs/error.tsx");
  const aging = read("src/app/(app)/supplier-invoices/aging/error.tsx");
  const cashFlow = read("src/app/(app)/supplier-invoices/cash-flow/error.tsx");
  const auth = read("src/app/(auth)/error.tsx");
  assert.match(production, /Do not assume there are no production jobs/);
  assert.match(production, /Back to production/);
  for (const report of [aging, cashFlow]) {
    assert.match(report, /Back to reports/);
    assert.equal((report.match(/min-h-11 xl:min-h-9/g) ?? []).length, 2);
  }
  assert.equal((auth.match(/min-h-11/g) ?? []).length, 2);
});
