import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import next from "next";

const localEnvPath = fileURLToPath(new URL("../.env.test.local", import.meta.url));
const localEnv = {};
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE || "development";
if (!["development", "production"].includes(serverMode)) throw new Error("PLAYWRIGHT_SERVER_MODE must be development or production.");
const production = serverMode === "production";

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  const commentIndex = value.indexOf("#");
  return (commentIndex >= 0 ? value.slice(0, commentIndex) : value).trim();
}

try {
  for (const line of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (match) localEnv[match[1]] = parseEnvValue(match[2]);
  }
} catch {
  // Playwright's local fixture setup reports a missing env file with the exact
  // credential keys. Keep this server focused on target isolation and lifecycle.
}

Object.assign(process.env, localEnv, {
  // Browser audits must never inherit a workstation's `.env.local` target.
  // The local fixture is the single authority for both public Supabase values.
  NEXT_PUBLIC_SUPABASE_URL: localEnv.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_URL: localEnv.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: localEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_DIST_DIR: production ? ".next-playwright-production" : ".next-playwright",
});

// Next's custom production server canonicalizes middleware redirects to
// localhost. Use the same loopback hostname for the listener and browser so
// denied RSC prefetches remain same-origin instead of becoming CORS failures.
const hostname = "localhost";
const port = Number.parseInt(process.env.PLAYWRIGHT_LOCAL_PORT || "3000", 10);
const shutdownToken = process.env.PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN || "";
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PLAYWRIGHT_LOCAL_PORT must be a valid TCP port.");
if (shutdownToken.length < 20) throw new Error("PLAYWRIGHT_SERVER_SHUTDOWN_TOKEN is missing or invalid.");

const app = next({ dev: !production, dir: process.cwd(), hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

let shutdownPromise;
const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", `http://${hostname}:${port}`).pathname;
  if (pathname === "/__playwright_shutdown__") {
    const supplied = Buffer.from(request.headers.authorization?.replace(/^Bearer\s+/i, "") || "");
    const expected = Buffer.from(shutdownToken);
    const authorized = supplied.length === expected.length && timingSafeEqual(supplied, expected);
    if (request.method !== "POST" || !authorized) {
      response.writeHead(404, { "Cache-Control": "no-store", Connection: "close" });
      response.end("Not found");
      return;
    }

    response.writeHead(202, { "Cache-Control": "no-store", Connection: "close" });
    response.end("Shutting down");
    setImmediate(() => void shutdown(0));
    return;
  }

  Promise.resolve(handle(request, response)).catch((error) => {
    console.error(error);
    if (!response.headersSent) response.writeHead(500);
    response.end("Internal server error");
  });
});

function closeHttpServer() {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections?.();
  });
}

function shutdown(exitCode) {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();
    try {
      await closeHttpServer();
      await app.close();
      clearTimeout(forceExit);
      process.exit(exitCode);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
  return shutdownPromise;
}

process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));
server.listen(port, hostname, () => {
  console.log(`Playwright local server ready at http://${hostname}:${port}`);
});
