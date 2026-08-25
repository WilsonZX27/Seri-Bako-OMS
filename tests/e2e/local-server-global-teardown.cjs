const { setTimeout: delay } = require("node:timers/promises");

module.exports = async function stopLocalPlaywrightServer() {
  if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1" || process.env.PW_MANUAL_SERVER === "1") return;

  const port = process.env.PLAYWRIGHT_LOCAL_PORT || "3000";
  const token = process.env.PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN;
  if (!/^\d+$/.test(port) || !token) throw new Error("Local Playwright shutdown metadata is missing.");

  const origin = `http://localhost:${port}`;
  const response = await fetch(`${origin}/__playwright_shutdown__`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (response.status !== 202) throw new Error(`Local Playwright server rejected controlled shutdown (${response.status}).`);
  await response.text();

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      await fetch(`${origin}/login`, { signal: AbortSignal.timeout(300) });
    } catch {
      return;
    }
    await delay(100);
  }
  throw new Error("Local Playwright server did not close within 10 seconds.");
};
