/** Content binding for the People → Staff → Supervisor → Manager → People flow.
 * Call only after the caller has authorised access to these canonical table rows.
 * This helper grants no access and does not advance or invalidate workflow rows.
 */
export type AttendanceReviewVersionInput = {
  result: Record<string, unknown> & {
    company_id: string;
    staff_id: string;
    work_date: string;
    id: string;
    calculation_revision: number;
  };
  schedule: {
    source_revision: number;
    source_hash: string;
    calculated_revision: number | null;
    status: string;
  } | null;
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value).filter(([,item]) => item !== undefined).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

// This projection is also the contract for what the employee is shown. Do not
// add payroll rates, monetary allowances, salary or calculation internals here.
export const ATTENDANCE_CONFIRMATION_FIELDS = [
  "company_id", "staff_id", "work_date", "branch_id",
  "scheduled_start", "scheduled_end", "actual_first_in", "actual_last_out",
  "actual_break_out", "actual_break_in", "presence_seconds", "worked_seconds",
  "break_seconds", "paid_break_seconds", "unpaid_break_seconds", "payable_seconds",
  "late_seconds", "early_leave_seconds", "actual_punch_count", "expected_punch_count",
  "missing_punch_count",
] as const;

export async function attendanceReviewContentVersion({result,schedule}: AttendanceReviewVersionInput) {
  const content:Record<string,unknown>=Object.fromEntries(ATTENDANCE_CONFIRMATION_FIELDS.map(key=>[key,result[key]??null]));
  const calculation=result.calculation as Record<string,unknown>|null;
  const punches=calculation?.punches;
  const validPunchShape=punches == null || (Array.isArray(punches) && punches.every(punch=>typeof punch==="string"));
  content.punches=Array.isArray(punches) ? punches.filter(punch=>typeof punch==="string") : [];
  content.statuses=Array.isArray(result.statuses) ? [...new Set(result.statuses.filter(status=>typeof status==="string"))].sort() : [];
  // Result IDs/revisions and source hashes are freshness/audit tokens, not the
  // employee's attendance content. Recalculation of identical displayed facts
  // must not revoke a signature merely because a private payroll rate changed.
  const value=canonical({contract:"attendance-review-v2",attendance:content});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return {
    attendanceContent:content,
    version:[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join(""),
    // Legacy days without a source queue must be admitted by the workflow's
    // existing policy. No queue entry is not evidence of current verification.
    calculationReady:Boolean(validPunchShape && schedule && schedule.status==="ready" && schedule.calculated_revision===schedule.source_revision &&
      result.is_current===true &&
      (result.calculation as Record<string,unknown>|null)?.schedule_source_revision===schedule.source_revision &&
      (result.calculation as Record<string,unknown>|null)?.schedule_source_hash===schedule.source_hash),
  };
}
