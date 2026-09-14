type Issue = { code: string; message: string; staffId?: string; staffName?: string; workDate?: string };

export function ScheduleValidationSummary({ issues, dirty }: { issues: Issue[]; dirty: boolean }) {
  if (!issues.length) return null;
  const missing = new Map<string, { name: string; days: string[] }>();
  const other: Issue[] = [];
  for (const issue of issues) {
    if (issue.code !== "unresolved_staff_day" || !issue.staffId || !issue.workDate) {
      other.push(issue);
      continue;
    }
    const group = missing.get(issue.staffId) ?? { name: issue.staffName ?? "Employee", days: [] };
    if (!group.days.includes(issue.workDate)) group.days.push(issue.workDate);
    missing.set(issue.staffId, group);
  }
  return <section aria-label="Schedule completeness" className="min-w-0 space-y-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] p-2 text-xs">
    <p className="font-semibold">{dirty ? "Saved draft checks" : "Before submitting"}</p>
    {missing.size ? <>
      <p>{missing.size} employee{missing.size === 1 ? " has" : "s have"} unassigned days. Add the actual shift, OFF or leave. A submitted or published assignment at another outlet also counts.</p>
      <details>
        <summary className="cursor-pointer py-2 font-medium">Review missing days ({[...missing.values()].reduce((sum, group) => sum + group.days.length, 0)})</summary>
        <ul className="max-h-60 space-y-2 overflow-y-auto break-words">
          {[...missing].map(([id, group]) => <li key={id}><strong>{group.name}</strong><p>{group.days.sort().map((day) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))).join(" · ")}</p></li>)}
        </ul>
      </details>
    </> : null}
    {other.map((issue, index) => <p key={`${issue.code}:${issue.staffId ?? ""}:${index}`} className="text-[var(--sb-danger)]">{issue.message}</p>)}
    {dirty ? <p className="text-muted-foreground">Save your changes to refresh these checks.</p> : <p className="text-muted-foreground">You can save an incomplete draft. Complete the missing days before submitting.</p>}
  </section>;
}
