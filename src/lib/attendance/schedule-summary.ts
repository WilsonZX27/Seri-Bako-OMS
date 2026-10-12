type ScheduleWeekState = { branch_id: string; revision: number; status: string };

/** Summarise the latest visible roster per branch, never historical revisions. */
export function summarizeScheduleWeeks(weeks: ScheduleWeekState[]): string {
  const latest = new Map<string, ScheduleWeekState>();
  for (const week of weeks) {
    const previous = latest.get(week.branch_id);
    if (!previous || week.revision > previous.revision) latest.set(week.branch_id, week);
  }
  const statuses = new Set([...latest.values()].map((week) => week.status));
  if (!statuses.size) return "not_started";
  if (statuses.size === 1) return [...statuses][0];
  if ([...statuses].every((status) => status === "published" || status === "locked")) return "published";
  return "mixed";
}
