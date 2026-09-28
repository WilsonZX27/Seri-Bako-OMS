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

const OT_NO_BREAK_STATUSES = new Set(["missing_break_punch", "short_break", "system_inferred_break"]);
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
};

function isFullTime(row: ExportRow) {
  return row.staffs?.employment_type === "full_time";
}

function hasExplicitBreak(row: ExportRow) {
  return Boolean(row.actual_break_out && row.actual_break_in);
}

function rawPunches(row: ExportRow) {
  const calculation = row.calculation as { punches?: unknown } | null;
  return Array.isArray(calculation?.punches) ? calculation.punches.map(String) : [];
}

/** The People workbook uses clock-in/clock-out unless a break is explicitly corrected. */
export function exportPunches(row: ExportRow) {
  if (row.actual_first_in || row.actual_last_out || hasExplicitBreak(row)) {
    return [row.actual_first_in, row.actual_break_out, row.actual_break_in, row.actual_last_out]
      .filter(Boolean)
      .map(String);
  }
  const punches = rawPunches(row);
  return isFullTime(row) && punches.length >= 2 ? [punches[0], punches.at(-1)!] : punches;
}

export function exportWorkedSeconds(row: ExportRow) {
  if (isFullTime(row) && !hasExplicitBreak(row) && row.presence_seconds != null) {
    return Number(row.presence_seconds);
  }
  return row.worked_seconds == null ? null : Number(row.worked_seconds);
}

export function exportExceptionLabels(row: ExportRow) {
  const statuses = Array.isArray(row.statuses) ? row.statuses.map(String) : [];
  const visible = isFullTime(row) && !hasExplicitBreak(row)
    ? statuses.filter((status) => !OT_NO_BREAK_STATUSES.has(status))
    : statuses;
  return visible.map((status) => STATUS_LABELS[status] ?? status).join(", ");
}
