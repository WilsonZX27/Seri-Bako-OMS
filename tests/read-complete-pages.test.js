const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "../src/server/queries/read-complete-pages.ts"), "utf8");
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { readCompletePages } = context.exports;

test("reads beyond 1,000 lines even when the server cap is smaller than the requested page", async () => {
  const input = Array.from({ length: 1207 }, (_, id) => ({ id }));
  const result = await readCompletePages(async (from, to) => ({ data: input.slice(from, Math.min(to + 1, from + 200)), error: null, count: input.length }));
  assert.equal(result.length, input.length);
  assert.deepEqual(Array.from(result, (row) => row.id), input.map((row) => row.id));
});

test("empty data is accepted only when the count confirms zero", async () => {
  assert.equal((await readCompletePages(async () => ({ data: [], error: null, count: 0 }))).length, 0);
  await assert.rejects(readCompletePages(async () => ({ data: [], error: null, count: 10 })), /Incomplete result/);
  await assert.rejects(readCompletePages(async () => ({ data: null, error: null, count: 0 })), /could not be verified/);
});

test("a failed later page, changing count or oversized export never returns partial totals", async () => {
  let calls = 0;
  await assert.rejects(readCompletePages(async () => ++calls === 1
    ? { data: [{ id: 1 }], error: null, count: 2 }
    : { data: null, error: { message: "Read failed" }, count: null }), /Read failed/);
  calls = 0;
  await assert.rejects(readCompletePages(async () => ({ data: [{ id: 1 }], error: null, count: ++calls === 1 ? 2 : 3 })), /Records changed/);
  await assert.rejects(readCompletePages(async () => ({ data: [], error: null, count: 11 }), 10), /shorter date range/);
});
