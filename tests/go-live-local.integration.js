const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");

const url = "http://127.0.0.1:54321";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const password = "Local-QA-7.22.1!";
const service = createClient(url, serviceKey, { auth: { persistSession: false } });

const accounts = {
  owner: "qa.owner@local.test",
  admin: "qa.admin@local.test",
  manager: "qa.manager@local.test",
  finance: "qa.finance@local.test",
  outlet: "qa.outlet@local.test",
  restricted: "qa.restricted@local.test",
  adminB: "qa.admin.b@local.test",
  managerB: "qa.manager.b@local.test",
  outletB: "qa.outlet.b@local.test",
};

function ok(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function signIn(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  ok(await client.auth.signInWithPassword({ email, password }), `sign in ${email}`);
  return client;
}

async function main() {
  const companyA = ok(await service.from("companies").select("id").eq("company_code", "SERI-BAKO").single(), "company A");
  const companyB = ok(await service.from("companies").upsert({ company_code: "QA-GL-B", company_name: "QA Go-Live Company B", status: "active" }, { onConflict: "company_code" }).select("id").single(), "company B");
  const branchA = ok(await service.from("branches").select("id").eq("company_id", companyA.id).limit(1).single(), "branch A");
  const branchB = ok(await service.from("branches").upsert({ company_id: companyB.id, branch_code: "B1", branch_name: "Company B Outlet", branch_type: "outlet", status: "active" }, { onConflict: "company_id,branch_code" }).select("id").single(), "branch B");

  const permissionRows = ok(await service.from("permissions").select("id,permission_code"), "permissions");
  const permission = Object.fromEntries(permissionRows.map((row) => [row.permission_code, row.id]));
  const roleCodes = ["super_admin", "admin", "manager", "finance", "outlet_staff", "viewer"];
  for (const company of [companyA, companyB]) {
    for (const code of roleCodes) {
      ok(await service.from("roles").upsert({ company_id: company.id, role_code: code, role_name: code === "super_admin" ? "Super Admin / Owner" : code.replaceAll("_", " "), status: "active" }, { onConflict: "company_id,role_code" }), `role ${code}`);
    }
  }
  const roles = ok(await service.from("roles").select("id,company_id,role_code").in("company_id", [companyA.id, companyB.id]), "roles");
  const role = (companyId, code) => roles.find((row) => row.company_id === companyId && row.role_code === code);
  const grants = {
    admin: ["dashboard.view", "documents.read", "pr.view_all", "pr.create", "pr.submit", "pr.admin_review", "pr.reject", "supplier_invoice.view"],
    manager: ["dashboard.view", "documents.read", "pr.view_branch", "pr.create", "pr.submit", "pr.manager_approve", "pr.reject"],
    finance: ["dashboard.view", "documents.read", "pr.view_all", "pr.finance_review", "supplier_invoice.view", "supplier_invoice.pay"],
    outlet_staff: ["dashboard.view", "outlet_daily_record.view", "outlet_daily_record.create", "outlet_daily_record.update"],
  };
  for (const company of [companyA, companyB]) {
    for (const [code, codes] of Object.entries(grants)) {
      const target = role(company.id, code);
      ok(await service.from("role_permissions").delete().eq("role_id", target.id), `clear ${code}`);
      ok(await service.from("role_permissions").insert(codes.map((permissionCode) => ({ role_id: target.id, permission_id: permission[permissionCode] }))), `grant ${code}`);
    }
  }

  const users = {};
  for (const [name, email] of Object.entries(accounts)) {
    const created = ok(await service.auth.admin.createUser({ email, password, email_confirm: true }), `create ${name}`);
    users[name] = created.user;
  }
  const staffSpecs = [
    ["owner", companyA, branchA, "super_admin"], ["admin", companyA, branchA, "admin"],
    ["manager", companyA, branchA, "manager"], ["finance", companyA, branchA, "finance"],
    ["outlet", companyA, branchA, "outlet_staff"], ["restricted", companyA, branchA, "viewer"],
    ["adminB", companyB, branchB, "admin"], ["managerB", companyB, branchB, "manager"],
    ["outletB", companyB, branchB, "outlet_staff"],
  ];
  const staffs = {};
  for (const [name, company, branch, code] of staffSpecs) {
    staffs[name] = ok(await service.from("staffs").insert({ company_id: company.id, auth_user_id: users[name].id, staff_code: `QA-${name}`, full_name: `QA ${name}`, email: accounts[name], default_branch_id: branch.id, status: "active" }).select("id").single(), `staff ${name}`);
    ok(await service.from("staff_roles").insert({ staff_id: staffs[name].id, role_id: role(company.id, code).id, is_primary: true }), `assign ${name}`);
    ok(await service.from("staff_branches").insert({ staff_id: staffs[name].id, branch_id: branch.id, access_level: "full", is_default: true }), `branch ${name}`);
  }

  const document = ok(await service.from("documents").insert({ company_id: companyA.id, document_no: "QA-PR-CONC", document_type: "purchase_request", title: "Concurrency PR", status: "pending_approval", approval_status: "pending", current_step: "Manager Review" }).select("id").single(), "document");
  const prA = ok(await service.from("purchase_requests").insert({ company_id: companyA.id, document_id: document.id, request_no: "QA-PR-CONC", requested_by: staffs.manager.id, branch_id: branchA.id, status: "manager_review" }).select("id").single(), "PR A");
  ok(await service.from("documents").update({ related_entity_type: "purchase_request", related_entity_id: prA.id }).eq("id", document.id), "link document");
  const prB = ok(await service.from("purchase_requests").insert({ company_id: companyB.id, request_no: "QA-PR-B", requested_by: staffs.managerB.id, branch_id: branchB.id, status: "draft" }).select("id").single(), "PR B");

  const [owner, admin, manager1, manager2, finance, outlet, restricted] = await Promise.all([
    signIn(accounts.owner), signIn(accounts.admin), signIn(accounts.manager), signIn(accounts.manager),
    signIn(accounts.finance), signIn(accounts.outlet), signIn(accounts.restricted),
  ]);

  const crossInsert = await manager1.from("purchase_requests").insert({ company_id: companyB.id, request_no: "QA-CROSS-BLOCK", requested_by: staffs.manager.id, branch_id: branchB.id, status: "draft" });
  assert(crossInsert.error, "migration 068 must reject a cross-company PR insert");
  ok(await manager1.from("purchase_requests").insert({ company_id: companyA.id, request_no: "QA-SAME-ALLOW", requested_by: staffs.manager.id, branch_id: branchA.id, status: "draft" }), "same-company PR insert");
  assert((await manager1.from("purchase_requests").update({ status: "cancelled" }).eq("id", prA.id)).error, "direct PR status update must fail");
  assert((await admin.from("role_permissions").insert({ role_id: role(companyA.id, "admin").id, permission_id: permission["supplier_invoice.pay"] })).error, "direct role permission insert must fail");
  assert.equal(ok(await manager1.from("purchase_requests").select("id").eq("id", prB.id), "cross-company read").length, 0);
  assert.equal(ok(await outlet.from("purchase_requests").select("id"), "outlet PR read").length, 0);
  assert((await outlet.from("purchase_requests").insert({ company_id: companyA.id, request_no: "QA-OUTLET-BLOCK", requested_by: staffs.outlet.id, branch_id: branchA.id, status: "draft" })).error);
  assert((await admin.rpc("get_ap_aging_report")).error, "admin AP report must fail");
  ok(await finance.rpc("get_ap_aging_report"), "finance AP report");

  const concurrent = await Promise.all([manager1.rpc("transition_purchase_request", { target_purchase_request_id: prA.id, transition_action: "manager_approve" }), manager2.rpc("transition_purchase_request", { target_purchase_request_id: prA.id, transition_action: "manager_approve" })]);
  assert.equal(concurrent.filter((result) => !result.error).length, 1, "only one concurrent approval may succeed");
  assert.equal(concurrent.filter((result) => result.error).length, 1, "the stale approval must conflict");
  const finalPr = ok(await service.from("purchase_requests").select("status").eq("id", prA.id).single(), "final PR");
  assert.equal(finalPr.status, "admin_review");
  const events = ok(await service.from("activity_logs").select("id").eq("entity_id", document.id).eq("activity_type", "manager_review_completed"), "timeline");
  assert.equal(events.length, 1);

  const viewerRole = role(companyA.id, "viewer");
  assert.equal(ok(await restricted.rpc("has_any_permission", { permission_codes: ["dashboard.view"] }), "restricted before"), false);
  ok(await owner.rpc("set_role_permissions", { target_role_id: viewerRole.id, permission_ids: [permission["dashboard.view"]] }), "grant viewer dashboard");
  assert.equal(ok(await restricted.rpc("has_any_permission", { permission_codes: ["dashboard.view"] }), "restricted after grant"), true);
  ok(await owner.rpc("set_role_permissions", { target_role_id: viewerRole.id, permission_ids: [] }), "revoke viewer dashboard");
  assert.equal(ok(await restricted.rpc("has_any_permission", { permission_codes: ["dashboard.view"] }), "restricted after revoke"), false);

  const outletPermissions = ok(await service.from("role_permissions").select("permissions(permission_code)").eq("role_id", role(companyA.id, "outlet_staff").id), "outlet permissions").map((row) => row.permissions.permission_code).sort();
  assert.deepEqual(outletPermissions, grants.outlet_staff.slice().sort());
  assert.equal(roles.filter((row) => row.role_code === "outlet_staff" && row.company_id == null).length, 0);

  console.log(JSON.stringify({ migration068CrossCompanyInsert: "blocked", directRlsBypass: "blocked", concurrentApprovals: { succeeded: 1, failed: 1, timelineEvents: events.length }, permissionPropagation: "grant and revoke visible on next RPC", accounts, password }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
