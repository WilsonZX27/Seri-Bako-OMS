const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const React = require("react");

function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, URL, console, performance,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name === "@/lib/asset-location-display") return require("./helpers/load-source.cjs")()("src/lib/asset-location-display.ts");
      if (name === "react" || name === "react/jsx-runtime") return require(name);
      if (name.startsWith("@/components/") || name === "next/link" || name === "lucide-react") {
        return new Proxy({}, { get: () => function Component() {} });
      }
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return module.exports;
}

function database(resolve, queue) {
  const calls = [];
  function request(table, args) {
    const call = { table, args, filters: [], selection: null, options: null };
    const builder = {
      select(selection, options) { call.selection = selection; call.options = options; return builder; },
      then(onFulfilled, onRejected) {
        calls.push(call);
        const promise = queue ? new Promise((done) => queue.push(() => done(resolve(call)))) : Promise.resolve(resolve(call));
        return promise.then(onFulfilled, onRejected);
      },
    };
    for (const method of ["eq", "in", "is", "order", "limit", "range", "maybeSingle"]) {
      builder[method] = (...values) => { call.filters.push([method, ...values]); return builder; };
    }
    return builder;
  }
  return { calls, from: (table) => request(table), rpc: (name, args) => request(name, args) };
}

function attendance(db, allowed = true) {
  return load("src/server/queries/attendance.ts", {
    "@/lib/mock-mode": { isMockMode: () => false },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/supabase/loose": { looseSupabase: (value) => value },
    "@/server/auth/permissions": { hasPermission: async () => allowed },
    "@/server/auth/tenant-actor": {},
    "@/server/observability/logger": { logServerError() {} },
    "@/lib/attendance/schedule-summary": load("src/lib/attendance/schedule-summary.ts"),
  });
}

test("planner keeps authorised branch, week, staff and RO data while reducing dependent request waves", async () => {
  const queue = [];
  const db = database((call) => {
    let data = [];
    if (call.table === "get_schedule_branches") data = [{ id: "allowed", branch_name: "Outlet" }];
    if (call.table === "schedule_weeks") data = call.selection === "id" ? [{ id: "previous" }] : [{ id: "week", status: "draft", submitted_by: "submitter", updated_at: "stamp" }];
    if (call.table === "staffs") data = { full_name: "Submitter" };
    if (call.table === "get_schedule_staff") data = [{ id: "employee", full_name: "Employee" }];
    if (call.table === "get_schedule_staff_candidates") data = [{ id: "candidate" }];
    if (call.table === "shift_assignment_revisions") data = [{ staff_id: "employee", work_date: "2026-09-14", assignment_kind: "shift" }];
    if (call.table === "get_schedule_external_assignments") data = [{ staff_id: "employee", branch_id: "other" }];
    if (call.table === "comp_time_transactions") data = [{ staff_id: "employee", minutes: 90 }, { staff_id: "employee", minutes: 30 }];
    if (call.table === "attendance_ro_reservations") data = [{ staff_id: "employee", reserved_minutes: 45 }];
    return { data, error: null };
  }, queue);
  let done = false;
  const resultPromise = attendance(db).getSchedulePlanner("2026-09-14", "unauthorised").finally(() => { done = true; });
  const waves = [];
  for (let round = 0; round < 15 && !done; round++) {
    await new Promise(setImmediate);
    if (!queue.length) continue;
    const current = queue.splice(0);
    waves.push(current.length);
    current.forEach((finish) => finish());
  }
  const result = await resultPromise;
  assert.deepEqual(waves, [1, 7, 3, 2]);
  assert.equal(result.branchId, "allowed");
  assert.equal(result.week.id, "week");
  assert.equal(result.previousWeekId, "previous");
  assert.equal(result.submittedByName, "Submitter");
  assert.equal(result.people[0].id, "employee");
  assert.equal(result.candidates[0].id, "candidate");
  assert.equal(result.assignments[0].staff_id, "employee");
  assert.equal(result.externalAssignments[0].branch_id, "other");
  assert.equal(result.roBalances.employee, 75);
  for (const call of db.calls.filter((item) => item.table === "schedule_weeks")) {
    assert.ok(call.filters.some(([method, key, value]) => method === "eq" && key === "branch_id" && value === "allowed"));
  }
});

test("planner denies permission before reads and stops when no branch is accessible", async () => {
  const db = database(() => ({ data: [], error: null }));
  await assert.rejects(attendance(db, false).getSchedulePlanner(), /Missing permission/);
  assert.equal(db.calls.length, 0);
  const result = await attendance(db).getSchedulePlanner();
  assert.equal(result.branchId, null);
  assert.equal(db.calls.length, 1);
});

test("planner propagates a failed parallel read rather than rendering an empty roster", async () => {
  const db = database((call) => call.table === "get_schedule_branches"
    ? { data: [{ id: "allowed" }], error: null }
    : { data: null, error: new Error("database unavailable") });
  await assert.rejects(attendance(db).getSchedulePlanner(), /database unavailable/);
});

test("schedule overview does not fetch or validate a hidden outlet planner", async () => {
  const calls = [];
  const { default: Page } = load("src/app/(app)/attendance/schedule/page.tsx", {
    "@/server/queries/schedule-leave-capabilities": {getPaidEmergencyLeaveCapability:async()=>false},
    "@/server/auth/permissions": { getPermissionMap: async () => ({ "schedule.submit": true }) },
    "@/server/auth/tenant-actor": { requireActiveTenantActor: async () => ({ roleCode: "manager" }) },
    "@/server/queries/attendance": {
      malaysiaWeekStart: () => "2026-09-14",
      getSchedulePlanner: async () => { throw new Error("Planner should not load"); },
      getScheduleValidation: async () => { throw new Error("Hidden roster should not validate"); },
      getScheduleOverview: async (week) => { calls.push(week); return []; },
      getPendingShiftRequests: async () => [],
    },
  });
  assert.ok(await Page({ searchParams: Promise.resolve({ view: "overview" }) }));
  assert.deepEqual(calls, ["2026-09-14"]);
});

function inventory(db) {
  return load("src/server/queries/inventory.ts", {
    "@/lib/low-stock-threshold": require("./helpers/load-source.cjs")()("src/lib/low-stock-threshold.ts"),
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/business-date": {},
    "@/server/observability/logger": { logServerWarning() {} },
    "@/lib/mock-mode": { isMockMode: () => false },
    "@/lib/table-state": {},
    "@/server/queries/detail": {},
  });
}

test("dashboard counts branch-item low stock without transferring or paging through rows", async () => {
  const db = database(() => ({ data: null, count: 2300, error: null }));
  const result = await inventory(db).getLowStockCount();
  assert.equal(result.count, 2300);
  assert.equal(result.unavailable, false);
  assert.equal(db.calls.length, 1);
  const call = db.calls[0];
  assert.equal(call.table, "stock_count_eligible_items");
  assert.equal(call.options.head, true);
  assert.equal(call.options.count, "exact");
  assert.deepEqual(call.filters, [["eq", "status", "active"], ["eq", "is_low_stock", true]]);
});

test("zero remains zero; missing counts and query errors remain unavailable without fallback scans", async () => {
  for (const [count, error, unavailable] of [[0, null, false], [null, null, true], [null, { message: "timeout" }, true]]) {
    const db = database(() => ({ data: null, count, error }));
    const result = await inventory(db).getLowStockCount();
    assert.equal(result.count, count);
    assert.equal(result.unavailable, unavailable);
    assert.equal(db.calls.length, 1);
  }
});

test("slow-request logging excludes URLs, filters, credentials and storage object paths", () => {
  const entries = [];
  const { reportSlowSupabaseRequest } = load("src/server/observability/supabase-timing.ts", {
    "@/server/observability/logger": { logServerWarning: (message, fields) => entries.push({ message, ...fields }) },
    "@/server/observability/latency-percentiles": { recordLatencySample() {} },
  });
  reportSlowSupabaseRequest(new URL("https://example.test/rest/v1/staffs?email=eq.private@example.test&token=secret"), "GET", 1500.1, 200);
  reportSlowSupabaseRequest(new URL("https://example.test/storage/v1/object/private/private-name.pdf?token=secret"), "GET", 2100, null);
  reportSlowSupabaseRequest(new URL("https://example.test/auth/v1/user"), "GET", 50, 200);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].source, "supabase.staffs");
  assert.equal(entries[0].durationMs, 1500);
  assert.equal(entries[1].source, "supabase.other");
  assert.doesNotMatch(JSON.stringify(entries), /secret|private|example\.test|token|email|https/);
});

test("database latency observability emits bounded p50, p95 and p99 windows without request data", () => {
  const entries = [];
  const { recordLatencySample } = load("src/server/observability/latency-percentiles.ts", {
    "@/server/observability/logger": { logServerInfo: (message, fields) => entries.push({ message, ...fields }) },
  });
  for (let duration = 1; duration <= 25; duration++) recordLatencySample("supabase.database", duration, duration === 25);
  assert.deepEqual(entries, [{
    message: "Server latency window",
    event: "server_latency_percentiles",
    source: "supabase.database",
    sampleCount: 25,
    failureCount: 1,
    p50Ms: 13,
    p95Ms: 24,
    p99Ms: 25,
    maxMs: 25,
  }]);
  assert.doesNotMatch(JSON.stringify(entries), /url|query|filter|record|body|token|secret/i);
});

test("route data timing records both successful and failed operations without changing their result", async () => {
  const entries = [];
  const api = load("src/server/observability/latency-percentiles.ts", {
    "@/server/observability/logger": { logServerInfo: (message, fields) => entries.push({ message, ...fields }) },
  });
  const original = api.recordLatencySample;
  // The exported helper and recorder share the module-local binding. Fill a
  // complete window so success and failure are observable through one summary.
  for (let index = 0; index < 23; index++) original("route.test.data", index + 1);
  const value = await api.measureServerOperation("route.test.data", async () => "ready");
  assert.equal(value, "ready");
  await assert.rejects(api.measureServerOperation("route.test.data", async () => { throw new Error("unavailable"); }), /unavailable/);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].source, "route.test.data");
  assert.equal(entries[0].sampleCount, 25);
  assert.equal(entries[0].failureCount, 1);
});

test("topbar shell renders without awaiting notification or workflow queries", async () => {
  const { TopBar } = load("src/components/layout/top-bar.tsx", {
    "@/lib/roles": { getRoleDisplayLabel: () => "Manager" },
    "@/server/queries/topbar": { getNavAttentionHrefs: () => [] },
  });
  let releaseActivity;
  const activityPromise = new Promise((resolve) => { releaseActivity = resolve; });
  const tree = TopBar({ permissionMap: {}, role: "manager", companyName: "Company", companyLogoUrl: null, displayName: "Manager", activityPromise });
  assert.equal(typeof tree.then, "undefined", "topbar shell must render synchronously");
  function findSuspense(element) {
    if (!element || typeof element !== "object") return null;
    if (element.type === React.Suspense) return element;
    for (const child of React.Children.toArray(element.props?.children)) {
      const found = findSuspense(child);
      if (found) return found;
    }
    return null;
  }
  const boundary = findSuspense(tree);
  assert.ok(boundary);
  assert.equal(boundary.props.fallback.props["aria-busy"], "true");
  const layout = fs.readFileSync("src/app/(app)/layout.tsx", "utf8");
  assert.match(layout, /const activityPromise = getTopBarActivity\(\)/);
  assert.doesNotMatch(layout, /await getTopBarActivity\(\)/);
  releaseActivity({ notifications: [] });
  await activityPromise;
});

function pendingActions(db, grants, permissionCalls) {
  return load("src/server/queries/pending-actions.ts", {
    react: { cache: (fn) => fn },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/server/auth/permissions": { getPermissionMap: async (codes) => { permissionCalls.push(codes); return grants; } },
    "@/lib/supabase/loose": { looseSupabase: value => value },
    "@/server/queries/notifications": { getCurrentUserScope: async () => ({ branchIds: ["allowed"], companyWideAccess: false, roleCode: "outlet_supervisor" }) },
    "@/server/observability/logger": { logServerWarning() {} },
  });
}

test("topbar batches permissions and skips full counts and unused details while preserving branch filters", async () => {
  const db = database((call) => ({
    data: [{ id: call.table, request_no: "PR-1", branch_id: "allowed", requested_by: "requester", status: "manager_review", updated_at: "2026-09-14", week_start: "2026-09-14", record_date: "2026-09-14", branches: { branch_name: "Outlet" }, branch: { branch_name: "Outlet" } }],
    count: null, error: null,
  }));
  const permissionCalls = [];
  const api = pendingActions(db, { "pr.manager_approve": true, "schedule.approve": true, "outlet_daily_record.post": true }, permissionCalls);
  const items = await api.getCurrentUserPendingActions(5);
  assert.equal(permissionCalls.length, 1);
  assert.equal(permissionCalls[0].length, 10);
  assert.ok(permissionCalls[0].includes("assets.view"));
  assert.equal(items.length, 3);
  assert.deepEqual(db.calls.map((call) => call.table).sort(), ["outlet_daily_records", "purchase_requests", "schedule_weeks"]);
  for (const call of db.calls) {
    assert.equal(call.options.count, undefined);
    assert.ok(call.filters.some(([method, column, ids]) => method === "in" && column === "branch_id" && ids[0] === "allowed"));
  }
  assert.ok(items.some((item) => item.title === "Schedule approval required"));
  assert.ok(items.some((item) => item.title === "Outlet daily record ready to post"));
});

test("dashboard pending totals remain exact and a missing requested count remains unavailable", async () => {
  for (const count of [12, null]) {
    const db = database(() => ({ data: [], count, error: null }));
    const result = await pendingActions(db, { "schedule.approve": true }, []).getCurrentUserPendingActionSnapshot(5);
    assert.equal(db.calls[0].options.count, "exact");
    assert.equal(result.total, count);
    assert.equal(result.unavailable, count === null);
  }
});

test("pending actions with denied grants do not fetch workflow records", async () => {
  const db = database(() => { throw new Error("No authorised workflow read"); });
  const result = await pendingActions(db, {}, []).getCurrentUserPendingActionSnapshot(5);
  assert.equal(result.total, 0);
  assert.equal(result.unavailable, false);
  assert.equal(db.calls.length, 0);
});

test("failed topbar workflow queries propagate unavailable instead of a false empty queue", async () => {
  const db = database(() => ({ data: null, count: null, error: { message: "timeout" } }));
  await assert.rejects(pendingActions(db, { "schedule.approve": true }, []).getCurrentUserPendingActions(5), /temporarily unavailable/);
});

 test("maintenance actions use scoped RPC and propagate unavailable", async () => {
  for (const error of [null, {message:"missing migration"}]) {
   const db=database(call=>call.table==="get_my_maintenance_actions"
    ? {data:error?null:{total:1,items:[{id:"repair",created_at:"2026-10-13",location:"Assigned outlet"}]},error}
    : call.table==="asset_maintenance"
     ? {data:[{id:"repair",asset_id:"asset-1",description:"Cooler not holding temperature",priority:"high",author_name:"Operator"}],error:null}
     : call.table==="assets"
      ? {data:[{id:"asset-1",item_name:"Two Door Chiller"}],error:null}
      : {data:[],count:null,error:null});
   const result=await pendingActions(db,{"assets.maintenance":true},[]).getCurrentUserPendingActionSnapshot(5);
   assert.equal(result.unavailable,Boolean(error));
   assert.equal(result.total,error?null:1);
   assert.equal(db.calls[0].table,"get_my_maintenance_actions");
   if(!error) {
    assert.equal(result.items[0].href,"/asset-management/maintenance/repair");
    assert.equal(result.items[0].maintenance_description,"Cooler not holding temperature");
    assert.equal(result.items[0].maintenance_priority,"high");
    assert.equal(result.items[0].maintenance_author_name,"Operator");
    assert.equal(result.items[0].maintenance_asset_name,null);
    assert.equal(db.calls.some(call=>call.table==="assets"),false);
   }
  }
 });
