import { execFileSync, spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  assertLinkedProjectRef,
  assertLocalContainer,
  assertLoopbackUrl,
  CLONE_MARKER,
  hasFlag,
  localDatabaseContainer,
  normalizeTtlHours,
  option,
  parseEnvFile,
  runSupabase,
} from "./clone-utils.mjs";

function restrictTemporaryDirectory(directory) {
  if (process.platform === "win32") {
    const username = process.env.USERNAME;
    if (!username) throw new Error("Cannot restrict the temporary clone directory without the current Windows username.");
    execFileSync("icacls", [directory, "/inheritance:r", "/grant:r", `${username}:(OI)(CI)F`], { stdio: "ignore" });
  } else {
    chmodSync(directory, 0o700);
  }
}

function psqlInput(container, input) {
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

function importDump(container, dumpPath) {
  const child = spawn("docker", ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-16_000); });
  child.stdout.resume();

  const prefix = `\n\\set ON_ERROR_STOP on\nbegin;\nset local session_replication_role = replica;\ndo $$\ndeclare tables text;\nbegin\n  select string_agg(format('%I.%I', schemaname, tablename), ', ') into tables\n  from pg_tables where schemaname = 'public';\n  if tables is not null then execute 'truncate table ' || tables || ' cascade'; end if;\nend\n$$;\n`;
  const suffix = `\nupdate public.staffs set auth_user_id = null;\ncommit;\n`;

  return new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Local clone import failed in psql.${stderr ? ` ${stderr.trim()}` : ""}`));
    });
    child.stdin.write(prefix);
    const input = createReadStream(dumpPath);
    input.on("error", reject);
    input.on("data", (chunk) => {
      if (!child.stdin.write(chunk)) {
        input.pause();
        child.stdin.once("drain", () => input.resume());
      }
    });
    input.on("end", () => child.stdin.end(suffix));
  });
}

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

async function main() {
  const sourceEnvOption = option("source-env");
  if (!sourceEnvOption) throw new Error("Use --source-env with an ignored Production clone env file.");
  const sourceEnvPath = resolve(sourceEnvOption);
  const localEnvPath = resolve(option("local-env") ?? ".env.test.local");
  const source = parseEnvFile(sourceEnvPath);
  const local = parseEnvFile(localEnvPath);
  const ttlHours = normalizeTtlHours(option("ttl-hours"));

  if (source.RUN_PRODUCTION_CLONE !== "confirmed") throw new Error("Production-like cloning requires RUN_PRODUCTION_CLONE=confirmed in the source env file.");
  if (!source.SUPABASE_DB_PASSWORD) throw new Error("SUPABASE_DB_PASSWORD is required in the source env file.");
  assertLinkedProjectRef(source.EXPECTED_SUPABASE_PROJECT_REF);
  assertLoopbackUrl(local.NEXT_PUBLIC_SUPABASE_URL, "Local Supabase URL");

  const existing = existsSync(CLONE_MARKER) ? loadJson(CLONE_MARKER) : null;
  if (existing && Date.parse(existing.expires_at) > Date.now() && !hasFlag("replace")) {
    throw new Error(`A production-like clone is already active until ${existing.expires_at}. Use --replace only when no UAT is running.`);
  }

  const temporaryDirectory = mkdtempSync(join(tmpdir(), "seri-bako-production-like-"));
  restrictTemporaryDirectory(temporaryDirectory);
  const dumpPath = join(temporaryDirectory, "public-data.sql");
  const container = localDatabaseContainer();
  let localTouched = false;

  try {
    console.log("Preparing restricted source snapshot…");
    runSupabase([
      "db", "dump", "--linked", "--data-only", "--use-copy", "--schema", "public",
      "--exclude", "public.profiles",
      "--exclude", "public.stock_balances_summary",
      "--exclude", "public.inventory_daily_summary",
      "--file", dumpPath,
    ], { env: { SUPABASE_DB_PASSWORD: source.SUPABASE_DB_PASSWORD } });

    console.log("Resetting the disposable local database…");
    runSupabase(["db", "reset", "--local", "--no-seed", "--yes"]);
    localTouched = true;
    assertLocalContainer(container);

    console.log("Loading source relationships into the isolated local database…");
    await importDump(container, dumpPath);

    const sanitiseSql = `set seri_bako.production_like_clone = 'confirmed';\n${readFileSync(resolve("supabase", "uat", "sanitize_production_like_clone.sql"), "utf8")}`;
    psqlInput(container, sanitiseSql);

    console.log("Creating six disposable role identities…");
    execFileSync(process.execPath, [resolve("scripts", "setup-local-dashboard-e2e.mjs")], {
      cwd: process.cwd(),
      env: { ...process.env, TEST_ENV_FILE: localEnvPath, RUN_TENANT_BOUNDARY_E2E: "1" },
      stdio: "inherit",
      windowsHide: true,
    });

    const verifySql = `set seri_bako.production_like_clone = 'confirmed';\n${readFileSync(resolve("supabase", "uat", "verify_production_like_clone.sql"), "utf8")}`;
    const verification = psqlInput(container, verifySql).trim();
    const cloneId = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlHours * 60 * 60 * 1000);
    mkdirSync(resolve("test-results"), { recursive: true });
    writeFileSync(CLONE_MARKER, JSON.stringify({
      clone_id: cloneId,
      created_at: createdAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      source_project_ref_sha256: createHash("sha256").update(source.EXPECTED_SUPABASE_PROJECT_REF).digest("hex"),
      local_project: container.replace(/^supabase_db_/, ""),
      verification,
    }, null, 2), { mode: 0o600 });

    const watcher = spawn(process.execPath, [resolve("scripts", "v9", "destroy-production-like-clone.mjs"), "--wait", "--expected-clone-id", cloneId], {
      cwd: process.cwd(), detached: true, stdio: "ignore", windowsHide: true,
    });
    watcher.unref();
    console.log(`Production-like local clone ready. It expires at ${expiresAt.toISOString()}.`);
  } catch (error) {
    if (localTouched) {
      try { runSupabase(["db", "reset", "--local", "--no-seed", "--yes"]); } catch { /* Keep the original failure; the expired/missing marker prevents UAT use. */ }
    }
    rmSync(CLONE_MARKER, { force: true });
    throw error;
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Production-like clone failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});
