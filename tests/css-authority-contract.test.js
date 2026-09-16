const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const postcss = require("postcss");

const root = path.resolve(__dirname, "..");

test("canonical design layer has one rule owner per selector and media scope", () => {
  const file = path.join(root, "src/app/design-system-v2.css");
  const stylesheet = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  const owners = new Map();

  stylesheet.walkRules((rule) => {
    const media = rule.parent?.type === "atrule" && rule.parent.name === "media"
      ? rule.parent.params
      : "base";
    const key = `${media} :: ${rule.selector}`;
    const lines = owners.get(key) ?? [];
    lines.push(rule.source?.start?.line ?? 0);
    owners.set(key, lines);
  });

  const duplicates = [...owners.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([key, lines]) => `${key} at lines ${lines.join(", ")}`);

  assert.deepEqual(duplicates, [], `Split CSS authority found:\n${duplicates.join("\n")}`);
});

test("responsive design layer consumes global geometry tokens instead of redefining them", () => {
  const globals = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const designLayer = fs.readFileSync(path.join(root, "src/app/design-system-v2.css"), "utf8");

  for (const token of ["--sb-panel-radius", "--sb-control-radius", "--sb-radius-control"]) {
    assert.match(globals, new RegExp(`${token}:`), `${token} must be owned by globals.css`);
    assert.doesNotMatch(designLayer, new RegExp(`${token}:`), `${token} must not be redefined by design-system-v2.css`);
  }
});
