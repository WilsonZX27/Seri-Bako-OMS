const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

test("stock count autosave preserves the canonical Draft to Confirm and Post workflow", () => {
  const actions = read("src", "server", "actions", "stock-counts.ts");
  const detail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");

  assert.match(actions, /autosaveNewStockCount[\s\S]*createStockCountRecord/);
  assert.match(actions, /autosaveStockCountDraft[\s\S]*updateStockCountDraftRecord/);
  assert.match(actions, /saveAndPostStockCount[\s\S]*updateStockCountDraftRecord[\s\S]*postStockCount/);
  assert.match(detail, /formId=\{canEdit \? formId : undefined\}/);
  assert.match(detail, /Your latest entries will be saved before posting/);
  assert.doesNotMatch(actions, /submitStockCount|reviewStockCount|approveStockCount/);
});

test("stock count form keeps a local recovery snapshot and reports server save state", () => {
  const form = read("src", "components", "stock-count-form.tsx");

  assert.match(form, /window\.localStorage\.setItem\(localStorageKey/);
  assert.match(form, /window\.localStorage\.getItem\(localStorageKey\)/);
  assert.match(form, /document\.visibilityState === "hidden"/);
  assert.match(form, /Saving…/);
  assert.match(form, /Recovered unsaved changes/);
  assert.match(form, /Save failed — retrying/);
  assert.match(form, /role="status" aria-live="polite"/);
});

test("applied Central Kitchen PR history is retired forward without shipping its API", () => {
  assert.equal(existsSync(join(root, "supabase", "migrations", "111_central_kitchen_purchase_request_atomic.sql")), true);
  assert.equal(existsSync(join(root, "supabase", "migrations", "112_restrict_central_kitchen_pr_rpc_acl.sql")), true);
  assert.equal(existsSync(join(root, "supabase", "migrations", "113_retire_central_kitchen_pr_reservation_workflow.sql")), true);
  assert.equal(existsSync(join(root, "src", "app", "api", "central-kitchen")), false);
});
