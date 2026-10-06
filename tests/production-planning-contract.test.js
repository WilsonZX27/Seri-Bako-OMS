const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (file) => fs.readFileSync(file, "utf8");
const migration = read("supabase/migrations/319_production_planning_workflow.sql");

test("production planning preserves the separate inventory posting boundary", () => {
  assert.doesNotMatch(migration, /(insert into|update|delete from) public\.(stock_transactions|stock_transaction_lines|stock_balances|supplier_invoices|supplier_invoice_payments)/i);
  assert.match(migration, /production_job_id uuid references public\.production_jobs/);
});
test("approval and operational dispatch have separate protected database entry points", () => {
  assert.match(migration, /create function public\.update_production_plan/);
  assert.match(migration, /create function public\.confirm_production_dispatch/);
  assert.match(read("src/server/auth/route-permissions.ts"), /"\/production\/planning": \["production_planning\.view"\]/);
  assert.match(read("src/app/(app)/production/page.tsx"), /\/production\/planning/);
});
test("draft scheduler cannot auto-approve or send retired kitchen emails", () => {
  const cron = read("src/app/api/cron/production-planning/route.ts");
  const email = read("src/server/production-planning/email.ts");
  assert.doesNotMatch(cron, /wilson@|management_email_dispatches|update_production_plan|confirm_production_dispatch/);
  assert.match(cron, /Bearer/);
  assert.doesNotMatch(cron, /deliverPlanningEmails/);
  assert.match(email, /claim_production_emails/);
  assert.match(read("vercel.json"), /"schedule": "0 12 \* \* \*"/);
});
