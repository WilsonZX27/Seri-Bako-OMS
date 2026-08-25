import { existsSync, readFileSync, rmSync } from "node:fs";
import { CLONE_MARKER, hasFlag, option, runSupabase } from "./clone-utils.mjs";

function marker() {
  if (!existsSync(CLONE_MARKER)) return null;
  try { return JSON.parse(readFileSync(CLONE_MARKER, "utf8")); } catch { throw new Error("Clone marker is unreadable; refuse implicit cleanup until it is inspected."); }
}

async function waitUntil(timestamp) {
  const remaining = timestamp - Date.now();
  if (remaining <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 60 * 60 * 1000)));
  return waitUntil(timestamp);
}

async function main() {
  const expectedCloneId = option("expected-clone-id");
  let active = marker();
  if (!active) return;
  if (expectedCloneId && active.clone_id !== expectedCloneId) return;

  if (hasFlag("wait")) await waitUntil(Date.parse(active.expires_at));
  active = marker();
  if (!active || (expectedCloneId && active.clone_id !== expectedCloneId)) return;

  runSupabase(["db", "reset", "--local", "--no-seed", "--yes"]);
  rmSync(CLONE_MARKER, { force: true });
  if (!hasFlag("wait")) console.log("Production-like local clone destroyed.");
}

main().catch((error) => {
  console.error(`Production-like clone cleanup failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
