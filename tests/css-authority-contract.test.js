const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const postcss = require("postcss");

const root = path.resolve(__dirname, "..");

function cssPropertyOwners(file) {
  const stylesheet = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  const owners = new Map();
  stylesheet.walkRules((rule) => {
    const scopes = [];
    for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
      if (parent.type === "atrule") scopes.unshift(`@${parent.name} ${parent.params}`);
    }
    for (const selector of rule.selectors ?? [rule.selector]) {
      const key = `${scopes.join(" > ") || "base"} :: ${selector.trim()}`;
      const properties = owners.get(key) ?? new Map();
      rule.walkDecls((declaration) => properties.set(declaration.prop, declaration.source?.start?.line ?? 0));
      owners.set(key, properties);
    }
  });
  return owners;
}

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

test("global and responsive layers never own the same property for the same selector scope", () => {
  const globalOwners = cssPropertyOwners(path.join(root, "src/app/globals.css"));
  const designOwners = cssPropertyOwners(path.join(root, "src/app/design-system-v2.css"));
  const conflicts = [];

  for (const [selector, globalProperties] of globalOwners) {
    const designProperties = designOwners.get(selector);
    if (!designProperties) continue;
    for (const [property, globalLine] of globalProperties) {
      const designLine = designProperties.get(property);
      if (designLine) conflicts.push(`${selector} :: ${property} at globals:${globalLine}, v2:${designLine}`);
    }
  }

  assert.deepEqual(conflicts, [], `Cross-file CSS authority conflict:\n${conflicts.join("\n")}`);
});

test("responsive design layer consumes global geometry tokens instead of redefining them", () => {
  const globals = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const designLayer = fs.readFileSync(path.join(root, "src/app/design-system-v2.css"), "utf8");

  for (const token of ["--sb-panel-radius", "--sb-control-radius", "--sb-radius-control"]) {
    assert.match(globals, new RegExp(`${token}:`), `${token} must be owned by globals.css`);
    assert.doesNotMatch(designLayer, new RegExp(`${token}:`), `${token} must not be redefined by design-system-v2.css`);
  }
});

test("global stylesheet exclusively owns the universal reduced-motion fallback", () => {
  const globals = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const designLayer = fs.readFileSync(path.join(root, "src/app/design-system-v2.css"), "utf8");

  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation-duration: 0\.01ms !important;/);
  assert.doesNotMatch(designLayer, /html\[data-design-layer="v2"\] \*/);
  assert.match(designLayer, /@media \(prefers-reduced-motion: reduce\) \{\s*\.sb-skeleton::after \{ display: none; \}\s*\}/);
});

test("source declares panel and control radius intent instead of relying on the legacy 2px override", () => {
  const sourceRoot = path.join(root, "src");
  const legacyOwners = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(candidate);
      else if (/\.(?:css|ts|tsx)$/.test(entry.name) && fs.readFileSync(candidate, "utf8").includes("rounded-[2px]")) {
        legacyOwners.push(path.relative(root, candidate));
      }
    }
  };
  visit(sourceRoot);
  assert.deepEqual(legacyOwners, [], `Legacy radius utility still owned by:\n${legacyOwners.join("\n")}`);
});

test("retired list filter compatibility selectors cannot return", () => {
  const sourceRoot = path.join(root, "src");
  const sourceFiles = fs.readdirSync(sourceRoot, { recursive: true })
    .filter((entry) => /\.(?:css|tsx?|jsx?)$/.test(String(entry)))
    .map((entry) => path.join(sourceRoot, String(entry)));
  for (const file of sourceFiles) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /sb-(?:mobile-list-filter|list-filter-actions|list-filters--dense|pagination-current)/,
      `${file} revives a retired filter or pagination layout owner`,
    );
  }
});

test("retired component class selectors cannot return after data-boundary migration", () => {
  const sourceRoot = path.join(root, "src");
  const sourceFiles = fs.readdirSync(sourceRoot, { recursive: true })
    .filter((entry) => /\.(?:css|tsx?|jsx?)$/.test(String(entry)))
    .map((entry) => path.join(sourceRoot, String(entry)));
  for (const file of sourceFiles) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /sb-(?:command-surface|document-workspace-header|mobile-bottom-nav|right-console|scroll-container|table-scroll|table-shell)/,
      `${file} revives a retired component class selector`,
    );
  }
});

test("retired data-boundary selectors cannot return", () => {
  const sourceRoot = path.join(root, "src");
  const sourceFiles = fs.readdirSync(sourceRoot, { recursive: true })
    .filter((entry) => /\.(?:css|tsx?|jsx?)$/.test(String(entry)))
    .map((entry) => path.join(sourceRoot, String(entry)));
  for (const file of sourceFiles) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /data-(?:dashboard-primary-column|operational-list|table-scroll|ui-surface)/,
      `${file} revives a retired data-boundary selector`,
    );
  }
});
