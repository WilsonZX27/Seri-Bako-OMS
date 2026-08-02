import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("tablet split workspaces suppress duplicate mobile actions", () => {
  const layout = fs.readFileSync("src/components/layout/workspace-layout.tsx", "utf8");
  const css = fs.readFileSync("src/app/globals.css", "utf8");
  assert.match(layout, /data-tablet-split-actions/);
    assert.match(css, /html:has\(\[data-tablet-split-actions\]\) \[data-mobile-create-fab\]/);
    assert.match(css, /html:has\(\[data-tablet-split-actions\]\) \[data-mobile-action-bar\]/);
});
