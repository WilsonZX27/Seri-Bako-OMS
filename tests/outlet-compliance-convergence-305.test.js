const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("BOMBA is retired without deleting historical compliance evidence", () => {
  const migration = read("supabase/migrations/305_retire_bomba_outlet_requirement.sql");
  assert.match(migration, /type_code = 'BOMBA'/);
  assert.match(migration, /is_required = false/);
  assert.match(migration, /status = 'inactive'/);
  assert.doesNotMatch(migration, /delete from public\.(compliance_records|attachments)/);
});

test("Internet Service uses service-specific optional dates", () => {
  const page = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  const actions = read("src/server/actions/compliance.ts");
  assert.match(page, /type_code === "INTERNET_SERVICE"/);
  for (const label of ["Account \/ service number", "Service activated on", "Contract \/ renewal date", "Provider, plan, speed or support note"])
    assert.match(page, new RegExp(label));
  assert.match(page, /required=\{!isInternetService\}/);
  assert.match(actions, /type\.type_code !== "INTERNET_SERVICE"/);
});

test("People is the canonical employee directory", () => {
  const compatibility = read("src/app/(app)/staffs/page.tsx");
  const search = read("src/app/api/search/route.ts");
  assert.match(compatibility, /redirect\(query\.size \? `\/people\?/);
  assert.match(search, /href: `\/people\/\$\{staff\.id\}`/);
});
