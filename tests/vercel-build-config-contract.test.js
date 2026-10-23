const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const buildPreflight = fs.readFileSync("scripts/check-build-environment.mjs", "utf8");

test("Vercel uses the pinned LTS runtime and deterministic lockfile install", () => {
  assert.equal(packageJson.engines?.node, "22.x");
  assert.equal(vercel.installCommand, "npm ci --no-audit --no-fund");
  assert.equal(vercel.buildCommand, "npm run build");
  assert.equal(packageLock.packages?.[""]?.engines?.node, packageJson.engines.node);
});

test("build fails early with a secret-free Supabase environment diagnostic", () => {
  assert.equal(packageJson.scripts.prebuild, "node scripts/check-release-consistency.mjs && node scripts/check-build-environment.mjs");
  assert.match(buildPreflight, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(buildPreflight, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(buildPreflight, /Build environment is incomplete/);
  assert.doesNotMatch(buildPreflight, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(buildPreflight, /console\.log\(process\.env/);
});

test("package and lockfile release versions stay synchronized", () => {
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages?.[""]?.version, packageJson.version);
  assert.equal(packageLock.packages?.["node_modules/@emnapi/core"]?.version, "1.11.3");
  assert.equal(packageLock.packages?.["node_modules/@emnapi/runtime"]?.version, "1.11.3");
});
