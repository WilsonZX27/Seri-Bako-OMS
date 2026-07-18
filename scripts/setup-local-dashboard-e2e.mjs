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
const { data: location } = await admin.from("locations").select("id").eq("branch_id", branch.id).limit(1).single();
const { data: roles } = await admin.from("roles").select("id, role_code").eq("company_id", company.id).is("deleted_at", null);

for (const [roleCode, emailKey, passwordKey] of accounts) {
  if (!env[emailKey] || !env[passwordKey]) throw new Error(`Missing ${emailKey} or its password variable.`);
  const created = await admin.auth.admin.createUser({ email: env[emailKey], password: env[passwordKey], email_confirm: true });
  if (created.error) throw created.error;
  const role = roles.find((row) => row.role_code === roleCode);
  const staffCode = `E2E-${roleCode.toUpperCase().replace("_", "-")}`;
  const { data: staff, error } = await admin.from("staffs").insert({ company_id: company.id, auth_user_id: created.data.user.id, staff_code: staffCode, full_name: `Local ${roleCode}`, email: env[emailKey], default_branch_id: branch.id, status: "active" }).select("id").single();
  if (error) throw error;
  await admin.from("staff_roles").insert({ staff_id: staff.id, role_id: role.id, branch_id: ["super_admin", "finance", "purchasing"].includes(roleCode) ? null : branch.id, is_primary: true, effective_from: new Date().toISOString().slice(0, 10) });
  await admin.from("staff_branches").insert({ staff_id: staff.id, branch_id: branch.id, access_level: "full", is_default: true });
  await admin.from("staff_locations").insert({ staff_id: staff.id, location_id: location.id });
}

console.log("Created six disposable local dashboard identities without business records.");
