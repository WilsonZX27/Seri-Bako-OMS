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

export async function attendanceReviewContentVersion({result,schedule}: AttendanceReviewVersionInput) {
  // Pass the canonical daily_attendance_results row, not a joined page/view model.
  // Workflow-only state must not invalidate its own next approval stage. Changes
  // to time, pay, evidence, exceptions or result identity remain in the binding.
  const content=Object.fromEntries(Object.entries(result).filter(([key]) => !["review_status","created_at"].includes(key)));
  const value=canonical({contract:"attendance-review-v1",result:content,schedule:schedule ? {
    source_revision:schedule.source_revision,source_hash:schedule.source_hash,
  } : null});
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return {
    version:[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join(""),
    // Legacy days without a source queue must be admitted by the workflow's
    // existing policy. No queue entry is not evidence of current verification.
    calculationReady:Boolean(schedule && schedule.status==="ready" && schedule.calculated_revision===schedule.source_revision &&
      result.is_current===true &&
      (result.calculation as Record<string,unknown>|null)?.schedule_source_revision===schedule.source_revision &&
      (result.calculation as Record<string,unknown>|null)?.schedule_source_hash===schedule.source_hash),
  };
}
