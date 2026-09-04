const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

test("Vercel uses the pinned LTS runtime and deterministic lockfile install", () => {
  assert.equal(packageJson.engines?.node, "22.x");
  assert.equal(vercel.installCommand, "npm ci --no-audit --no-fund");
  assert.equal(vercel.buildCommand, "npm run build");
  assert.equal(packageLock.packages?.[""]?.engines?.node, packageJson.engines.node);
});

test("package and lockfile release versions stay synchronized", () => {
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages?.[""]?.version, packageJson.version);
  assert.equal(packageLock.packages?.["node_modules/@emnapi/core"]?.version, "1.11.3");
  assert.equal(packageLock.packages?.["node_modules/@emnapi/runtime"]?.version, "1.11.3");
});
