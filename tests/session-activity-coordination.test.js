const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

test("shared session activity accepts only current, plausible timestamps", async () => {
  const { parseSharedSessionActivity, sessionLogoutAfterMs } = await import("../src/lib/session-activity.ts");
  const now = 1_800_000_000_000;
  assert.equal(parseSharedSessionActivity(String(now - 1_000), now), now - 1_000);
  assert.equal(parseSharedSessionActivity(String(now - sessionLogoutAfterMs), now), null);
  assert.equal(parseSharedSessionActivity(String(now + 5_001), now), null);
  assert.equal(parseSharedSessionActivity("not-a-time", now), null);
  assert.equal(parseSharedSessionActivity(null, now), null);
});

test("idle timeout synchronizes activity across same-origin tabs without changing expiry policy", () => {
  const provider = fs.readFileSync("src/components/session-timeout-provider.tsx", "utf8");
  const activity = fs.readFileSync("src/lib/session-activity.ts", "utf8");
  assert.match(activity, /25 \* 60 \* 1000/);
  assert.match(activity, /30 \* 60 \* 1000/);
  assert.match(provider, /new BroadcastChannel\("oms-session-activity-v1"\)/);
  assert.match(provider, /addEventListener\("storage"/);
  assert.match(provider, /addEventListener\("focus"/);
  assert.match(provider, /parseSharedSessionActivity\(window\.localStorage\.getItem/);
  assert.match(provider, /router\.replace\("\/access-status\?reason=idle-timeout"\)/);
  assert.doesNotMatch(provider, /setSession|refreshSession|updateUser/);
});
