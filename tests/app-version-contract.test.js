const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const packageVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const versionSource = fs.readFileSync(path.join(root, "src", "lib", "app-version.ts"), "utf8");
const authShell = fs.readFileSync(path.join(root, "src", "components", "auth", "auth-shell.tsx"), "utf8");
const sidebar = fs.readFileSync(path.join(root, "src", "components", "layout", "workspace-sidebar.tsx"), "utf8");

test("visible application version stays aligned with the package release", () => {
  assert.match(packageVersion, /^\d+\.\d+\.\d+$/);
  assert.match(versionSource, new RegExp(`APP_VERSION = "${packageVersion}"`));
  assert.match(versionSource, /APP_SPRINT = `v\$\{APP_VERSION\}`/);
  assert.match(versionSource, /APP_RELEASE_TITLE = "/);
  assert.match(versionSource, /APP_RELEASE_NOTE = `\$\{APP_SPRINT\} — \$\{APP_RELEASE_TITLE\}`/);
  assert.match(authShell, /APP_RELEASE_NOTE/);
  assert.match(sidebar, /APP_RELEASE_NOTE/);
  assert.doesNotMatch(authShell, />\{APP_SPRINT\}</);
  assert.doesNotMatch(sidebar, />\{APP_SPRINT\}</);
});
