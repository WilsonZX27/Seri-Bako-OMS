const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("document sequences distinguishes the numbering cursor from stock records", () => {
  const page = read("src/app/(app)/document-sequences/page.tsx");

  assert.match(page, /Sequence Cursor/);
  assert.match(page, /the cursor is not a stock-record count/);
  assert.match(page, /Posting skips every existing Ledger and document number automatically/);
  assert.doesNotMatch(page, /This Month&apos;s Next Number/);
});
