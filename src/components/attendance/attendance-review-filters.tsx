"use client";

import { FilterBar } from "@/components/ui/filter-bar";
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

type FilterDefaults = { branch: string; week: string; employee: string; status: string };

export function AttendanceReviewFilters({ branches, defaults, total }: { branches: Array<{ id: string; branch_name: string }>; defaults: FilterDefaults; total: number }) {
  const branchOptions = [{ value: "select", label: "Select outlet" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))];
  return <section aria-label="Actual attendance filters">
    <FilterBar className="sb-attendance-review-query" filtered={Boolean(defaults.employee || (defaults.status && defaults.status !== "all"))} resetHref={`/attendance/review?week=${encodeURIComponent(defaults.week)}&branch=${encodeURIComponent(defaults.branch)}`} resultCount={total}>
      <Input type="search" name="employee" defaultValue={defaults.employee} placeholder="Search employee" aria-label="Search employee" />
      <SelectControl name="branch" ariaLabel="Filter by outlet" defaultValue={defaults.branch} options={branchOptions} searchable searchPlaceholder="Search outlets" />
      <Input name="week" type="date" defaultValue={defaults.week} aria-label="Attendance week" />
      <SelectControl name="status" ariaLabel="Filter by attendance status" defaultValue={defaults.status} options={statusOptions} />
    </FilterBar>
  </section>;
}
