/**
 * Operational records use the company's Kuala Lumpur business day rather
 * than the server's UTC calendar day. Keeping this in one shared helper
 * prevents the local midnight window from showing different days across
 * dashboard and module pages.
 */
export function todayInKualaLumpur(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Shift an ISO business date without letting the server timezone change it. */
export function shiftBusinessDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function businessDateDaysAgo(days: number) {
  return shiftBusinessDate(todayInKualaLumpur(), -days);
}

export function businessDateDaysAhead(days: number) {
  return shiftBusinessDate(todayInKualaLumpur(), days);
}
