const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("compliance upload rejects oversized files before submitting and repeats the same server limit", () => {
  const input = read("src/components/compliance-file-input.tsx");
  const actions = read("src/server/actions/compliance.ts");
  const page = read("src/app/(app)/outlet-compliance/[branchId]/page.tsx");
  assert.match(input, /COMPLIANCE_MAX_FILE_BYTES = 4 \* 1024 \* 1024/);
  assert.match(input, /event\.target\.value = ""/);
  assert.match(input, /role="alert"/);
  assert.match(input, /maximum 4 MB/);
  assert.equal((actions.match(/file\.size > 4 \* 1024 \* 1024/g) ?? []).length, 2);
  assert.match(page, /<ComplianceFileInput action=/);
});

test("Outlet Daily workflow states make pending, final and attention outcomes visually distinct", () => {
  const badge = read("src/components/ui/status-badge.tsx");
  assert.match(badge, /ready_to_post: "border-\[#8FB8DC\] bg-\[#E7F1FA\] text-\[#174F7A\]"/);
  assert.match(badge, /posted: "border-\[#075942\] bg-\[#075942\] text-white"/);
  assert.match(badge, /attention: "border-\[#D88400\] bg-\[#FFF0C2\]/);
  assert.match(badge, /record has not been posted yet/);
  assert.match(badge, /record is finalised and posted/);
  assert.match(badge, /record is posted but needs follow-up/);
});
