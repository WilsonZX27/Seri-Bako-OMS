/** Natural staff-code order; absent codes remain last in either direction. */
export function compareStaffCodes(a: {staff_code: string | null; full_name: string; id: string}, b: {staff_code: string | null; full_name: string; id: string}, ascending = true) {
  if (!a.staff_code || !b.staff_code) return a.staff_code ? -1 : b.staff_code ? 1 : a.full_name.localeCompare(b.full_name) || a.id.localeCompare(b.id);
  return (ascending ? 1 : -1) * a.staff_code.localeCompare(b.staff_code, undefined, {numeric: true, sensitivity: "base"}) || a.full_name.localeCompare(b.full_name) || a.id.localeCompare(b.id);
}
