export const PUNCH_HEADERS = ["Person ID", "Person Name", "Punch Date", "Attendance record", "Verify Type", "TimeZone", "Source"] as const;
export const REPORT_HEADERS = ["Person ID", "Person Name", "Timesheet", "Date", "Total Late Time", "Total Early Departure Time", "Total Break Time", "Total Work Hours(h)", "Total Overtime Hours(h)", "Total Hours(h)"] as const;
export const TIMECARD_HEADERS = ["Person ID", "Person Name", "Date", "Clock In", "Clock Out"] as const;

export type ParserProfile = "view_attendance_punch" | "attendance_report" | "timecard_report";
export type ParsedRow = { rowNumber: number; values: Record<string, string>; errors: string[]; warnings: string[] };

function exactDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : `${year}-${month}-${day}`;
}

function exactTime(value: string) {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, hour, minute, second] = match.map(String);
  return Number(hour) < 24 && Number(minute) < 60 && Number(second) < 60 ? `${hour}:${minute}:${second}` : null;
}

export function parseDurationSeconds(value: string) {
  if (!value.trim()) return null;
  const match = /^(\d+):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match || Number(match[2]) > 59 || Number(match[3]) > 59) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export function validateHeaders(profile: ParserProfile, headers: string[]) {
  const required = profile === "view_attendance_punch" ? PUNCH_HEADERS : profile === "timecard_report" ? TIMECARD_HEADERS : REPORT_HEADERS;
  return required.filter((header) => !headers.includes(header));
}

export function detectParserProfile(headers: string[]): ParserProfile {
  if (headers.includes("Punch Date") && headers.includes("Attendance record")) return "view_attendance_punch";
  if (headers.includes("Clock In") || headers.includes("Clock Out")) return "timecard_report";
  return "attendance_report";
}

export function isRawPunchProfile(headers:string[]){
  return detectParserProfile(headers)==="view_attendance_punch";
}

export function weekStartFromUsDate(value: string) {
  const date = exactDate(value);
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - ((parsed.getUTCDay() + 6) % 7));
  return parsed.toISOString().slice(0, 10);
}

export function inferTimecardWeek(rows: Record<string, string>[]) {
  const weeks = [...new Set(rows.map((row) => weekStartFromUsDate(row.Date ?? "")).filter((value): value is string => Boolean(value)))];
  return weeks.length === 1 ? weeks[0] : null;
}

export function parsePunchRows(rows: Record<string, string>[]): ParsedRow[] {
  return rows.map((values, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const date = exactDate(values["Punch Date"] ?? "");
    const time = exactTime(values["Attendance record"] ?? "");
    if (!values["Person ID"]?.trim()) errors.push("Person ID is required");
    if (!date) errors.push("Punch Date must use MM/DD/YYYY");
    if (!time) errors.push("Attendance record must use HH:mm:ss");
    if ((values.TimeZone ?? "").trim() !== "+08:00") errors.push("TimeZone must be +08:00");
    if (!values.Source?.trim()) errors.push("Source device is required");
    if (!values["Person Name"]?.trim()) warnings.push("Person Name is blank; Person ID remains authoritative");
    return { rowNumber: index + 3, values: { ...values, _local_timestamp: date && time ? `${date}T${time}` : "" }, errors, warnings };
  });
}

export function parseReportRows(rows: Record<string, string>[]): ParsedRow[] {
  const durationFields = REPORT_HEADERS.slice(4);
  return rows.map((values, index) => {
    const errors: string[] = [];
    if (!values["Person ID"]?.trim()) errors.push("Person ID is required");
    if (!/^\d{2}\.\d{2}-\d{2}\.\d{2}$/.test(values.Date ?? "")) errors.push("Date period must use MM.DD-MM.DD");
    durationFields.forEach((field) => { if (values[field] && parseDurationSeconds(values[field]) === null) errors.push(`${field} must use HH:mm:ss`); });
    const enriched={...values,_late_seconds:String(parseDurationSeconds(values["Total Late Time"]??"")??""),_early_seconds:String(parseDurationSeconds(values["Total Early Departure Time"]??"")??""),_break_seconds:String(parseDurationSeconds(values["Total Break Time"]??"")??""),_work_seconds:String(parseDurationSeconds(values["Total Work Hours(h)"]??"")??""),_overtime_seconds:String(parseDurationSeconds(values["Total Overtime Hours(h)"]??"")??""),_total_seconds:String(parseDurationSeconds(values["Total Hours(h)"]??"")??"")};
    return { rowNumber: index + 3, values:enriched, errors, warnings: ["Reconciliation only: this row never changes OMS attendance calculations"] };
  });
}

export function parseTimecardRows(rows: Record<string, string>[]): ParsedRow[] {
  return rows.map((values, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!values["Person ID"]?.trim()) errors.push("Person ID is required");
    if (!exactDate(values.Date ?? "")) errors.push("Date must use MM/DD/YYYY");
    const clockIn = (values["Clock In"] ?? "").trim();
    const clockOut = (values["Clock Out"] ?? "").trim();
    if (clockIn && !exactTime(clockIn)) errors.push("Clock In must use HH:mm:ss");
    if (clockOut && !exactTime(clockOut)) errors.push("Clock Out must use HH:mm:ss");
    if (!clockIn && !clockOut) warnings.push("No punches; this row will be skipped");
    else if (!clockIn) warnings.push("Missing check-in; an attendance exception will be created");
    else if (!clockOut) warnings.push("Missing check-out; an attendance exception will be created");
    return { rowNumber: index + 3, values: { ...values, Source: "NGTECO_TIMECARD_REPORT" }, errors, warnings };
  });
}

export async function sha256Hex(input: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", input))].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function eventFingerprint(companyId: string, row: Record<string, string>) {
  const raw = [companyId, row["Person ID"], row._local_timestamp, row.Source, row["Punch Type"] ?? ""].join("|");
  return sha256Hex(new TextEncoder().encode(raw).buffer);
}
