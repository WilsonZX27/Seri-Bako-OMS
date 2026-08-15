/**
 * Operational records use the company's Kuala Lumpur business day rather
 * than the server's UTC calendar day. Keeping this in one shared helper
 * prevents the local midnight window from showing different days across
 * dashboard and module pages.
 */
export function todayInKualaLumpur() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
