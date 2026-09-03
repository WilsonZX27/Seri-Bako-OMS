const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (path) => fs.readFileSync(path, "utf8");
const form = read("src/components/procurement-forms.tsx");
const newPage = read("src/app/(app)/purchase-orders/new/page.tsx");
const detail = read("src/app/(app)/purchase-orders/[id]/page.tsx");
const action = read("src/server/actions/procurement.ts");
const permissions = read("src/server/auth/permissions.ts");
const receiving = read("src/components/goods-receiving-form.tsx");
const draftEditor = read("src/components/goods-receiving-draft-editor.tsx");
const migration = read("supabase/migrations/252_direct_autocount_po_and_kitchen_receiving.sql");

test("direct PO requires the exact AutoCount number and bypasses document sequencing", () => {
  assert.match(form, /label="AutoCount PO Number" required/);
  assert.match(form, /name="po_no" required/);
  assert.doesNotMatch(form, /PO-AUTO/);
  assert.doesNotMatch(action.match(/export async function createPurchaseOrder[\s\S]*?\n\}/)?.[0] ?? "", /resolveDocumentNumber/);
  assert.match(newPage, /status="approved"[\s\S]*currentStatus="approved"/);
  assert.doesNotMatch(newPage, /pending_approval|Manager reviews/);
});

test("obsolete PO approval is absent from UI, actions, grants, and RPC", () => {
  assert.doesNotMatch(detail, /Approve as Manager|po\.approve|po\.submit/);
  assert.doesNotMatch(action, /export async function (submit|approve|reject)PurchaseOrder/);
  assert.match(migration, /p_action in \('submit','approve','reject'\)[\s\S]*do not use a manager approval workflow/);
  assert.match(migration, /permission_code in \('po\.submit','purchase_order\.submit','po\.approve','purchase_order\.approve'\)/);
  assert.match(migration, /'approved','not_required','Ready to send supplier'/);
});

test("migration safely corrects the PO number and restores Kitchen receiving authority", () => {
  assert.match(migration, /po_no = 'PO\/SEP26\/001'/);
  assert.match(migration, /PO - 000207 already exists/);
  assert.match(migration, /from_po_no','PO\/SEP26\/001','to_po_no','PO - 000207'/);
  for (const code of ["po.receive", "grn.create", "goods_receiving.create", "grn.post", "goods_receiving.post"]) {
    assert.match(migration, new RegExp(code.replace(".", "\\.")));
    assert.match(permissions, new RegExp(`kitchen:[\\s\\S]*?"${code.replace(".", "\\.")}"`));
  }
  assert.doesNotMatch(permissions.match(/manager: \[[^\n]+/)?.[0] ?? "", /po\.approve/);
});

test("receiving uses one compact quantity-first grammar with visible traceability", () => {
  assert.match(receiving, />Traceability</);
  assert.match(receiving, /1 \{line\.uom\} =/);
  assert.doesNotMatch(receiving, /Confirm the pack conversion once|<details/);
  assert.doesNotMatch(draftEditor, /min-w-\[720px\]|<table/);
  assert.match(draftEditor, /Pending[\s\S]*Received · \{line\.uom\}[\s\S]*Rejected · \{line\.uom\}/);
});
