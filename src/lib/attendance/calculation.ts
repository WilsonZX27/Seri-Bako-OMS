export type PunchEvent = { occurredAt: Date; type?: "in" | "out" | null; source?: string };
export type AttendanceShift = {
  scheduledStart: Date;
  scheduledEnd: Date;
  maximumRecognisedSeconds: number;
  graceSeconds?: number;
  requiresBreak?: boolean;
  expectedBranchSource?: string | null;
  employmentType?: "full_time" | "part_time";
  approvedOvertimeSeconds?: number;
  holidayNormalMultiplier?: number | null;
  holidayOtMultiplier?: number | null;
};
export type AttendanceException =
  | "Odd Punch Count" | "Missing Break Punch" | "Short Break" | "Wrong Branch/Device"
  | "Unapproved Pre-shift Time" | "Unapproved Post-shift Time";

const secondsBetween = (start: Date, end: Date) => Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));

export function pairPunches(events: PunchEvent[]) {
  const ordered = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const intervals: Array<{ start: PunchEvent; end: PunchEvent }> = [];
  const exceptions: AttendanceException[] = [];
  if (ordered.length % 2) exceptions.push("Odd Punch Count");
  for (let index = 0; index + 1 < ordered.length; index += 2) {
    const start = ordered[index];
    const end = ordered[index + 1];
    if ((start.type && start.type !== "in") || (end.type && end.type !== "out")) {
      if (!exceptions.includes("Odd Punch Count")) exceptions.push("Odd Punch Count");
      continue;
    }
    intervals.push({ start, end });
  }
  return { ordered, intervals, exceptions };
}

export function calculateAttendance(shift: AttendanceShift, events: PunchEvent[]) {
  const { ordered, intervals, exceptions } = pairPunches(events);
  const first = ordered[0]?.occurredAt ?? null;
  const last = ordered.at(-1)?.occurredAt ?? null;
  let rawWorkSeconds = 0;
  let scheduledWorkedSeconds = 0;
  let breakSeconds = 0;

  intervals.forEach((interval, index) => {
    rawWorkSeconds += secondsBetween(interval.start.occurredAt, interval.end.occurredAt);
    const scheduledStart = new Date(Math.max(interval.start.occurredAt.getTime(), shift.scheduledStart.getTime()));
    const scheduledEnd = new Date(Math.min(interval.end.occurredAt.getTime(), shift.scheduledEnd.getTime()));
    scheduledWorkedSeconds += secondsBetween(scheduledStart, scheduledEnd);
    if (index > 0) breakSeconds += secondsBetween(intervals[index - 1].end.occurredAt, interval.start.occurredAt);
  });
  const employmentType = shift.employmentType ?? "full_time";
  const scheduleSpanSeconds = secondsBetween(shift.scheduledStart, shift.scheduledEnd);
  const shiftClass = employmentType === "full_time" && scheduleSpanSeconds > 9.5 * 3600 ? "full_day" : "morning_afternoon";
  const requiredBreakCount = employmentType === "full_time" ? (shiftClass === "full_day" ? 2 : 1) : 1;
  const breakDurations = intervals.slice(1).map((interval, index) => secondsBetween(intervals[index].end.occurredAt, interval.start.occurredAt));
  if (shift.requiresBreak && breakDurations.length < requiredBreakCount) exceptions.push("Missing Break Punch");
  if (employmentType === "full_time" && breakDurations.length >= requiredBreakCount && breakDurations.filter(value => value >= 3600).length < requiredBreakCount) exceptions.push("Short Break");
  if (first && first < shift.scheduledStart) exceptions.push("Unapproved Pre-shift Time");
  if (last && last > shift.scheduledEnd) exceptions.push("Unapproved Post-shift Time");
  if (shift.expectedBranchSource && ordered.some((event) => event.source !== shift.expectedBranchSource)) exceptions.push("Wrong Branch/Device");

  const lateSeconds = first ? Math.max(0, secondsBetween(shift.scheduledStart, first) - (shift.graceSeconds ?? 0)) : 0;
  const earlyLeaveSeconds = last ? secondsBetween(last, shift.scheduledEnd) : 0;
  const preShiftSeconds = first ? secondsBetween(first, shift.scheduledStart) : 0;
  const postShiftSeconds = last ? secondsBetween(shift.scheduledEnd, last) : 0;
  const completePunches = ordered.length >= 2 && ordered.length % 2 === 0 && intervals.length * 2 === ordered.length;
  const normalCapSeconds = employmentType === "full_time" ? (shiftClass === "full_day" ? 34200 : 30600) : Math.min(shift.maximumRecognisedSeconds, scheduleSpanSeconds);
  const payableSeconds = !completePunches ? null : employmentType === "full_time" ? normalCapSeconds : Math.floor(rawWorkSeconds / 1800) * 1800;
  const overtimeCandidateSeconds = completePunches ? Math.min(Math.floor(Math.max(0, rawWorkSeconds - normalCapSeconds) / 1800) * 1800, Math.floor(postShiftSeconds / 1800) * 1800) : 0;
  const overtimeSeconds = Math.min(overtimeCandidateSeconds, Math.max(0, shift.approvedOvertimeSeconds ?? 0));
  const normalPayableSeconds = payableSeconds == null ? null : Math.min(payableSeconds, normalCapSeconds);
  return {
    intervals,
    actualFirstIn: first,
    actualLastOut: last,
    rawWorkSeconds,
    scheduledWorkedSeconds,
    presenceSeconds: completePunches && first && last ? secondsBetween(first, last) : null,
    workedSeconds: completePunches ? rawWorkSeconds : null,
    unpaidBreakSeconds: employmentType === "part_time" ? breakSeconds : 0,
    paidBreakSeconds: employmentType === "full_time" ? (completePunches ? requiredBreakCount * 3600 : null) : 0,
    payableSeconds: normalPayableSeconds,
    overtimeSeconds,
    overtimeCandidateSeconds,
    recognisedPaidSeconds: normalPayableSeconds ?? 0,
    breakSeconds,
    lateSeconds,
    earlyLeaveSeconds,
    preShiftSeconds,
    postShiftSeconds,
    employmentType,
    shiftClass,
    requiredBreakCount,
    breakDurations,
    holidayNormalEquivalentSeconds: normalPayableSeconds == null || shift.holidayNormalMultiplier == null ? null : normalPayableSeconds * shift.holidayNormalMultiplier,
    holidayOtEquivalentSeconds: shift.holidayOtMultiplier == null ? null : overtimeSeconds * shift.holidayOtMultiplier,
    exceptions: [...new Set(exceptions)],
  };
}

export function durationLabel(seconds: number) {
  const sign = seconds < 0 ? "-" : "";
  const absolute = Math.abs(seconds);
  const hours = Math.floor(absolute / 3600);
  const minutes = Math.floor((absolute % 3600) / 60);
  const remainder = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
