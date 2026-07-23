import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(fs.readFileSync(".env.test.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")];
}));
const local = Object.fromEntries(execFileSync("cmd.exe", ["/d", "/s", "/c", "npx.cmd supabase status -o env"], { encoding: "utf8" }).split(/\r?\n/).filter((line) => line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
}));
const admin = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const authCheck = createClient(local.API_URL, local.PUBLISHABLE_KEY, { auth: { persistSession: false } });
const includeStockCountFixture = process.argv.includes("--stock-count-fixture");
const accounts = [
  ["super_admin", "TEST_SUPER_ADMIN_EMAIL", "TEST_SUPER_ADMIN_PASSWORD"],
  ["finance", "TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD"],
  ["manager", "TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD"],
  ["purchasing", "TEST_PURCHASING_EMAIL", "TEST_PURCHASING_PASSWORD"],
  ["kitchen", "TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD"],
  ["outlet_staff", "TEST_OUTLET_EMAIL", "TEST_OUTLET_PASSWORD"],
];

const { data: company } = await admin.from("companies").select("id").limit(1).single();
const { data: branch } = await admin.from("branches").select("id").eq("company_id", company.id).limit(1).single();
const { data: roles } = await admin.from("roles").select("id, role_code").eq("company_id", company.id).is("deleted_at", null);

for (const [roleCode, emailKey, passwordKey] of accounts) {
  if (!env[emailKey] || !env[passwordKey]) throw new Error(`Missing ${emailKey} or its password variable.`);
  const created = await admin.auth.admin.createUser({ email: env[emailKey], password: env[passwordKey], email_confirm: true });
  if (created.error) throw created.error;
  const signInCheck = await authCheck.auth.signInWithPassword({ email: env[emailKey], password: env[passwordKey] });
  if (signInCheck.error) throw new Error(`The disposable ${roleCode} identity could not authenticate: ${signInCheck.error.message}`);
  const role = roles.find((row) => row.role_code === roleCode);
  const staffCode = `E2E-${roleCode.toUpperCase().replace("_", "-")}`;
  const { data: staff, error } = await admin.from("staffs").insert({ company_id: company.id, auth_user_id: created.data.user.id, staff_code: staffCode, full_name: `Local ${roleCode}`, email: env[emailKey], default_branch_id: branch.id, status: "active" }).select("id").single();
  if (error) throw error;
  await admin.from("staff_roles").insert({ staff_id: staff.id, role_id: role.id, branch_id: ["super_admin", "finance", "purchasing"].includes(roleCode) ? null : branch.id, is_primary: true, effective_from: new Date().toISOString().slice(0, 10) });
  await admin.from("staff_branches").insert({ staff_id: staff.id, branch_id: branch.id, access_level: "full", is_default: true });
}

if (includeStockCountFixture) {
  const fixtureItems = [
    ["E2E-SC-001", "Dried Shrimp", 18.5],
    ["E2E-SC-002", "Premium Rice", 42],
    ["E2E-SC-003", "Soy Sauce", 8],
    ["E2E-SC-004", "Cooking Oil", 15],
    ["E2E-SC-005", "Paper Bowl", 120],
    ["E2E-SC-006", "Chili Paste", 6.5],
  ];
  const { data: items, error: itemError } = await admin.from("items").insert(fixtureItems.map(([item_code, item_name]) => ({
    company_id: company.id,
    item_code,
    item_name,
    category: "E2E fixture",
    purchase_unit: "KG",
    base_unit: "KG",
    cost: 1,
    safety_stock: 1,
  }))).select("id, item_code");
  if (itemError) throw itemError;
  const itemByCode = new Map((items ?? []).map((item) => [item.item_code, item.id]));
  const { error: stockError } = await admin.from("stock_transactions").insert(fixtureItems.map(([item_code, _item_name, quantity], index) => ({
    transaction_no: `E2E-SC-OPEN-${String(index + 1).padStart(3, "0")}`,
    branch_id: branch.id,
    item_id: itemByCode.get(item_code),
    transaction_type: "opening_balance",
    quantity_in: quantity,
    quantity_out: 0,
    unit_cost: 1,
    total_cost: quantity,
    status: "posted",
    posted_at: new Date().toISOString(),
    remarks: "Disposable local stock-count visual fixture.",
    reference_type: "e2e_fixture",
  })));
  if (stockError) throw stockError;
}

console.log(includeStockCountFixture
  ? "Created six disposable local dashboard identities and a local-only stock-count visual fixture."
  : "Created six disposable local dashboard identities without business records.");
