"use client";

import { useState } from "react";
import { SlidersHorizontal, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl, type SelectControlOption } from "@/components/ui/select-control";

const statusOptions: SelectControlOption[] = [
  { value: "all", label: "All records" },
  { value: "late", label: "Late" },
  { value: "early_leave", label: "Early leave" },
  { value: "overtime", label: "OT candidate" },
  { value: "missing_check_in", label: "Missing check-in" },
  { value: "missing_check_out", label: "Missing check-out" },
  { value: "missing_break_punch", label: "Missing break punch" },
  { value: "repeated_missing_punch", label: "Repeated missing punch" },
  { value: "short_break", label: "Short break" },
  { value: "public_holiday", label: "Public holiday" },
  { value: "unmapped_person", label: "Unmatched" },
];

function FilterFields({ branchOptions, defaults, showLabels=true }: { branchOptions: SelectControlOption[]; defaults: FilterDefaults; showLabels?:boolean }) {
  const labelClass=showLabels?"mb-1 block text-xs font-medium":"sr-only";
  return <>
    <label className="min-w-0"><span className={labelClass}>Outlet</span><SelectControl name="branch" ariaLabel="Filter by outlet" defaultValue={defaults.branch} options={branchOptions} searchable searchPlaceholder="Search outlets" /></label>
    <label className="min-w-0"><span className={labelClass}>Week</span><Input name="week" type="date" defaultValue={defaults.week} aria-label="Attendance week" /></label>
    <label className="min-w-0"><span className={labelClass}>Employee</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sb-text-muted)]"/><Input className="pl-9" name="employee" defaultValue={defaults.employee} placeholder="Search employee"/></span></label>
    <label className="min-w-0"><span className={labelClass}>Status</span><SelectControl name="status" ariaLabel="Filter by attendance status" defaultValue={defaults.status} options={statusOptions} /></label>
  </>;
}

type FilterDefaults = { branch: string; week: string; employee: string; status: string };

export function AttendanceReviewFilters({ branches, defaults, total }: { branches: Array<{ id: string; branch_name: string }>; defaults: FilterDefaults; total: number }) {
  const [open, setOpen] = useState(false);
  const branchOptions = [{ value: "all", label: "All accessible outlets" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))];
  return <section className="sb-work-surface p-3" aria-label="Actual attendance filters">
    <form className="hidden min-w-0 items-end gap-2 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,.9fr)_minmax(0,1.25fr)_minmax(0,1fr)_5.5rem]">
      <FilterFields branchOptions={branchOptions} defaults={defaults} showLabels={false}/>
      <Button type="submit" className="h-[var(--sb-control-height)]">Search</Button>
    </form>
    <div className="flex items-center gap-2 md:hidden">
      <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sb-text-muted)]"/><Input form="attendance-mobile-search" name="employee" defaultValue={defaults.employee} placeholder="Search employee" className="pl-9"/></div>
      <Button type="button" className="shrink-0" onClick={() => setOpen(true)}><SlidersHorizontal className="h-4 w-4"/>Filter</Button>
      <span className="w-10 shrink-0 text-center text-[11px] leading-tight"><strong className="block text-sm">{total}</strong>records</span>
      <form id="attendance-mobile-search"><input type="hidden" name="week" value={defaults.week}/><input type="hidden" name="branch" value={defaults.branch}/><input type="hidden" name="status" value={defaults.status}/></form>
    </div>
    {open ? <div className="fixed inset-0 z-[var(--sb-z-dialog)] md:hidden">
      <button type="button" className="sb-dialog-backdrop absolute inset-0" onClick={() => setOpen(false)} aria-label="Close attendance filters"/>
      <form className="sb-popover-surface absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[var(--sb-panel-radius)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <header className="mb-4 flex items-center justify-between border-b border-[var(--sb-border-soft)] pb-3"><h2 className="text-base font-semibold">Filters</h2><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close filters"><X className="h-5 w-5"/></Button></header>
        <div className="grid gap-3"><FilterFields branchOptions={branchOptions} defaults={defaults}/></div>
        <footer className="mt-4 grid grid-cols-[1fr_2fr] gap-2 border-t border-[var(--sb-border-soft)] pt-3"><Button type="button" variant="ghost" onClick={() => { window.location.href = `/attendance/review?week=${encodeURIComponent(defaults.week)}`; }}>Reset</Button><Button type="submit">Apply filters</Button></footer>
      </form>
    </div> : null}
  </section>;
}
