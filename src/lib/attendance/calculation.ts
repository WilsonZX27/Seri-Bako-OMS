export type PunchEvent = { occurredAt: Date; type?: "in" | "out" | null; source?: string };
export type AttendanceShift = {
  scheduledStart: Date;
  scheduledEnd: Date;
  maximumRecognisedSeconds: number;
  graceSeconds?: number;
  requiresBreak?: boolean;
  expectedBranchSource?: string | null;
};
export type AttendanceException =
  | "Odd Punch Count" | "Missing Break Punch" | "Wrong Branch/Device"
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
  let recognisedSeconds = 0;
  let breakSeconds = 0;

  intervals.forEach((interval, index) => {
    rawWorkSeconds += secondsBetween(interval.start.occurredAt, interval.end.occurredAt);
    const start = new Date(Math.max(interval.start.occurredAt.getTime(), shift.scheduledStart.getTime()));
    const end = new Date(Math.min(interval.end.occurredAt.getTime(), shift.scheduledEnd.getTime()));
    recognisedSeconds += secondsBetween(start, end);
    if (index > 0) breakSeconds += secondsBetween(intervals[index - 1].end.occurredAt, interval.start.occurredAt);
  });
  if (shift.requiresBreak && intervals.length < 2) exceptions.push("Missing Break Punch");
  if (first && first < shift.scheduledStart) exceptions.push("Unapproved Pre-shift Time");
  if (last && last > shift.scheduledEnd) exceptions.push("Unapproved Post-shift Time");
  if (shift.expectedBranchSource && ordered.some((event) => event.source !== shift.expectedBranchSource)) exceptions.push("Wrong Branch/Device");

  const lateSeconds = first ? Math.max(0, secondsBetween(shift.scheduledStart, first) - (shift.graceSeconds ?? 0)) : 0;
  const earlyLeaveSeconds = last ? secondsBetween(last, shift.scheduledEnd) : 0;
  const preShiftSeconds = first ? secondsBetween(first, shift.scheduledStart) : 0;
  const postShiftSeconds = last ? secondsBetween(shift.scheduledEnd, last) : 0;
  return {
    intervals,
    actualFirstIn: first,
    actualLastOut: last,
    rawWorkSeconds,
    recognisedPaidSeconds: Math.min(recognisedSeconds, shift.maximumRecognisedSeconds),
    breakSeconds,
    lateSeconds,
    earlyLeaveSeconds,
    preShiftSeconds,
    postShiftSeconds,
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
