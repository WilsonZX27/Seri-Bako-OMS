import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const appLayout = fs.readFileSync("src/app/(app)/layout.tsx", "utf8");

test("mobile and tablet use document scrolling so browser chrome can collapse", () => {
  assert.match(appLayout, /data-app-shell[^\n]*min-h-dvh[^\n]*xl:h-dvh xl:overflow-hidden/);
  assert.match(appLayout, /id="main-content" className="[^\"]*xl:overflow-y-auto/);
  assert.doesNotMatch(appLayout, /id="main-content" className="[^\"]*\boverflow-y-auto\b[^\"]*xl:overflow-y-auto/);
});

test("desktop retains the fixed-height enterprise workspace", () => {
  assert.match(appLayout, /xl:h-dvh/);
  assert.match(appLayout, /data-center-workspace[^\n]*xl:overflow-hidden/);
});
