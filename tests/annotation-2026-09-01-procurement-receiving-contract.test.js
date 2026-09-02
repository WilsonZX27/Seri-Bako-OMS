import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("procurement workflow badges distinguish sent, approved, and received", () => {
  const badge = read("src/components/ui/status-badge.tsx");
  assert.match(badge, /sent: "border-\[#BFDDE2\] bg-\[#E2F2F4\] text-\[#145D68\]"/);
  assert.match(badge, /received: "border-\[#075942\] bg-\[#075942\] text-white"/);
  assert.match(badge, /"approved"[\s\S]*\? "success"/);
});

test("attachment label fails inline with a strong field error", () => {
  const upload = read("src/components/documents/attachment-upload-form.tsx");
  assert.match(upload, /Attachment label is required\./);
  assert.match(upload, /labelRef\.current\?\.focus\(\)/);
  assert.match(upload, /required error=\{labelError/);
  assert.match(upload, /border-destructive ring-2/);
});

test("sales fallback preserves confirmed state and uses warning feedback", () => {
  const action = read("src/server/actions/outlet-daily-records.ts");
  const toast = read("src/components/global-action-toast.tsx");
  assert.match(action, /beforeRecord\.data\?\.status === "morning_recorded" \? "morning_recorded" : "draft"/);
  assert.match(action, /salesReconciliationUnavailable \? "warning" : "success"/);
  assert.match(toast, /searchParams\.get\("warning"\)/);
  assert.match(toast, /sb-warning-bg/);
});

test("draft GRNs support controlled receiving edits and audited over-receipt", () => {
  const detail = read("src/app/(app)/goods-receivings/[id]/page.tsx");
  const editor = read("src/components/goods-receiving-draft-editor.tsx");
  const action = read("src/server/actions/goods-receivings.ts");
  const migration = read("supabase/migrations/240_editable_goods_receiving_and_controlled_over_receipt.sql");
  assert.match(detail, /GoodsReceivingDraftEditor/);
  assert.match(editor, /Save received quantities/);
  assert.match(editor, /Over-receipt reason/);
  assert.match(action, /update_goods_receiving_draft_atomic/);
  assert.match(migration, /over_receipt_reason text/);
  assert.match(migration, /draft_receiving_updated/);
  assert.match(migration, /permission_code in \('grn\.post','goods_receiving\.post'\)/);
  assert.match(migration, /line\.received_qty\+line\.rejected_qty>greatest[\s\S]*over_receipt_reason/);
});

test("new GRNs use the same controlled over-receipt rule as draft edits", () => {
  const form = read("src/components/goods-receiving-form.tsx");
  const validation = read("src/lib/validations/procurement.ts");
  const action = read("src/server/actions/goods-receivings.ts");
  const migration = read("supabase/migrations/240_editable_goods_receiving_and_controlled_over_receipt.sql");
  assert.doesNotMatch(form, /max=\{line\.pending_qty\}/);
  assert.match(form, /name="line_over_receipt_reason"/);
  assert.match(form, /Entered total exceeds the remaining PO quantity/);
  assert.match(validation, /over_receipt_reason: optionalShortText/);
  assert.match(action, /line_over_receipt_reason/);
  assert.match(migration, /create or replace function public\.create_goods_receiving_atomic/);
  assert.match(migration, /over_receipt_reason/);
});

test("right console keeps document sections visually separate", () => {
  const console = read("src/components/layout/right-console.tsx");
  assert.match(console, /h-full space-y-4 overflow-y-auto/);
});
