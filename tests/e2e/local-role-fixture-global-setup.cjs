const { spawnSync } = require("node:child_process");
const path = require("node:path");

module.exports = async function setupLocalRoleFixture() {
  if (process.env.RUN_TENANT_BOUNDARY_E2E !== "1") return;

  const result = spawnSync(process.execPath, ["scripts/setup-local-dashboard-e2e.mjs"], {
    cwd: path.resolve(__dirname, "..", ".."),
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(`Local role fixture setup failed: ${(result.stderr || result.stdout || "unknown error").trim()}`);
  }
};
