const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("focused create and edit tasks retain the role navigation and safe action area", () => {
  const navigation = read("src/components/layout/mobile-app-navigation.tsx");
  const css = read("src/app/globals.css");

  assert.match(navigation, /const isFocusedTask =/);
  assert.match(navigation, /new\|edit/);
  assert.match(navigation, /root\.dataset\.mobileTaskPage = "true"/);
  assert.doesNotMatch(navigation, /if \(isFocusedTask\) return null/);
  assert.match(css, /html\[data-mobile-task-page="true"\][\s\S]*safe-area-inset-bottom/);
});

test("persistent phone actions replace bottom navigation and rely on the shared back affordance", () => {
  const console = read("src/components/layout/right-console.tsx");
  const context = read("src/components/layout/mobile-context-header.tsx");
  const css = read("src/app/globals.css");

  assert.match(console, /root\.dataset\.mobileActionPage = "true"/);
  assert.match(css, /data-mobile-action-page="true"[\s\S]*data-mobile-app-nav/);
  assert.match(css, /data-mobile-action-page="true"[\s\S]*bottom: 0 !important/);
  assert.match(context, /route\.backHref \?\? "\/dashboard"/);
  assert.match(context, /pathname === item\.href \? "\/dashboard" : item\.href/);
});

test("document detail actions own the phone bottom area even when the route is not new or edit", () => {
  const workspace = read("src/components/documents/document-workspace.tsx");
  const context = read("src/components/layout/mobile-context-header.tsx");
  const css = read("src/app/globals.css");

  assert.match(workspace, /data-mobile-document-action/);
  assert.match(css, /html:has\(\[data-mobile-document-action\]\) \[data-mobile-app-nav\][\s\S]*display: none/);
  assert.match(css, /html:has\(\[data-mobile-document-action\]\) \[data-mobile-document-action\][\s\S]*bottom: 0 !important/);
  assert.match(context, /if \(!context\.backHref\)/);
  assert.match(context, /href=\{context\.backHref\}/);
});

test("new purchase requests use one shared submit source on every viewport", () => {
  const page = read("src/app/(app)/purchase-requests/new/page.tsx");
  const form = read("src/components/procurement-forms.tsx");
  const mobile = read("src/components/documents/mobile-document-surfaces.tsx");

  assert.match(page, /mobilePrimaryAction=\{primaryAction\}/);
  assert.doesNotMatch(form, /rounded-full[\s\S]{0,300}aria-label="Submit PR"/);
  assert.doesNotMatch(form, /md:inline-flex">\s*Submit PR/);
  assert.match(form, /<summary[^>]*>Sourcing details <span[^>]*>\(automatic\)<\/span><\/summary>/);
  assert.match(mobile, /<details open className="hidden/);
});

test("production jobs retain direct access to planning and demand variance", () => {
  const jobs = read("src/app/(app)/production/jobs/page.tsx");

  assert.match(jobs, /href="\/production\/planning">Production Planning/);
  assert.match(jobs, /href="\/production\/variance">Demand Variance/);
});
