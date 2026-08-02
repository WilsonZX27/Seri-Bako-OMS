const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const utils = read("src", "lib", "utils.ts");
const input = read("src", "components", "ui", "input.tsx");
const targetSources = [
  read("src", "app", "(app)", "stock-counts", "page.tsx"),
  read("src", "app", "(app)", "stock-counts", "[id]", "page.tsx"),
  read("src", "components", "stock-count-form.tsx"),
  read("src", "app", "(app)", "suppliers", "[id]", "page.tsx"),
  read("src", "app", "(app)", "stock-transactions", "page.tsx"),
  read("src", "app", "(app)", "stock-transactions", "[id]", "page.tsx"),
  read("src", "app", "(app)", "goods-receivings", "page.tsx"),
  read("src", "app", "(app)", "goods-receivings", "[id]", "page.tsx"),
  read("src", "components", "goods-receiving-form.tsx"),
  read("src", "app", "(app)", "purchase-requests", "page.tsx"),
  read("src", "app", "(app)", "purchase-requests", "[id]", "page.tsx"),
  read("src", "app", "(app)", "purchase-orders", "page.tsx"),
  read("src", "app", "(app)", "purchase-orders", "[id]", "page.tsx"),
  read("src", "app", "(app)", "stock-transfers", "page.tsx"),
  read("src", "app", "(app)", "stock-transfers", "[id]", "page.tsx"),
  read("src", "app", "(app)", "stock-wastage", "page.tsx"),
  read("src", "app", "(app)", "stock-wastage", "[id]", "page.tsx"),
  read("src", "app", "(app)", "purchase-returns", "[id]", "page.tsx"),
  read("src", "app", "(app)", "production", "planning", "page.tsx"),
  read("src", "components", "imports", "import-workflow.tsx"),
];

test("date-only formatter is zero-padded and does not parse through Date", () => {
  assert.match(utils, /value\.trim\(\)\.match\(\/\^\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)/);
  assert.match(utils, /return `\$\{day\}\/\$\{month\}\/\$\{year\}`/);
  assert.doesNotMatch(utils.match(/export function formatDateOnly[\s\S]*?\n}/)?.[0] ?? "", /new Date/);
});

test("operational pages format visible dates through the shared formatter", () => {
  const combined = targetSources.join("\n");
  assert.match(combined, /formatDateOnly\(row\.count_date\)/);
  assert.match(combined, /formatDateOnly\(count\.count_date\)/);
  assert.match(combined, /formatDateOnly\(row\.transaction_date\)/);
  assert.match(combined, /formatDateOnly\(transaction\.transaction_date\)/);
  assert.match(combined, /formatDateOnly\(receiving\.received_date\)/);
  assert.match(combined, /formatDateOnly\(supplier\.created_at\)/);
  assert.match(combined, /formatDateOnly\(request\.request_date\)/);
  assert.match(combined, /formatDateOnly\(request\.needed_by_date/);
  assert.match(combined, /formatDateOnly\(order\.order_date\)/);
  assert.match(combined, /formatDateOnly\(row\.transfer_date\)/);
  assert.match(combined, /formatDateOnly\(transfer\.transfer_date\)/);
  assert.match(combined, /formatDateOnly\(row\.wastage_date\)/);
  assert.match(combined, /formatDateOnly\(wastage\.wastage_date\)/);
  assert.match(combined, /formatDateOnly\(purchaseReturn\.return_date\)/);
  assert.match(combined, /formatDateOnly\(report\.planning\.planning_date\)/);
  assert.match(combined, /formatDateTime\(value, value\)/);
  assert.doesNotMatch(combined, />\{(?:row\.count_date|count\.count_date|row\.transaction_date|transaction\.transaction_date|receiving\.received_date)\}</);
});

test("native date controls keep ISO values while showing DD/MM/YYYY labels", () => {
  assert.match(input, /type === "date"/);
  assert.match(input, /`\$\{day\}\/\$\{month\}\/\$\{year\}`/);
  assert.match(targetSources.join("\n"), /type="date"/);
  assert.match(targetSources.join("\n"), /value=\{countDate\}/);
  assert.match(targetSources.join("\n"), /defaultValue=\{getToday\(\)\}/);
});

test("formatter contract covers representative, empty, and timestamp values", () => {
  const format = (value, fallback = "-") => {
    if (!value) return fallback;
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : fallback;
  };
  assert.equal(format("2026-07-29"), "29/07/2026");
  assert.equal(format("2026-01-09"), "09/01/2026");
  assert.equal(format("2026-07-29T23:59:59Z"), "29/07/2026");
  assert.equal(format(null), "-");
  assert.equal(format(""), "-");
});
