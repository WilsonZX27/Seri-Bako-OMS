import fs from "node:fs";
import process from "node:process";

function readEnv(path) {
  if (!path || !fs.existsSync(path)) throw new Error(`UAT env file not found: ${path || "(missing)"}`);
  return Object.fromEntries(fs.readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return [];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const target = option("target");
const envFile = option("env");
if (!['local', 'preview', 'production'].includes(target)) throw new Error("Use --target local, --target preview or --target production");
const env = readEnv(envFile);
const requiredKeys = ["TEST_BASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "TEST_SUPER_ADMIN_EMAIL", "TEST_SUPER_ADMIN_PASSWORD"];
if (target === "preview") requiredKeys.push(
  "TEST_PEOPLE_OPERATIONS_EMAIL", "TEST_PEOPLE_OPERATIONS_PASSWORD",
  "TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD",
  "TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD",
  "TEST_PURCHASING_EMAIL", "TEST_PURCHASING_PASSWORD",
  "TEST_CHEF_EMAIL", "TEST_CHEF_PASSWORD",
  "TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD",
  "TEST_OUTLET_SUPERVISOR_EMAIL", "TEST_OUTLET_SUPERVISOR_PASSWORD",
  "TEST_OUTLET_EMAIL", "TEST_OUTLET_PASSWORD",
);
for (const key of requiredKeys) {
  if (!env[key]) throw new Error(`Missing required UAT variable: ${key}`);
}
const app = new URL(env.TEST_BASE_URL);
const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const loopback = new Set(["127.0.0.1", "localhost", "::1"]);

if (target === "local") {
  if (!loopback.has(app.hostname) || !loopback.has(supabase.hostname)) throw new Error("Local UAT must use loopback app and Supabase hosts");
} else if (target === "preview") {
  if (env.RUN_PREVIEW_UAT !== "confirmed") throw new Error("Preview UAT requires RUN_PREVIEW_UAT=confirmed");
  if (loopback.has(app.hostname) || loopback.has(supabase.hostname)) throw new Error("Preview UAT cannot use a loopback host");
  if (app.hostname === "system.seribako.com.my") throw new Error("Preview UAT cannot use the Production app host");
  if (!env.EXPECTED_PREVIEW_APP_HOST || app.hostname !== env.EXPECTED_PREVIEW_APP_HOST) {
    throw new Error(`Preview app host mismatch: expected ${env.EXPECTED_PREVIEW_APP_HOST || "(missing)"}, received ${app.hostname}`);
  }
  const actualRef = supabase.hostname.split(".")[0];
  if (!env.EXPECTED_PREVIEW_SUPABASE_PROJECT_REF || actualRef !== env.EXPECTED_PREVIEW_SUPABASE_PROJECT_REF) {
    throw new Error(`Preview Supabase project mismatch: expected ${env.EXPECTED_PREVIEW_SUPABASE_PROJECT_REF || "(missing)"}, received ${actualRef}`);
  }
} else {
  if (env.RUN_PRODUCTION_UAT !== "confirmed") throw new Error("Production UAT requires RUN_PRODUCTION_UAT=confirmed");
  if (loopback.has(app.hostname) || loopback.has(supabase.hostname)) throw new Error("Production UAT cannot use a loopback host");
  if (app.hostname !== "system.seribako.com.my") throw new Error(`Unexpected Production app host: ${app.hostname}`);
  const actualRef = supabase.hostname.split(".")[0];
  if (!env.EXPECTED_SUPABASE_PROJECT_REF || actualRef !== env.EXPECTED_SUPABASE_PROJECT_REF) {
    throw new Error(`Production Supabase project mismatch: expected ${env.EXPECTED_SUPABASE_PROJECT_REF || "(missing)"}, received ${actualRef}`);
  }
}
console.log(JSON.stringify({ ok: true, target, app_host: app.hostname, supabase_host: supabase.hostname }, null, 2));
