const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const read = (file) => fs.readFileSync(file, "utf8");

test("mistaken attachments can be removed before finalization without weakening the audit trail", () => {
  const panel = read("src/components/documents/document-panels.tsx");
  const removeAction = read("src/components/documents/attachment-remove-action.tsx");
  const server = read("src/server/actions/documents.ts");

  assert.match(panel, /\["draft", "pending_approval"\]\.includes\(document\.status\)/);
  assert.match(panel, /Attachments are locked after approval or posting/);
  assert.match(removeAction, /Remove this mistaken upload\?/);
  assert.match(removeAction, /Keep file/);
  assert.match(server, /Attachments can only be removed while the document is draft or pending approval/);
  assert.match(server, /status: "archived"/);
});

test("password profile lookup failures stop safely instead of redirecting in a loop", () => {
  const page = read("src/app/(auth)/change-password/page.tsx");
  const middleware = read("src/lib/supabase/middleware.ts");
  assert.match(page, /staffError \|\| !staff/);
  assert.match(page, /Account check unavailable/);
  assert.match(page, /Sign out safely/);
  assert.match(middleware, /staff\?\.status === "invited" && !isPublicRoute && !isPasswordChangeRoute/);
});

test("Administration is canonical while Settings remains a compatibility redirect", () => {
  assert.equal(fs.existsSync("src/app/(app)/administration/page.tsx"), true);
  assert.match(read("src/app/(app)/settings/page.tsx"), /redirect\("\/administration"\)/);
  assert.match(read("src/components/layout/breadcrumbs.tsx"), /label: "Administration", href: "\/administration"/);
  assert.match(read("src/server/auth/route-permissions.ts"), /"\/administration": \["company\.read", "staffs\.read", "roles\.read"\]/);
});
