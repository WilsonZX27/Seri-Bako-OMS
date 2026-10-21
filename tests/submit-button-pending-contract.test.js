const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/components/ui/submit-button.tsx", "utf8");

test("external submit buttons release only when their form action settles", () => {
  assert.match(source, /export function FormPendingBridge/);
  assert.match(source, /sb:form-pending/);
  assert.match(source, /sawPending\.current/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setTimeout\(release, 120\)/);
});
