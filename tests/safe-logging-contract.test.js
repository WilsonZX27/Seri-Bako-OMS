const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return /\.(ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

test("only the redacting observability logger writes to the server console", () => {
  const sourceFiles = walk("src");
  const rawConsoleFiles = sourceFiles.filter((file) => {
    if (file.endsWith(path.join("server", "observability", "logger.ts"))) return false;
    return /console\.(?:error|warn|log)\s*\(/.test(fs.readFileSync(file, "utf8"));
  });

  assert.deepEqual(rawConsoleFiles, []);
});
