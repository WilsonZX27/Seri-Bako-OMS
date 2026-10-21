const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: (name) => imports[name] ?? require(name) });
  return exports;
}
const productOrder = load("src/lib/product-order.ts");
const { groupDailyProducts } = load("src/lib/daily-product-tracking.ts", { "@/lib/product-order": productOrder });
const product = (product_code, daily_tracking, display_order = 9999) => ({ product_code, daily_tracking, display_order, category: "Foods" });
const actual = (groups) => JSON.parse(JSON.stringify(groups.map((group) => ({ tracking: group.tracking, codes: group.products.map((row) => row.product_code) }))));

test("expiry grouping has priority over product family and explicit product order", () => {
  const source = [product("PKG01", "packaging", 0), product("SC02", "food_carryover", 0), product("BB03", "food_daily", 0), product("DR01", "beverage", 0), product("SC03", "food_daily", 20), product("SC04", "food_daily", 10)];
  assert.deepEqual(actual(groupDailyProducts(source)), [
    { tracking: "food_daily", codes: ["SC04", "SC03", "BB03"] },
    { tracking: "food_carryover", codes: ["SC02"] },
    { tracking: "beverage", codes: ["DR01"] },
    { tracking: "packaging", codes: ["PKG01"] },
  ]);
  assert.equal(source[0].product_code, "PKG01", "sorting must not mutate the input catalog");
});

test("new and reclassified products move to their selected category without disrupting other groups", () => {
  const source = [product("SC01", "food_daily"), product("BI01", "food_carryover"), product("BB01", "food_daily")];
  source[0].daily_tracking = "food_carryover";
  source.push(product("SC02", "food_daily"));
  assert.deepEqual(actual(groupDailyProducts(source)), [
    { tracking: "food_daily", codes: ["SC02", "BB01"] },
    { tracking: "food_carryover", codes: ["SC01", "BI01"] },
  ]);
});

test("a saved record can preserve the category snapshot without changing catalog classification", () => {
  const item = product("SC01", "food_carryover");
  assert.equal(groupDailyProducts([item], () => "food_daily")[0].tracking, "food_daily");
  assert.equal(groupDailyProducts([item])[0].tracking, "food_carryover");
});
