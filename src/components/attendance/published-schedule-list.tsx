"use client";

import { useState } from "react";
import { ShiftRequestButton } from "./shift-request-button";
import type { getOwnPublishedShifts } from "@/server/queries/attendance";
import { formatAttendanceTime } from "@/lib/attendance/time";
import { SelectControl } from "@/components/ui/select-control";

export function PublishedScheduleList({
  shifts,
  allowRequests = true,
}: {
  shifts: Awaited<ReturnType<typeof getOwnPublishedShifts>>;
  allowRequests?: boolean;
}) {
  const [outlet, setOutlet] = useState("all");
  const outlets = [
    ...new Set(
      shifts.map((shift) => shift.branches?.branch_name ?? "Assigned outlet"),
    ),
  ];
  const visibleOutlets =
    outlet === "all" ? outlets : outlets.filter((name) => name === outlet);
  return (
    <section className="sb-work-surface overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <h2 className="text-sm font-semibold">My published schedule</h2>
        <label className="flex items-center gap-2 text-xs">
          Outlet
          <SelectControl
            ariaLabel="Published schedule outlet"
            value={outlet}
            onValueChange={setOutlet}
            className="max-w-52"
            searchable
            options={[
              { value: "all", label: "All outlets" },
              ...outlets.map((name) => ({ value: name, label: name })),
            ]}
          />
        </label>
      </header>
      {visibleOutlets.map((name) => (
        <section key={name} aria-label={name}>
          <h3 className="border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-semibold">
            {name}
          </h3>
          <ul className="divide-y">
            {shifts
              .filter(
                (shift) =>
                  (shift.branches?.branch_name ?? "Assigned outlet") === name,
              )
              .map((shift) => {
                const start =
                  shift.shift_templates?.planned_start ?? shift.custom_start;
                const end =
                  shift.shift_templates?.planned_end ?? shift.custom_end;
                return (
                  <li
                    key={shift.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                  >
                    <div className="shrink-0">
                      <strong className="block tabular-nums">
                        {shift.work_date}
                      </strong>
                      <span className="text-muted-foreground">
                        {start && end
                          ? `${formatAttendanceTime(start)}–${formatAttendanceTime(end)}`
                          : shift.assignment_kind.toUpperCase()}
                      </span>
                    </div>
                    {allowRequests ? <ShiftRequestButton assignmentId={shift.id} /> : null}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      {!shifts.length ? (
        <p className="p-3 text-sm text-muted-foreground">
          No published shifts this week.
        </p>
      ) : null}
    </section>
  );
}
