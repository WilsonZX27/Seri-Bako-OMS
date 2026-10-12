const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(process.cwd(), "src/server/queries/production-jobs.ts"), "utf8");

test("production job list filters, sorts, counts, and pages in the database before bounded hydration", () => {
  const list = source.slice(source.indexOf("export async function getProductionJobs"), source.indexOf("export async function getProductionJob(id: string)"));
  assert.match(list, /select\("\*", \{ count: "exact" \}\)/);
  assert.match(list, /query\.range\(/);
  assert.match(list, /query\.order\(sort/);
  assert.doesNotMatch(list, /filterRows\(/);
  assert.match(list, /branches"\)\.select\("id, branch_name"\)\.in\("id", branchIds\)/);
  assert.match(list, /products"\)\.select\("id, product_code, product_name"\)\.in\("id", productIds\)/);
});

test("production job summary uses count-only reads instead of a full queue", () => {
  const summary = source.slice(source.indexOf("export async function getProductionJobSummary"), source.indexOf("export async function getProductionJob(id: string)"));
  assert.match(summary, /count: "exact", head: true/);
  assert.doesNotMatch(summary, /select\("\*"/);
});

test("production job detail only hydrates its branch and product", () => {
  const detail = source.slice(source.indexOf("export async function getProductionJob(id: string)"), source.indexOf("export async function getProductionJobFormOptions"));
  assert.match(detail, /branches"\)\.select\("id, branch_name"\)\.eq\("id", job\.branch_id\)\.maybeSingle\(\)/);
  assert.match(detail, /products"\)\.select\("id, product_code, product_name"\)\.eq\("id", job\.product_id\)\.maybeSingle\(\)/);
  assert.match(detail, /if \(ingredientError \|\| outputError\) throw new Error/);
});
