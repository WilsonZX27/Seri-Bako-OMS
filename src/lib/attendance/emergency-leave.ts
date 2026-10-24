/** Paid leave is not punch evidence, overtime, annual leave or off in lieu. */
export function hasPaidEmergencyLeaveProof(row: { statuses?: unknown; calculation?: unknown }) {
  const calculation = row.calculation as Record<string, unknown> | null;
  const proof = calculation?.emergency_leave_policy as Record<string, unknown> | undefined;
  return Array.isArray(row.statuses) && row.statuses.includes("el_paid") && proof?.version === 1 &&
    typeof proof.assignment_id === "string" && proof.assignment_id.length > 0 &&
    (proof.source === "published_schedule" || proof.source === "approved_report" && typeof proof.report_id === "string" && proof.report_id.length > 0);
}

export type PayrollLeaveLine = { kind: "earning" | "deduction"; source_kind?: "manual" | "attendance_short_hours" | "emergency_leave"; source_dates?: string[] };
export function emergencyLeaveDeductionError(line: PayrollLeaveLine, paidLeaveDates: readonly string[]) {
  if (line.kind !== "deduction") return null;
  if (line.source_kind === "emergency_leave") return "Emergency Leave is paid leave and cannot be a deduction.";
  if (line.source_kind === "attendance_short_hours" && line.source_dates?.some(date => paidLeaveDates.includes(date))) return "Emergency Leave dates cannot be included in a short-hours deduction.";
  return null;
}
