import { readScheduleWorkbookSheets, scheduleImportDisposition, type ScheduleImportCatalog, type ScheduleWorkbookPreview, type ScheduleWorkbookAssignment } from "./schedule-workbook";

export const SCHEDULE_TEMPLATE_HEADERS = ["Staff ID", "Employee (display only)", "Branch ID", "Date", "Kind", "Start", "End", "Next day", "Break minutes", "Recognised cap minutes", "Reason"] as const;
export const TEMPLATE_KINDS = ["shift", "off", "ph", "al", "mc", "upl", "oil", "el"] as const;
const text = (v: unknown) => String(v ?? "").trim();
const day = (v: unknown) => {
  try {
  const value = typeof v === "number" && Number.isInteger(v) ? new Date((v - 25569) * 86400000).toISOString().slice(0, 10) : text(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value ? value : null;
  } catch { return null; }
};
const clock = (v: unknown) => {
  if (typeof v === "number" && v >= 0 && v < 1 && Math.abs(v * 1440 - Math.round(v * 1440)) < 0.00001) return Math.round(v * 1440);
  const m = text(v).match(/^(\d{2}):(\d{2})(?::00)?$/);
  return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const timeText = (v: number) => `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
export async function parseScheduleTemplate(file: File, weekStart: string, catalog: ScheduleImportCatalog, provided?: Awaited<ReturnType<typeof readScheduleWorkbookSheets>>): Promise<ScheduleWorkbookPreview> {
  const sheets = provided ?? await readScheduleWorkbookSheets(file);
  const guide = sheets.find(s => s.name === "Instructions"), input = sheets.find(s => s.name === "Schedule");
  if (sheets.filter(s => s.name === "Instructions").length !== 1 || sheets.filter(s => s.name === "Schedule").length !== 1 || !guide || !input || guide.rows.get(1)?.get(0) !== "OMS_SCHEDULE_TEMPLATE" || text(guide.rows.get(1)?.get(1)) !== "1") throw new Error("Use the unmodified OMS template: Instructions and Schedule sheets are required.");
  if (["A1", "B1", "B2", "B3"].some(cell => guide.formulaCells.has(cell)) || !catalog.company_id || text(guide.rows.get(2)?.get(1)) !== catalog.company_id) throw new Error("This template belongs to another company or has invalid metadata. Download a fresh template in the correct company.");
  if (text(guide.rows.get(3)?.get(1)) !== weekStart || !day(weekStart) || new Date(weekStart + "T00:00:00Z").getUTCDay() !== 1) throw new Error("The template week must match the selected Monday. Download the correct week.");
  if (input.hidden || input.hiddenRows.size || input.hiddenColumns.size || input.mergedCells.size) throw new Error("Schedule input must not contain hidden or merged rows/columns.");
  if ([...input.formulaCells].some(ref => Number(ref.replace(/\D/g, "")) === 1)) throw new Error("Schedule headers must be plain values.");
  if (SCHEDULE_TEMPLATE_HEADERS.some((h, i) => text(input.rows.get(1)?.get(i)) !== h)) throw new Error("Schedule column headers changed. Download a fresh OMS template.");
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(await file.arrayBuffer())))].map(v => v.toString(16).padStart(2, "0")).join("");
  const end = new Date(Date.parse(weekStart + "T00:00:00Z") + 6 * 86400000).toISOString().slice(0, 10);
  const result: ScheduleWorkbookPreview = { templateVersion: 1, fileName: file.name, fileHash: hash, weekStart, weekEnd: end, outlets: [], issues: [], destinationReviews: [], shiftConflicts: [], notes: [], notices: ["Only Schedule rows are imported. Instructions, examples and reference sheets are ignored. Drafts require the existing Manager review and publication."], employeeMatches: [], assignmentSources: [], assignmentCount: 0, sheets: ["Schedule"], files: [{ name: file.name, hash, profile: "oms-template-v1" }], sheetBranches: {}, reusableRules: {}, namedShifts: [], resolved: [], otReviews: [], untimedDuties: [], missingEndTimes: [], missingEndTimeSources: [] };
  const issue = (row: number, reason: string) => result.issues.push({ sheet: "Workbook", employee: `Schedule row ${row}`, reason: "template_row", message: `Schedule row ${row}: ${reason}` });
  const staged: Array<{ branch: string; assignment: ScheduleWorkbookAssignment; row: number; start?: number; end?: number }> = [];
  const seen = new Map<string, number>();
  for (const [rowNumber, row] of input.rows) {
    if (rowNumber === 1) continue;
    const formulaRow = [...input.formulaCells].some(ref => Number(ref.replace(/\D/g, "")) === rowNumber);
    if (!formulaRow && ![...row.values()].some(v => text(v))) continue;
    if (rowNumber > 1001 || staged.length >= 1000) { issue(rowNumber, "Maximum 1000 employee days per template."); break; }
    if (formulaRow) { issue(rowNumber, "Formula cells are not accepted, even with cached results. Enter values."); continue; }
    if ([...row].some(([c, v]) => c >= SCHEDULE_TEMPLATE_HEADERS.length && text(v))) { issue(rowNumber, "Unexpected extra columns."); continue; }
    const id = text(row.get(0)), branchId = text(row.get(2)), date = day(row.get(3));
    const person = catalog.staff.find(p => p.id === id && p.branch_id === branchId);
    const branch = catalog.branches.find(b => b.id === branchId);
    if (!person || !branch || !catalog.template_memberships?.some(m => m.staff_id === id && m.branch_id === branchId)) { issue(rowNumber, "Unknown employee/location or no current authorised employee-location mapping. Names never grant access; cross-company borrowing requires an existing authorised mapping."); continue; }
    if (!date || date < weekStart || date > end) { issue(rowNumber, "Date must be a full date within the selected week."); continue; }
    if (!person.eligibility?.some(p => p.from <= date && (!p.to || date <= p.to))) { issue(rowNumber, "Employee is not eligible on this date. Refresh the template."); continue; }
    const key = `${id}:${date}`;
    if (seen.has(key)) { issue(rowNumber, `Duplicate employee day (also row ${seen.get(key)}), including other locations.`); continue; }
    seen.set(key, rowNumber);
    const kind = text(row.get(4)).toLowerCase() as typeof TEMPLATE_KINDS[number];
    if (!TEMPLATE_KINDS.includes(kind) || kind === "el" && !catalog.paid_emergency_leave) { issue(rowNumber, "Unknown/unavailable kind. Use system scheduling for RO and complex adjustments."); continue; }
    const assignment: ScheduleWorkbookAssignment = { staff_id: id, work_date: date, assignment_kind: kind, shift_template_id: null };
    let start: number | undefined, finish: number | undefined;
    if (kind === "shift") {
      const a = clock(row.get(5)), b = clock(row.get(6)), next = text(row.get(7)).toLowerCase(), rest = Number(row.get(8)), cap = Number(row.get(9)), reason = text(row.get(10));
      if (a == null || b == null || !["yes", "no"].includes(next) || !text(row.get(8)) || !text(row.get(9)) || !Number.isInteger(rest) || rest < 0 || !Number.isInteger(cap) || cap <= 0 || cap > 1440 || !reason || reason.length > 500) { issue(rowNumber, "Shift needs HH:mm times, explicit Yes/No next day, whole break/cap minutes and a reason (max500 characters). Cap is an explicit existing schedule input, not a payroll formula."); continue; }
      const duration = b + (next === "yes" ? 1440 : 0) - a;
      if (duration <= 0 || duration > 1440 || rest >= duration) { issue(rowNumber, "Invalid duration or break. Overnight shifts require Next day=Yes; shifts must be at most24hours."); continue; }
      if (a % 30 || b % 30) { issue(rowNumber, "Use the system editor for non-standard times. Template shifts use30-minute boundaries."); continue; }
      Object.assign(assignment, { custom_start: timeText(a), custom_end: timeText(b), custom_crosses_midnight: next === "yes", custom_break_seconds: rest * 60, custom_maximum_recognised_seconds: cap * 60, custom_reason: reason });
      start = Date.parse(date + "T00:00:00Z") / 60000 + a; finish = start + duration;
    } else if ([5, 6, 7, 8, 9, 10].some(c => text(row.get(c)))) { issue(rowNumber, "Non-shift days must leave times, next day, break, cap and reason blank."); continue; }
    const disposition = scheduleImportDisposition(branchId, assignment, catalog);
    if (disposition === "protected" || disposition === "update") { issue(rowNumber, "Existing/protected employee day cannot be replaced by this template. Use the system editor."); continue; }
    staged.push({ branch: branchId, assignment, row: rowNumber, start, end: finish });
    result.employeeMatches.push({ key, sheet: "Schedule", row: rowNumber, branchId, employee: person.name, staffCode: id, staffId: id, method: "staff_id", reason: "Stable system Staff ID and current authorised location mapping. Display name is informational.", candidates: [id] });
  }
  for (const a of staged) {
    if (a.start == null || a.end == null) continue;
    const others = staged.filter(b => b !== a && b.assignment.staff_id === a.assignment.staff_id && b.start != null && b.end != null);
    if (others.some(b => a.start! < b.end! && b.start! < a.end!)) issue(a.row, "Overlapping shift, including midnight into the next date.");
    // Ignore the same employee-day only when it is already an identical draft.
    const existing = catalog.current_assignments.filter(b => b.staff_id === a.assignment.staff_id && b.work_date !== a.assignment.work_date && b.assignment_kind === "shift");
    for (const b of existing) {
      const snapshot = b.template_snapshot as Record<string, unknown> | undefined;
      const bs = clock(b.custom_start ?? snapshot?.planned_start), be = clock(b.custom_end ?? snapshot?.planned_end);
      if (bs == null || be == null) { issue(a.row, "An existing neighbouring shift cannot be verified. Review in the system editor."); break; }
      const begins = Date.parse(String(b.work_date) + "T00:00:00Z") / 60000 + bs, ends = Date.parse(String(b.work_date) + "T00:00:00Z") / 60000 + be + (b.custom_crosses_midnight || snapshot?.crosses_midnight ? 1440 : 0);
      if (a.start < ends && begins < a.end) issue(a.row, "Overlaps an existing neighbouring shift, including midnight.");
    }
  }
  for (const a of staged) {
    let outlet = result.outlets.find(o => o.branchId === a.branch);
    if (!outlet) { const branch = catalog.branches.find(b => b.id === a.branch)!; outlet = { branchId: branch.id, branchName: branch.name, status: branch.status, assignments: [] }; result.outlets.push(outlet); }
    outlet.assignments.push(a.assignment);
  }
  result.assignmentCount = staged.length;
  if (!staged.length && !result.issues.length) issue(2, "Add employee days on Schedule. Examples on Instructions are not imported.");
  return result;
}
