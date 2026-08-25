const assert = require("node:assert/strict");
const test = require("node:test");

test("transient reads retry twice and then recover without surfacing a false failure", async () => {
  const { withReadRetry } = await import("../src/lib/reliability/retry.ts");
  let calls = 0;
  const retries = [];
  const result = await withReadRetry(async () => {
    calls += 1;
    if (calls < 3) throw Object.assign(new Error("temporarily unavailable"), { status: 503 });
    return "recovered";
  }, { baseDelayMs: 1, jitterMs: 0, circuitKey: `fault-recovery-${Date.now()}`, onRetry: (event) => retries.push(event) });

  assert.equal(result, "recovered");
  assert.equal(calls, 3);
  assert.equal(retries.length, 2);
  assert.equal(retries[0].delayMs, 0);
});

test("non-transient failures are never retried", async () => {
  const { withReadRetry } = await import("../src/lib/reliability/retry.ts");
  let calls = 0;
  await assert.rejects(withReadRetry(async () => {
    calls += 1;
    throw Object.assign(new Error("validation failed"), { status: 400 });
  }, { baseDelayMs: 1, jitterMs: 0, circuitKey: `fault-validation-${Date.now()}` }), /validation failed/);
  assert.equal(calls, 1);
});

test("three repeated transient failures open the short circuit", async () => {
  const { CircuitOpenError, resetRetryCircuit, withReadRetry } = await import("../src/lib/reliability/retry.ts");
  const key = `fault-circuit-${Date.now()}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await assert.rejects(withReadRetry(async () => {
      throw Object.assign(new Error("network unavailable"), { status: 503 });
    }, { attempts: 1, circuitKey: key }), /network unavailable/);
  }
  await assert.rejects(withReadRetry(async () => "should not execute", { circuitKey: key }), (error) => error instanceof CircuitOpenError && error.circuitKey === key);
  resetRetryCircuit(key);
});

test("HTML, malformed JSON and expired sessions produce safe recovery messages", async () => {
  const { readJsonResponse } = await import("../src/lib/http/read-json-response.ts");

  await assert.rejects(readJsonResponse(new Response("<!DOCTYPE html>", { status: 502, headers: { "content-type": "text/html" } })), /unexpected response \(502\).*no changes were applied/i);
  await assert.rejects(readJsonResponse(new Response("{broken", { status: 200, headers: { "content-type": "application/json" } })), /could not be read.*no changes were applied/i);
  await assert.rejects(readJsonResponse(new Response("{}", { status: 401, headers: { "content-type": "application/json" } })), /session expired.*work remains/i);
  assert.deepEqual(await readJsonResponse(new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/problem+json" } })), { ok: true });
});
