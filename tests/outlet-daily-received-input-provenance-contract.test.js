const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("outlet daily detail inputs cannot render an unverified receipt as zero", () => {
  const form = read("src", "components", "outlet-daily-record-form.tsx");

  assert.match(form, /line\?\.morning_received_provided === true/);
  assert.match(form, /receivedIsKnown && source\?\.morning_received_qty != null/);
  assert.match(form, /placeholder=\{receivedIsKnown \? undefined : "—"\}/);
  assert.match(form, /!receivedIsKnown \? " · Received unverified" : ""/);
  assert.match(form, /title=\{receivedIsKnown \? undefined : "Received quantity has not been verified"\}/);
  assert.match(form, /data-received-unverified=\{!receivedIsKnown \? "true" : undefined\}/);
});
