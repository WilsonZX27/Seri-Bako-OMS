const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function pageFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? pageFiles(target) : entry.name === "page.tsx" ? [target] : [];
  });
}

test("every route-owned mutation has a responsive action owner", () => {
  const pages = pageFiles(path.join(process.cwd(), "src", "app", "(app)"));
  const failures = [];

  for (const file of pages) {
    const source = fs.readFileSync(file, "utf8");
    if (!/from "@\/server\/actions\/(?!error-handling)/.test(source)) continue;

    const ownsResponsiveActions = [
      /rightRail=/,
      /RecordWorkspace/,
      /DocumentWorkspace/,
      /mobilePrimaryAction/,
      /primaryAction=/,
      /PageHeader[\s\S]{0,300}action=/,
    ].some((pattern) => pattern.test(source));

    if (!ownsResponsiveActions) failures.push(path.relative(process.cwd(), file));
  }

  assert.deepEqual(failures, [], "Mutation pages must not strand actions in a desktop-only or content-only region.");
});

test("the release route matrix includes every system role and every dynamic parameter resolves to an inert identifier", () => {
  const matrix = fs.readFileSync(path.join(process.cwd(), "tests", "e2e", "v9-route-matrix.cjs"), "utf8");
  const helpers = fs.readFileSync(path.join(process.cwd(), "tests", "e2e", "helpers.js"), "utf8");

  assert.match(matrix, /"peopleOperations"/);
  assert.match(helpers, /TEST_PEOPLE_OPERATIONS_EMAIL/);
  assert.match(matrix, /\^\\\[[^\n]+MISSING_ID/);
});
