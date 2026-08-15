import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootError = readFileSync("src/app/error.tsx", "utf8");
const workspaceError = readFileSync("src/app/(app)/error.tsx", "utf8");
const globalError = readFileSync("src/app/global-error.tsx", "utf8");

test("root and workspace errors preserve heading, reference, and touch-safe recovery actions", () => {
  assert.match(rootError, /<h1 id="root-error-title"/);
  assert.match(rootError, /role="alert"/);
  assert.match(rootError, /Reference: \{error\.digest\}/);
  assert.match(rootError, /className="min-h-11"/);
  assert.match(rootError, /Return to dashboard/);
  assert.match(workspaceError, /<h1 className="text-sm font-semibold"/);
  assert.equal((workspaceError.match(/min-h-11 xl:min-h-9/g) ?? []).length, 3);
});

test("global error remains standalone but offers keyboard-visible 44px recovery paths", () => {
  assert.match(globalError, /<html lang="en">/);
  assert.match(globalError, /aria-labelledby="global-error-title"/);
  assert.match(globalError, /role="alert"/);
  assert.match(globalError, /min-height:44px/);
  assert.match(globalError, /:focus-visible/);
  assert.match(globalError, /Reference: \{error\.digest\}/);
  assert.match(globalError, /href="\/dashboard"/);
});
