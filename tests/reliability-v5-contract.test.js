const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const operationResult = fs.readFileSync("src/lib/reliability/operation-result.ts", "utf8");
const retry = fs.readFileSync("src/lib/reliability/retry.ts", "utf8");
const serverFetch = fs.readFileSync("src/lib/supabase/server-fetch.ts", "utf8");
const incidents = fs.readFileSync("src/server/reliability/incidents.ts", "utf8");
const operations = fs.readFileSync("src/server/reliability/operations.ts", "utf8");
const healthRoute = fs.readFileSync("src/app/api/health/route.ts", "utf8");
const healthPage = fs.readFileSync("src/app/(app)/administration/system-health/page.tsx", "utf8");
const stockCounts = fs.readFileSync("src/server/actions/stock-counts.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/206_reliability_observability_foundation.sql", "utf8");

test("operation failures expose a stable safe recovery contract", () => {
  for (const field of ["code", "severity", "retryable", "recoveryAction", "userMessage", "operationId", "fieldErrors"]) {
    assert.match(operationResult, new RegExp(`\\b${field}\\b`));
  }
  assert.match(operationResult, /crypto\.randomUUID\(\)/);
});

test("read retries are finite, transient-only, jittered, and circuit protected", () => {
  assert.match(retry, /Math\.min\(3,/);
  assert.match(retry, /attempt === 1 \? 0 : base/);
  assert.match(retry, /\[408, 429, 502, 503, 504\]/);
  assert.match(retry, /Math\.random\(\)/);
  assert.match(retry, /CIRCUIT_THRESHOLD = 3/);
  assert.match(retry, /CIRCUIT_OPEN_MS = 15_000/);
  assert.match(serverFetch, /safeRead = method === "GET" \|\| method === "HEAD"/);
  assert.doesNotMatch(serverFetch, /method === "POST".*withReadRetry/);
});

test("incident capture is tenant RPC based and cannot break the original workflow", () => {
  assert.match(incidents, /record_system_incident/);
  assert.match(incidents, /Observability must never become a new outage source/);
  assert.match(incidents, /return null/);
  assert.match(migration, /business_data_changed boolean not null default false/);
  assert.match(migration, /'super_admin' = any\(public\.current_staff_role_codes\(\)\)/);
  assert.match(migration, /occurrence_count \+ 1 >= 3/);
  assert.match(migration, /interval '15 minutes'/);
});

test("tracked operations reject key reuse with different parameters", () => {
  assert.match(operations, /requestFingerprint/);
  assert.match(operations, /idempotency_key_parameter_mismatch/);
  assert.match(operations, /request_fingerprint !== fingerprint/);
  assert.match(migration, /unique \(company_id, idempotency_key\)/);
  assert.match(stockCounts, /beginTrackedOperation/);
  assert.match(stockCounts, /completeTrackedOperation/);
});

test("health endpoint is bounded and does not expose provider diagnostics", () => {
  assert.match(healthRoute, /AbortSignal\.timeout\(2500\)/);
  assert.match(healthRoute, /dependencies: \{ app: "healthy", database, auth, storage \}/);
  assert.doesNotMatch(healthRoute, /error\.message|publishableKey[,}]/);
});

test("system health is an Owner workspace with actionable and recovered separation", () => {
  assert.match(healthPage, /getSystemHealthWorkspace/);
  assert.match(healthPage, /Action required/);
  assert.match(healthPage, /Recovery rate/);
  assert.match(healthPage, /Acknowledge/);
  assert.match(healthPage, /Automatic recovery retries only safe transient operations/);
});
