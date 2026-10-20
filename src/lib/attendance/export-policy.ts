type StaffSummary = { employment_type?: unknown } | null;

type ExportRow = {
  staffs?: StaffSummary;
  calculation?: unknown;
  actual_first_in?: unknown;
  actual_break_out?: unknown;
  actual_break_in?: unknown;
  actual_last_out?: unknown;
  presence_seconds?: unknown;
  worked_seconds?: unknown;
  statuses?: unknown;
};

const STATUS_LABELS: Record<string, string> = {
  late: "Late",
  early_leave: "Early leave",
  missing_punches: "Missing punches",
  missing_check_in: "Missing check in",
  missing_check_out: "Missing check out",
  odd_punch_count: "Odd punch count",
  impossible_ordering: "Invalid punch order",
  overtime: "Overtime",
  wrong_branch_device: "Wrong branch/device",
  public_holiday: "Public holiday",
  unpaid_leave_punch_conflict: "Punch evidence conflicts with full-day unpaid leave",
};

function rawPunches(row: ExportRow) {
  const calculation = row.calculation as { punches?: unknown } | null;
  return Array.isArray(calculation?.punches) ? calculation.punches.map(String) : [];
}

/** Preserve the four evidence points; never collapse a break to gross presence. */
export function exportPunches(row: ExportRow) {
  const corrected = [row.actual_first_in, row.actual_break_out, row.actual_break_in, row.actual_last_out];
  if (corrected.every(Boolean)) return corrected.map(String);
  const punches = rawPunches(row);
  return punches.length ? punches : corrected.filter(Boolean).map(String);
}

export function exportWorkedSeconds(row: ExportRow) {
  const points = exportPunches(row).map(value => Date.parse(value));
  const statuses = Array.isArray(row.statuses) ? row.statuses.map(String) : [];
  if (row.worked_seconds == null || points.length !== 4 || points.some((value,index) => !Number.isFinite(value) || (index > 0 && value <= points[index-1])) ||
    statuses.some(status => ["duplicate_punch", "impossible_ordering", "odd_punch_count", "system_inferred_break", "unexpected_punch_count"].includes(status))) return null;
  return Math.floor((points[1]-points[0]+points[3]-points[2])/1000);
}

export function exportShortHoursSeconds(row: ExportRow & { late_seconds?: unknown; early_leave_seconds?: unknown; scheduled_start?: unknown; scheduled_end?: unknown }) {
  if (exportWorkedSeconds(row) == null) return null;
  const total = Math.max(0, Number(row.late_seconds ?? 0)) + Math.max(0, Number(row.early_leave_seconds ?? 0));
  const span = (Date.parse(String(row.scheduled_end))-Date.parse(String(row.scheduled_start)))/1000;
  return Number.isFinite(span) && span >= 0 ? Math.min(span,total) : total;
}

export function exportExceptionLabels(row: ExportRow) {
  const statuses = Array.isArray(row.statuses) ? row.statuses.map(String) : [];
  return statuses.filter(status=>!["normal","unpaid_leave"].includes(status)).map((status) => STATUS_LABELS[status] ?? status.replaceAll("_", " ")).join(", ");
}
