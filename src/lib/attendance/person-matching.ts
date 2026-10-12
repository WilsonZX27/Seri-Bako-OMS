export type MatchingStaff = { id: string; full_name: string; staff_code: string | null };
const name = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const code = (value: string) => /^\d+$/.test(value.trim()) ? value.trim().replace(/^0+(?=\d)/, "") : value.trim().toUpperCase();
const tokens = (value: string) => name(value).split(" ").filter(token => token.length >= 4 && !["MOHD", "MUHAMMAD", "MOHAMMAD", "BINTI"].includes(token));
export function compatiblePersonName(a: string, b: string) {
  if (name(a) === name(b)) return true;
  return tokens(a).some(left => tokens(b).some(right => left === right || (Math.min(left.length,right.length)>=5 && (left+"H"===right || right+"H"===left))));
}
/** A matching identifier is required for partial names. Conflicts never fall back to names. */
export function matchPunchPerson(personId: string, personName: string, staffs: MatchingStaff[]): MatchingStaff | null {
  const ids=staffs.filter(staff=>staff.staff_code && code(staff.staff_code)===code(personId));
  if(ids.length) return ids.length===1 && compatiblePersonName(personName,ids[0].full_name) ? ids[0] : null;
  const exact=staffs.filter(staff=>name(staff.full_name)===name(personName));
  return exact.length===1 ? exact[0] : null;
}
