type EmploymentFields = {status?: string | null;employment_end_date?: string | null;deleted_at?: string | null};
/** The last working day is inclusive in Malaysia; stored account state is unchanged. */
export function staffEmploymentStatus(staff: EmploymentFields, today: string) {
  if (staff.deleted_at) return "archived";
  if (staff.status === "disabled") return "disabled";
  if (staff.employment_end_date && staff.employment_end_date < today) return "employment_ended";
  return staff.status ?? "unknown";
}
export function employmentSignInBlockReason(staff: EmploymentFields, today: string) {
  const status=staffEmploymentStatus(staff,today);
  if(status==="employment_ended")return "Employment ended: last working date has passed.";
  if(status==="disabled")return "OMS access disabled.";
  if(status==="archived")return "Employee is archived.";
  return null;
}
