const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/server/queries/notifications.ts", "utf8");

test("current user scope resolves only the actor's active role relations", () => {
  const start = source.indexOf("export const getCurrentUserScope");
  const end = source.indexOf("export const getVisibleNotificationsForCurrentUser");
  const boundary = source.slice(start, end);

  assert.match(boundary, /roles\(role_code, status, deleted_at\)/);
  assert.match(boundary, /role\?\.status === "active" && role\.deleted_at === null/);
  assert.doesNotMatch(boundary, /from\("roles"\)\.select/);
  assert.doesNotMatch(boundary, /rolesResult/);
});
