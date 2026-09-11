const { test, expect } = require("@playwright/test");
const { createClient } = require("@supabase/supabase-js");
const { login, logout } = require("./helpers");

const enabled = process.env.RUN_ATTENDANCE_ANNOTATION_UAT === "1";
test.skip(!enabled, "Set RUN_ATTENDANCE_ANNOTATION_UAT=1 for the guarded local annotation UAT.");

let fixture;
let admin;
const scheduleTestWeeks = ["2026-10-12", "2026-10-19", "2026-10-26"];

async function cleanupScheduleFixtures() {
  if (!admin || !fixture) return;
  const { error: importBatchError } = await admin
    .from("schedule_import_batches")
    .delete()
    .in("week_start", scheduleTestWeeks);
  if (importBatchError) throw importBatchError;
  const { data: weeks, error: weekReadError } = await admin
    .from("schedule_weeks")
    .select("id")
    .eq("branch_id", fixture.branchId)
    .in("week_start", scheduleTestWeeks);
  if (weekReadError) throw weekReadError;
  const weekIds = (weeks ?? []).map((week) => week.id);
  if (weekIds.length) {
    for (const table of ["schedule_approval_events", "shift_assignment_revisions"]) {
      const { error } = await admin.from(table).delete().in("schedule_week_id", weekIds);
      if (error) throw error;
    }
    const { error } = await admin.from("schedule_weeks").delete().in("id", weekIds);
    if (error) throw error;
  }
}

async function cleanupAttendanceFixtures() {
  if (!admin || !fixture) return;
  const { data: results, error: resultReadError } = await admin
    .from("daily_attendance_results")
    .select("id")
    .eq("staff_id", fixture.employeeId)
    .eq("work_date", "2026-09-11");
  if (resultReadError) throw resultReadError;
  const resultIds = (results ?? []).map((result) => result.id);
  if (!resultIds.length) return;
  const { data: claims, error: claimReadError } = await admin
    .from("attendance_ot_claims")
    .select("id")
    .eq("staff_id", fixture.employeeId)
    .eq("work_date", "2026-09-11");
  if (claimReadError) throw claimReadError;
  const claimIds = (claims ?? []).map((claim) => claim.id);
  if (claimIds.length) {
    const { error: unlinkError } = await admin
      .from("attendance_ot_claims")
      .update({ credited_transaction_id: null })
      .in("id", claimIds);
    if (unlinkError) throw unlinkError;
    const { data: transactions, error: transactionReadError } = await admin
      .from("comp_time_transactions")
      .select("id")
      .in("source_ot_claim_id", claimIds);
    if (transactionReadError) throw transactionReadError;
    const transactionIds = (transactions ?? []).map((transaction) => transaction.id);
    if (transactionIds.length) {
      for (const key of ["used_transaction_id", "earned_transaction_id"]) {
        const { error } = await admin.from("comp_time_allocations").delete().in(key, transactionIds);
        if (error) throw error;
      }
      const { error } = await admin.from("comp_time_transactions").delete().in("id", transactionIds);
      if (error) throw error;
    }
    const { error } = await admin.from("attendance_ot_claims").delete().in("id", claimIds);
    if (error) throw error;
  }
  for (const table of ["attendance_adjustments", "attendance_exceptions"]) {
    const { error } = await admin.from(table).delete().in("result_id", resultIds);
    if (error) throw error;
  }
  const { error } = await admin.from("daily_attendance_results").delete().in("id", resultIds);
  if (error) throw error;
}

test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("Attendance annotation UAT requires the isolated local Supabase stack.");
  }
  admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  const { data: people, error } = await admin
    .from("staffs")
    .select("id,staff_code,default_branch_id,company_id")
    .in("staff_code", ["E2E-OUTLET-STAFF", "E2E-OUTLET-SUPERVISOR", "E2E-MANAGER"]);
  if (error) throw error;
  const employee = people.find((row) => row.staff_code === "E2E-OUTLET-STAFF");
  const supervisor = people.find((row) => row.staff_code === "E2E-OUTLET-SUPERVISOR");
  const manager = people.find((row) => row.staff_code === "E2E-MANAGER");
  if (!employee || !supervisor || !manager) throw new Error("Local attendance staff fixtures are missing.");
  const { data: outlet, error: outletError } = await admin
    .from("branches")
    .select("id")
    .eq("branch_type", "outlet")
    .is("deleted_at", null)
    .limit(1)
    .single();
  if (outletError || !outlet) throw outletError ?? new Error("Local outlet fixture is missing.");
  const assignments = [
    { staff_id: employee.id, branch_id: outlet.id, access_level: "full", is_default: false },
    { staff_id: supervisor.id, branch_id: outlet.id, access_level: "manage", is_default: false },
    { staff_id: manager.id, branch_id: outlet.id, access_level: "manage", is_default: false },
  ];
  const { error: assignmentError } = await admin
    .from("staff_branches")
    .upsert(assignments, { onConflict: "staff_id,branch_id" });
  if (assignmentError) throw assignmentError;
  fixture = { employeeId: employee.id, supervisorId: supervisor.id, managerId: manager.id, branchId: outlet.id };
  await cleanupAttendanceFixtures();
  const { data: attendanceResult, error: attendanceError } = await admin
    .from("daily_attendance_results")
    .insert({
      company_id: employee.company_id,
      staff_id: employee.id,
      branch_id: outlet.id,
      work_date: "2026-09-11",
      actual_punch_count: 1,
      expected_punch_count: 2,
      missing_punch_count: 1,
      monthly_missing_punch_count: 12,
      overtime_candidate_seconds: 3600,
      statuses: ["missing_check_out"],
    })
    .select("id")
    .single();
  if (attendanceError || !attendanceResult) throw attendanceError ?? new Error("Local attendance result fixture could not be created.");
  fixture.resultId = attendanceResult.id;
  await cleanupScheduleFixtures();
});

test.afterAll(async () => {
  if (!admin || !fixture) return;
  await cleanupAttendanceFixtures();
  await cleanupScheduleFixtures();
  const { error } = await admin
    .from("staff_branches")
    .delete()
    .eq("branch_id", fixture.branchId)
    .in("staff_id", [fixture.employeeId, fixture.supervisorId, fixture.managerId]);
  if (error) throw error;
});

test("Actual Attendance keeps monthly follow-up and row actions readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await login(page, "superAdmin");
  await page.goto(`/attendance/review?branch=${fixture.branchId}&week=2026-09-07`, { waitUntil: "domcontentloaded" });

  const card = page.locator("article").filter({ hasText: "12 missing this month" });
  const monthlyFollowUp = card.getByText("12 missing this month", { exact: true });
  await expect(monthlyFollowUp).toBeVisible();
  await expect(monthlyFollowUp).toHaveCSS("white-space", "nowrap");
  await expect(card).toBeVisible();

  const viewDetails = card.getByRole("link", { name: "View details" });
  const adjust = card.getByRole("button", { name: "Adjust" });
  await expect(viewDetails).toBeVisible();
  await expect(adjust).toBeVisible();
  const [detailsBox, adjustBox] = await Promise.all([viewDetails.boundingBox(), adjust.boundingBox()]);
  expect(detailsBox).not.toBeNull();
  expect(adjustBox).not.toBeNull();
  expect(Math.abs(detailsBox.width - adjustBox.width)).toBeLessThanOrEqual(1);
  expect(adjustBox.y).toBeGreaterThan(detailsBox.y + detailsBox.height - 1);
});

test("Attendance adjustment creates a valid immutable revision", async ({ page }) => {
  await login(page, "superAdmin");
  const response = await page.evaluate(async ({ resultId }) => {
    const request = await fetch("/api/attendance/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "adjust",
        resultId,
        reason: "Authenticated annotation UAT correction",
        recognisedPaidSeconds: 28800,
        actualFirstIn: "2026-09-11T00:30:00.000Z",
        actualLastOut: "2026-09-11T08:30:00.000Z",
      }),
    });
    return { status: request.status, body: await request.json() };
  }, { resultId: fixture.resultId });

  expect(response.status).toBe(200);
  expect(response.body.ok).toBe(true);
  expect(response.body.data.is_current).toBe(true);
  expect(response.body.data.recognised_paid_seconds).toBe(28800);
  expect(response.body.data.calculation_revision).toBe(2);
  fixture.resultId = response.body.data.id;
  await logout(page);
});

test("OT submission and independent approval credit time without schema drift", async ({ page }) => {
  await login(page, "outletSupervisor");
  const submitted = await page.evaluate(async ({ resultId }) => {
    const request = await fetch("/api/attendance/ot-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        resultId,
        requestedMinutes: 30,
        reason: "Authenticated annotation UAT overtime",
      }),
    });
    return { status: request.status, body: await request.json() };
  }, { resultId: fixture.resultId });
  expect(submitted.status).toBe(200);
  expect(submitted.body.data.status).toBe("submitted");
  await logout(page);

  await login(page, "superAdmin");
  const approved = await page.evaluate(async ({ claimId }) => {
    const request = await fetch("/api/attendance/ot-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "decide",
        claimId,
        decision: "approve",
        decidedMinutes: 30,
        comment: "Independent authenticated UAT approval",
      }),
    });
    return { status: request.status, body: await request.json() };
  }, { claimId: submitted.body.data.id });
  expect(approved.status).toBe(200);
  expect(approved.body.data.status).toBe("credited");
  expect(approved.body.data.credited_transaction_id).toBeTruthy();

  const { data: current, error } = await admin
    .from("daily_attendance_results")
    .select("id,calculation_revision,overtime_seconds,is_current")
    .eq("staff_id", fixture.employeeId)
    .eq("work_date", "2026-09-11")
    .eq("is_current", true)
    .single();
  if (error) throw error;
  expect(current.calculation_revision).toBe(3);
  expect(current.overtime_seconds).toBe(1800);
  fixture.resultId = current.id;
  await logout(page);
});

test("schedule business blockers return actionable 409 responses", async ({ page }) => {
  await login(page, "superAdmin");
  const result = await page.evaluate(async ({ branchId }) => {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        branchId,
        weekStart: "2026-10-05",
        assignments: [],
        expectedUpdatedAt: null,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, { branchId: fixture.branchId });

  expect(result.status).toBe(409);
  expect(result.body).toEqual({
    ok: false,
    message: "Add at least one shift, OFF, leave, public holiday, or off-in-lieu day before submitting.",
  });
  expect(result.body.message).not.toContain("Support reference");
});

test("schedule submit, independent approval and copy complete without composite UUID failures", async ({ page }) => {
  await login(page, "outletSupervisor");
  const submit = await page.evaluate(async ({ branchId, employeeId }) => {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        branchId,
        weekStart: "2026-10-12",
        assignments: [
          {
            staff_id: employeeId,
            work_date: "2026-10-12",
            assignment_kind: "shift",
            custom_start: "09:00",
            custom_end: "17:00",
            custom_break_seconds: 1800,
            custom_maximum_recognised_seconds: 27000,
            custom_reason: "Local annotation UAT shift",
          },
          {
            staff_id: employeeId,
            work_date: "2026-10-13",
            assignment_kind: "off",
          },
        ],
        expectedUpdatedAt: null,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, { branchId: fixture.branchId, employeeId: fixture.employeeId });
  expect(submit.status).toBe(200);
  expect(submit.body.data.week.status).toBe("submitted");
  const weekId = submit.body.data.week.id;

  await logout(page);
  await login(page, "manager");
  const approval = await page.evaluate(async ({ weekId }) => {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "decide", weekId, decision: "approve", comment: "Local annotation UAT approval" }),
    });
    return { status: response.status, body: await response.json() };
  }, { weekId });
  expect(approval.status).toBe(200);
  expect(approval.body.data.status).toBe("published");

  await logout(page);
  await login(page, "superAdmin");
  const copy = await page.evaluate(async ({ sourceWeekId }) => {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "copy", sourceWeekId, targetWeekStart: "2026-10-19" }),
    });
    return { status: response.status, body: await response.json() };
  }, { sourceWeekId: weekId });
  expect(copy.status).toBe(200);
  expect(copy.body.data.status).toBe("draft");

  const copiedAssignments = [
    {
      staff_id: fixture.employeeId,
      work_date: "2026-10-19",
      assignment_kind: "shift",
      custom_start: "09:00",
      custom_end: "17:00",
      custom_break_seconds: 1800,
      custom_maximum_recognised_seconds: 27000,
      custom_reason: "Local copied UAT shift",
    },
    {
      staff_id: fixture.employeeId,
      work_date: "2026-10-20",
      assignment_kind: "off",
    },
  ];
  await logout(page);
  await login(page, "outletSupervisor");
  const copiedSubmit = await page.evaluate(async ({ branchId, assignments, expectedUpdatedAt }) => {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        branchId,
        weekStart: "2026-10-19",
        assignments,
        expectedUpdatedAt,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, { branchId: fixture.branchId, assignments: copiedAssignments, expectedUpdatedAt: copy.body.data.updated_at });
  expect(copiedSubmit.status).toBe(200);
  expect(copiedSubmit.body.data.week.status).toBe("submitted");

  await logout(page);
  await login(page, "manager");
  copiedAssignments[0].custom_start = "09:30";
  copiedAssignments[0].custom_maximum_recognised_seconds = 25200;
  copiedAssignments[0].custom_reason = "Manager corrected start time in local UAT";
  const editAndPublish = await page.evaluate(async ({ weekId, branchId, assignments, expectedUpdatedAt }) => {
    const response = await fetch("/api/attendance/schedule", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "edit_and_publish",
        weekId,
        branchId,
        weekStart: "2026-10-19",
        assignments,
        expectedUpdatedAt,
        reason: "Corrected working time during local annotation UAT",
      }),
    });
    return { status: response.status, body: await response.json() };
  }, {
    weekId: copy.body.data.id,
    branchId: fixture.branchId,
    assignments: copiedAssignments,
    expectedUpdatedAt: copiedSubmit.body.data.week.updated_at,
  });
  expect(editAndPublish.status).toBe(200);
  expect(editAndPublish.body.data.week.status).toBe("published");
});

test("schedule workbook draft import preserves saved week identities", async ({ page }) => {
  await login(page, "superAdmin");
  const results = await page.evaluate(async ({ branchId, employeeId }) => {
    const payload = {
        action: "import_drafts",
        weekStart: "2026-10-26",
        fileName: "local-annotation-uat.xlsx",
        fileHash: "a".repeat(64),
        outlets: [{
          branch_id: branchId,
          assignments: [
            {
              staff_id: employeeId,
              work_date: "2026-10-26",
              assignment_kind: "shift",
              custom_start: "09:00",
              custom_end: "17:00",
              custom_break_seconds: 1800,
              custom_maximum_recognised_seconds: 27000,
              custom_reason: "Local workbook import UAT",
            },
            {
              staff_id: employeeId,
              work_date: "2026-10-27",
              assignment_kind: "off",
            },
          ],
        }],
        unresolvedCount: 0,
        sourceMetadata: { testScope: "attendance-annotation-uat" },
      };
    const submit = async () => {
      const response = await fetch("/api/attendance/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { status: response.status, body: await response.json() };
    };
    return [await submit(), await submit()];
  }, { branchId: fixture.branchId, employeeId: fixture.employeeId });

  const [result, repeated] = results;
  expect(result.status).toBe(200);
  expect(result.body.data.idempotent).toBe(false);
  expect(result.body.data.batch.status).toBe("drafted");
  expect(result.body.data.outcomes).toHaveLength(1);
  expect(result.body.data.outcomes[0].schedule_week_id).toMatch(/^[0-9a-f-]{36}$/);
  expect(result.body.data.outcomes[0].status).toBe("draft");
  expect(repeated.status).toBe(200);
  expect(repeated.body.data.idempotent).toBe(true);
  expect(repeated.body.data.batch.id).toBe(result.body.data.batch.id);
  expect(repeated.body.data.outcomes[0].schedule_week_id).toBe(result.body.data.outcomes[0].schedule_week_id);
});

test("Attendance mobile controls stay bounded and Settings clears the bottom navigation", async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await login(page, "superAdmin");
  await page.goto("/attendance", { waitUntil: "domcontentloaded" });

  const outlet = page.getByRole("combobox", { name: "Published schedule outlet" });
  await expect(outlet).toBeVisible();
  const outletBox = await outlet.boundingBox();
  expect(outletBox).not.toBeNull();
  expect(outletBox.x).toBeGreaterThanOrEqual(16);
  expect(outletBox.x + outletBox.width).toBeLessThanOrEqual(414);

  await page.goto("/attendance/settings", { waitUntil: "domcontentloaded" });
  const canvas = page.locator("[data-workspace-canvas]:visible").last();
  await expect(canvas).toBeVisible();
  const paddingBottom = Number.parseFloat(await canvas.evaluate((element) => getComputedStyle(element).paddingBottom));
  expect(paddingBottom).toBeGreaterThanOrEqual(80);

  const finalSection = page.getByText("Shift templates", { exact: true }).locator("xpath=ancestor::details[1]");
  await finalSection.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bottomNav = page.locator("[data-mobile-bottom-nav]");
  await expect(bottomNav).toBeVisible();
  const [sectionBox, navBox] = await Promise.all([finalSection.boundingBox(), bottomNav.boundingBox()]);
  expect(sectionBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(sectionBox.y + sectionBox.height).toBeLessThan(navBox.y);

  await finalSection.locator(":scope > summary").click();
  const templateActions = page.locator("[data-template-mobile-actions]");
  await expect(templateActions).toBeVisible();
  await expect(bottomNav).toBeHidden();
  const templateActionBox = await templateActions.boundingBox();
  expect(templateActionBox).not.toBeNull();
  expect(templateActionBox.x).toBeGreaterThanOrEqual(16);
  expect(templateActionBox.x + templateActionBox.width).toBeLessThanOrEqual(414);
});

test("People and Staff actions share the title row across supported viewports", async ({ page }) => {
  await login(page, "superAdmin");
  const viewports = [
    { width: 430, height: 932 },
    { width: 820, height: 1180 },
    { width: 1440, height: 900 },
  ];
  const expectSameTitleRow = async (title, action, viewportWidth) => {
    await expect(action).toBeVisible();
    const [titleBox, actionBox] = await Promise.all([title.boundingBox(), action.boundingBox()]);
    expect(titleBox).not.toBeNull();
    expect(actionBox).not.toBeNull();
    expect(titleBox.y).toBeLessThan(actionBox.y + actionBox.height);
    expect(actionBox.y).toBeLessThan(titleBox.y + titleBox.height);
    expect(actionBox.x).toBeGreaterThan(titleBox.x);
    expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(viewportWidth - 8);
  };

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(`/people/${fixture.employeeId}?section=employment`, { waitUntil: "domcontentloaded" });
    await expectSameTitleRow(
      page.getByRole("heading", { name: "Employment & outlet assignments" }),
      page.getByRole("link", { name: "Edit employment & access" }),
      viewport.width,
    );
    await expectSameTitleRow(
      page.getByRole("heading", { name: "Sensitive payroll details" }),
      page.getByRole("button", { name: "Save protected details" }),
      viewport.width,
    );

    await page.goto(`/staffs/${fixture.employeeId}`, { waitUntil: "domcontentloaded" });
    await expectSameTitleRow(
      page.getByText("Permission Settings", { exact: true }),
      page.getByRole("button", { name: "Save permissions" }),
      viewport.width,
    );
    if (viewport.width === 1440) {
      const [saveBox, openBox] = await Promise.all([
        page.getByRole("button", { name: "Save Staff" }).boundingBox(),
        page.getByRole("link", { name: "Open profile" }).boundingBox(),
      ]);
      expect(saveBox.y).toBeLessThan(openBox.y);
    }
  }
});

test("mobile Schedule is inset, aligned and exposes the new working-time tools", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "manager");
  await page.goto(`/attendance/schedule?branch=${fixture.branchId}`, { waitUntil: "domcontentloaded" });

  const planner = page.locator("[data-schedule-planner]");
  await expect(planner).toBeVisible();
  const plannerBox = await planner.boundingBox();
  expect(plannerBox.x).toBeGreaterThanOrEqual(15);
  expect(plannerBox.x + plannerBox.width).toBeLessThanOrEqual(375);

  const assignmentCells = page.locator('button[aria-label^="Local outlet_"]');
  await expect(assignmentCells.first()).toBeVisible();
  const widths = await assignmentCells.evaluateAll((nodes) => nodes
    .map((node) => Math.round(node.getBoundingClientRect().width))
    .filter((width) => width > 0));
  expect(widths.length).toBeGreaterThanOrEqual(2);
  expect(new Set(widths).size).toBe(1);

  const employeeLink = page.getByRole("link", { name: "Local outlet_staff" }).first();
  await expect(employeeLink).toHaveAttribute("href", `/people/${fixture.employeeId}`);

  const mobileActions = page.locator("[data-schedule-mobile-actions]");
  await expect(mobileActions).toBeVisible();
  const actionBox = await mobileActions.boundingBox();
  expect(actionBox.x).toBeGreaterThanOrEqual(15);
  expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(375);
  await expect(mobileActions.getByRole("button")).toHaveCount(2);

  await assignmentCells.first().click();
  const dialog = page.getByRole("dialog", { name: /Working time/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Paid time summary")).toBeVisible();
  await expect(dialog.getByText(/hours$/)).toBeVisible();
  const quickButtons = dialog.getByRole("button", { name: /^(OFF|AL|PH|UPL)$/ });
  await expect(quickButtons).toHaveCount(4);
  const backgrounds = await quickButtons.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
  expect(new Set(backgrounds).size).toBeGreaterThan(1);
});
