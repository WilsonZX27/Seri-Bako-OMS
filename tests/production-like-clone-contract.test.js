const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const prepare = fs.readFileSync(path.join(root, "scripts", "v9", "prepare-production-like-clone.mjs"), "utf8");
const destroy = fs.readFileSync(path.join(root, "scripts", "v9", "destroy-production-like-clone.mjs"), "utf8");
const sanitise = fs.readFileSync(path.join(root, "supabase", "uat", "sanitize_production_like_clone.sql"), "utf8");
const verify = fs.readFileSync(path.join(root, "supabase", "uat", "verify_production_like_clone.sql"), "utf8");

test("clone orchestration is fail-closed and local-only for every write", () => {
  assert.match(prepare, /RUN_PRODUCTION_CLONE !== "confirmed"/);
  assert.match(prepare, /assertLinkedProjectRef\(source\.EXPECTED_SUPABASE_PROJECT_REF\)/);
  assert.match(prepare, /assertLoopbackUrl\(local\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(prepare, /runSupabase\(\[\s*"db", "dump", "--linked", "--data-only"/);
  assert.match(prepare, /\["db", "reset", "--local", "--no-seed", "--yes"\]/);
  assert.doesNotMatch(prepare, /db", "reset", "--linked/);
  assert.match(destroy, /\["db", "reset", "--local", "--no-seed", "--yes"\]/);
  assert.doesNotMatch(destroy, /--linked/);
});

test("raw source data is restricted, excluded from auth/storage, and deleted in finally", () => {
  assert.match(prepare, /restrictTemporaryDirectory\(temporaryDirectory\)/);
  assert.match(prepare, /"--schema", "public"/);
  assert.match(prepare, /"--exclude", "public\.profiles"/);
  assert.match(prepare, /finally \{[\s\S]*rmSync\(temporaryDirectory, \{ recursive: true, force: true \}\)/);
  assert.match(sanitise, /update public\.staffs[\s\S]*auth_user_id = null/);
  assert.match(sanitise, /update public\.attachments[\s\S]*storage_path = null[\s\S]*file_url = null/);
  assert.doesNotMatch(sanitise, /update\s+auth\./i);
  assert.doesNotMatch(sanitise, /update\s+storage\./i);
});

test("clone verification checks PII, tenant ownership, and ledger reconciliation", () => {
  assert.match(verify, /staff PII sanitisation/);
  assert.match(verify, /purchase request line ownership/);
  assert.match(verify, /staff role tenant ownership/);
  assert.match(verify, /stock balance read model reconciliation/);
  assert.match(verify, /Production-like clone failed invariants/);
});

test("clone helper caps TTL at 24 hours and parses quoted secrets without truncating hashes", async () => {
  const helpers = await import(pathToFileURL(path.join(root, "scripts", "v9", "clone-utils.mjs")).href);
  assert.equal(helpers.normalizeTtlHours("24"), 24);
  assert.throws(() => helpers.normalizeTtlHours("24.1"), /no more than 24 hours/);
  assert.throws(() => helpers.assertLoopbackUrl("https://system.seribako.com.my", "Local Supabase URL"), /must target loopback/);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "clone-env-contract-"));
  const envFile = path.join(directory, "source.env");
  try {
    fs.writeFileSync(envFile, 'PASSWORD="abc#123"\nPLAIN=value # comment\n');
    assert.deepEqual(helpers.parseEnvFile(envFile), { PASSWORD: "abc#123", PLAIN: "value" });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
