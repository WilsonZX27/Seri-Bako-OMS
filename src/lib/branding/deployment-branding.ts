// Public, per-deployment labels. Authentication still owns company data/theme.
const label = (value: string | undefined, fallback: string, max: number) => value?.trim().replace(/\s+/g, " ").slice(0, max) || fallback;
export const APPLICATION_NAME = label(process.env.NEXT_PUBLIC_APP_NAME, "Operations Management System", 80);
export const APPLICATION_SHORT_NAME = label(process.env.NEXT_PUBLIC_APP_SHORT_NAME, "Operations", 32);
export const APPLICATION_DESCRIPTION = "Operational workdesk for procurement, receiving, inventory, production, and outlet operations.";
