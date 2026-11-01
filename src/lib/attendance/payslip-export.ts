type Row = Record<string, unknown>;
export type PayslipExport = {
  id: string; companyId: string; staffId: string; staffCode: string; employee: string;
  periodStart: string; periodEnd: string; version: number; state: "draft" | "approved" | "released";
  currency: "MYR"; earningsCents: number; deductionsCents: number;
  lines: Array<{ kind: "earning" | "deduction"; label: string; cents: number }>;
  outstanding: Array<{ date: string; label: string }>;
  approvedAt: string | null; releasedAt: string | null; generatedAt: string;
};
const object = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const text = (value: unknown, max = 300) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error("Invalid payslip snapshot text");
  return value;
};
function date(value: unknown) {
  const iso = text(value, 10), parsed = new Date(`${iso}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso) throw new Error("Invalid payslip date");
  return iso;
}
export function payslipCents(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") throw new Error("Invalid monetary snapshot");
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error("Invalid monetary snapshot");
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("Invalid monetary snapshot");
  return cents;
}
export function payslipMoney(cents: number) { return (cents / 100).toFixed(2); }
/** Accept only the existing verified monetary snapshot; never derive amounts from attendance. */
export function payslipExportSnapshot(row: Row, generatedAt: string): PayslipExport {
  const confirmation = object(Array.isArray(row.attendance_confirmations) ? row.attendance_confirmations[0] : row.attendance_confirmations);
  const staff = object(Array.isArray(confirmation.staffs) ? confirmation.staffs[0] : confirmation.staffs);
  if (confirmation.company_id !== row.company_id || confirmation.staff_id !== row.staff_id || confirmation.id !== row.confirmation_id || confirmation.state !== "approved") throw new Error("Attendance snapshot is no longer approved");
  if (!["draft", "approved", "released"].includes(String(row.state)) || row.currency !== "MYR" || !Number.isSafeInteger(row.version) || Number(row.version) < 1) throw new Error("Payslip snapshot is unavailable");
  if (!Array.isArray(row.detail) || row.detail.length < 1 || row.detail.length > 50) throw new Error("Invalid payslip lines");
  const lines: PayslipExport["lines"] = row.detail.map(value => {
    const line = object(value);
    if (line.kind !== "earning" && line.kind !== "deduction") throw new Error("Invalid payslip line");
    const cents = payslipCents(line.amount);
    if (cents > 99999999900) throw new Error("Invalid payslip line amount");
    return { kind: line.kind as "earning" | "deduction", label: text(line.label, 120), cents };
  });
  const earningsCents = payslipCents(row.earnings), deductionsCents = payslipCents(row.deductions);
  for (const [kind, total] of [["earning", earningsCents], ["deduction", deductionsCents]] as const) {
    if (lines.filter(line => line.kind === kind).reduce((sum, line) => sum + line.cents, 0) !== total) throw new Error("Payslip totals do not match their snapshot");
  }
  const periodStart = date(confirmation.period_start), periodEnd = date(confirmation.period_end);
  const days = (Date.parse(periodEnd) - Date.parse(periodStart)) / 86400000;
  if (days < 0 || days > 31 || !Array.isArray(confirmation.attendance) || confirmation.attendance.length > 100) throw new Error("Invalid attendance snapshot period");
  const outstanding = confirmation.attendance.map(value => {
    const day = object(value), iso = date(day.date);
    if (iso < periodStart || iso > periodEnd || (day.statuses != null && !Array.isArray(day.statuses))) throw new Error("Invalid outstanding snapshot");
    const statuses = day.statuses == null ? null : (day.statuses as unknown[]).map(value => text(value, 120)).filter(value => value !== "normal");
    const label = statuses == null ? "Not recorded" : statuses.length ? statuses.map(value => value.replaceAll("_", " ")).join(", ") : "None recorded";
    if (label.length > 1000) throw new Error("Outstanding snapshot is too long");
    return { date: iso, label };
  }).sort((a, b) => a.date.localeCompare(b.date));
  const timestamp = (value: unknown) => {
    if (value == null) return null;
    const iso = text(value, 40);
    if (!Number.isFinite(Date.parse(iso))) throw new Error("Invalid payslip timestamp");
    return new Date(iso).toISOString();
  };
  const state = row.state as PayslipExport["state"];
  const approvedAt = timestamp(row.approved_at), releasedAt = timestamp(row.released_at);
  if ((state !== "draft" && !approvedAt) || (state === "released" && !releasedAt)) throw new Error("Approval timestamp is missing");
  return { id: text(row.id, 36), companyId: text(row.company_id, 36), staffId: text(row.staff_id, 36), staffCode: staff.staff_code == null ? "" : text(staff.staff_code, 120), employee: staff.full_name == null ? text(row.staff_id, 36) : text(staff.full_name), periodStart, periodEnd, version: Number(row.version), state, currency: "MYR", earningsCents, deductionsCents, lines, outstanding, approvedAt, releasedAt, generatedAt: timestamp(generatedAt)! };
}
