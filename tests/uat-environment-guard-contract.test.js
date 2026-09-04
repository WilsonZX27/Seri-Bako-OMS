const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function runPreviewGuard(overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "seri-bako-preview-"));
  const envPath = path.join(directory, "preview.env");
  const values = {
    TEST_BASE_URL: "https://preview.example.vercel.app",
    NEXT_PUBLIC_SUPABASE_URL: "https://previewref.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
    TEST_SUPER_ADMIN_EMAIL: "owner@example.test",
    TEST_SUPER_ADMIN_PASSWORD: "disposable-test-password",
    TEST_PEOPLE_OPERATIONS_EMAIL: "people-operations@example.test",
    TEST_PEOPLE_OPERATIONS_PASSWORD: "disposable-test-password",
    TEST_FINANCE_EMAIL: "finance@example.test",
    TEST_FINANCE_PASSWORD: "disposable-test-password",
    TEST_MANAGER_EMAIL: "manager@example.test",
    TEST_MANAGER_PASSWORD: "disposable-test-password",
    TEST_PURCHASING_EMAIL: "purchasing@example.test",
    TEST_PURCHASING_PASSWORD: "disposable-test-password",
    TEST_KITCHEN_EMAIL: "kitchen@example.test",
    TEST_KITCHEN_PASSWORD: "disposable-test-password",
    TEST_OUTLET_SUPERVISOR_EMAIL: "outlet-supervisor@example.test",
    TEST_OUTLET_SUPERVISOR_PASSWORD: "disposable-test-password",
    TEST_OUTLET_EMAIL: "outlet@example.test",
    TEST_OUTLET_PASSWORD: "disposable-test-password",
    RUN_PREVIEW_UAT: "confirmed",
    EXPECTED_PREVIEW_APP_HOST: "preview.example.vercel.app",
    EXPECTED_PREVIEW_SUPABASE_PROJECT_REF: "previewref",
    ...overrides,
  };
  fs.writeFileSync(envPath, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n"));
  try {
    return execFileSync(process.execPath, ["scripts/check-uat-environment.mjs", "--target", "preview", "--env", envPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function runPreviewGuardFailure(overrides) {
  try {
    runPreviewGuard(overrides);
  } catch (error) {
    return `${error.stderr ?? ""}${error.stdout ?? ""}`;
  }
  throw new Error("Preview UAT guard unexpectedly accepted an unsafe fixture");
}

test("Production UAT guard fails closed on host, confirmation and project mismatch", () => {
  const source = fs.readFileSync("scripts/check-uat-environment.mjs", "utf8");
  assert.match(source, /RUN_PRODUCTION_UAT !== "confirmed"/);
  assert.match(source, /system\.seribako\.com\.my/);
  assert.match(source, /Production Supabase project mismatch/);
  assert.match(source, /Production UAT cannot use a loopback host/);
  assert.match(source, /TEST_SUPER_ADMIN_PASSWORD/);
});

test("Preview UAT guard requires an explicit isolated app and Supabase identity", () => {
  const source = fs.readFileSync("scripts/check-uat-environment.mjs", "utf8");
  assert.match(source, /RUN_PREVIEW_UAT !== "confirmed"/);
  assert.match(source, /Preview UAT cannot use the Production app host/);
  assert.match(source, /EXPECTED_PREVIEW_APP_HOST/);
  assert.match(source, /Preview Supabase project mismatch/);
  assert.match(source, /EXPECTED_PREVIEW_SUPABASE_PROJECT_REF/);
});

test("Preview UAT guard accepts a valid isolated fixture", () => {
  const output = runPreviewGuard();
  assert.match(output, /"ok": true/);
  assert.match(output, /"target": "preview"/);
  assert.match(output, /"app_host": "preview\.example\.vercel\.app"/);
});

test("Preview UAT guard rejects Production app and Supabase identities", () => {
  assert.match(runPreviewGuardFailure({ TEST_BASE_URL: "https://system.seribako.com.my" }), /Preview UAT cannot use the Production app host/);
  assert.match(runPreviewGuardFailure({ NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co" }), /Preview Supabase project mismatch/);
});

test("Preview UAT guard rejects an incomplete role matrix before browser startup", () => {
  assert.match(runPreviewGuardFailure({ TEST_FINANCE_PASSWORD: "" }), /Missing required UAT variable: TEST_FINANCE_PASSWORD/);
});

test("Preview UAT template stays secret-free and includes every guarded boundary", () => {
  const template = fs.readFileSync(".env.preview.test.example", "utf8");
  for (const key of [
    "RUN_PREVIEW_UAT=confirmed",
    "EXPECTED_PREVIEW_APP_HOST=",
    "EXPECTED_PREVIEW_SUPABASE_PROJECT_REF=",
    "NEXT_PUBLIC_SUPABASE_URL=",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=",
    "TEST_SUPER_ADMIN_EMAIL=",
    "TEST_FINANCE_EMAIL=",
    "TEST_OUTLET_SUPERVISOR_EMAIL=",
    "TEST_OUTLET_EMAIL=",
  ]) assert.match(template, new RegExp(`^${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`, "m"));
  assert.doesNotMatch(template, /system\.seribako\.com\.my|service_role|eyJ[A-Za-z0-9_-]+\./i);
});
