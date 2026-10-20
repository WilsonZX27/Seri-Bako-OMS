import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const navigation = fs.readFileSync("src/components/layout/mobile-app-navigation.tsx", "utf8");
const manifest = fs.readFileSync("src/app/manifest.ts", "utf8");
const rootLayout = fs.readFileSync("src/app/layout.tsx", "utf8");

test("mobile navigation omits installation promotion and retains account actions", () => {
  assert.doesNotMatch(navigation, /data-install-oms-app|Install full-screen app/);
  assert.match(navigation, /My Profile/);
  assert.match(navigation, /Logout/);
});

test("manifest and Apple metadata enable standalone launch", () => {
  assert.match(manifest, /display:\s*"standalone"/);
  assert.match(manifest, /start_url:\s*"\/dashboard"/);
  assert.match(rootLayout, /appleWebApp/);
  assert.match(rootLayout, /viewportFit:\s*"cover"/);
});
