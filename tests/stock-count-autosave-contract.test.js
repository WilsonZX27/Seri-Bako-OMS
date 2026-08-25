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

test("stock count keeps an explicit cancel path for unposted autosaved work", () => {
  const detail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");
  assert.match(detail, /cancelStockCount/);
  assert.match(detail, /const canCancel = \(count\.status === "draft" \|\| isLegacyPending\)/);
  assert.match(detail, /buttonLabel="Cancel stock count"/);
  assert.match(detail, /preserving its audit history/);
  assert.match(detail, /const secondaryActions = cancelControl/);
});

test("stock count form keeps a local recovery snapshot and reports server save state", () => {
  const form = read("src", "components", "stock-count-form.tsx");
  const detail = read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx");
  const actions = read("src", "server", "actions", "stock-counts.ts");

  assert.match(form, /window\.localStorage\.setItem\(localStorageKey/);
  assert.match(form, /window\.localStorage\.getItem\(localStorageKey\)/);
  assert.match(form, /document\.visibilityState === "hidden"/);
  assert.match(form, /useState<"name" \| "code">\("code"\)/);
  assert.match(form, /seri-bako:stock-count-sort/);
  assert.doesNotMatch(form, /setSortBy\("name"\)/);
  assert.match(form, /Saving…/);
  assert.match(form, /Recovered unsaved changes/);
  assert.match(form, /Save failed — retrying/);
  assert.match(form, /Save failed — changes kept locally/);
  assert.match(form, /MAX_AUTOSAVE_RETRIES = 3/);
  assert.match(form, /retryAttempts\.current < MAX_AUTOSAVE_RETRIES/);
  assert.match(form, /role="status"/);
  assert.match(form, /aria-live="polite"/);
  assert.match(form, /Progress saved on this device/);
  assert.match(form, /physicalValues\.some\(\(value\) => value\.trim\(\) === ""\)/);
  assert.match(form, /completedCount\} of \{lines\.length\} counted/);
  assert.match(form, /version: 2/);
  assert.match(form, /const isLegacySnapshot = snapshot\.version !== 2/);
  assert.match(form, /adjusted: isLegacySnapshot \? false/);
  assert.doesNotMatch(form, /snapshot\.version !== 2 \|\| snapshot\.branchId/);
  assert.doesNotMatch(form, /snapshot\.lines\.length !== seedLines\.length/);
  assert.match(form, /saved\.physicalQty === saved\.initialPhysicalQty/);
  assert.doesNotMatch(form, /values ready/);
  assert.match(form, /onSubmit=\{handleSubmit\}/);
  assert.match(form, /setShowMissingOnly\(true\)/);
  assert.match(form, /scrollIntoView\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(form, /input\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(form, /still need a count/);
  assert.match(form, /aria-invalid=\{validationAttempted && !hasPhysical\}/);
  assert.doesNotMatch(form, /disabled=\{!countComplete\}/);
  assert.doesNotMatch(detail, /mobileWorkflowTrailing/);
  assert.doesNotMatch(detail, /StockCountAutosaveStatus/);
  assert.match(detail, /mobilePrimaryAction = hasPrimaryAction/);
  assert.match(detail, /label="Post count"/);
  assert.match(actions, /autosaveStockCountDraft[\s\S]*updateStockCountDraftRecord\(id, formData, \{ revalidate: false \}\)/);
});

test("stock count decimal validation tolerates floating point tails and autosave does not retry validation failures", () => {
  const validation = read("src", "lib", "validations", "stock-count.ts");
  const form = read("src", "components", "stock-count-form.tsx");
  const actions = read("src", "server", "actions", "stock-counts.ts");
  const errors = read("src", "server", "actions", "error-handling.ts");

  assert.match(validation, /stockCountHasAtMostFourDecimals/);
  assert.match(validation, /Number\.EPSILON/);
  assert.doesNotMatch(validation, /Number\.isInteger\(line\.physical_qty \* 10_000\)/);
  assert.match(actions, /retryable: kind === "database_unavailable"/);
  assert.match(form, /result\.retryable === false/);
  assert.match(form, /AUTOSAVE_DEBOUNCE_MS = 12_000/);
  assert.match(errors, /error\.name === "ZodError"\) return "validation_failed"/);
  assert.match(errors, /normalized\.includes\("current state"\)/);
});

test("applied Central Kitchen PR history is retired forward without shipping its API", () => {
  assert.equal(existsSync(join(root, "supabase", "migrations", "111_central_kitchen_purchase_request_atomic.sql")), true);
  assert.equal(existsSync(join(root, "supabase", "migrations", "112_restrict_central_kitchen_pr_rpc_acl.sql")), true);
  assert.equal(existsSync(join(root, "supabase", "migrations", "113_retire_central_kitchen_pr_reservation_workflow.sql")), true);
  assert.equal(existsSync(join(root, "src", "app", "api", "central-kitchen")), false);
});
