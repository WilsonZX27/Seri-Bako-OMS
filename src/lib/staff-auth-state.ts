export type StaffAuthState = "auth_linked" | "setup_pending" | "link_needs_repair";

type StaffAuthFields = {
  auth_user_id?: string | null;
  must_change_password?: boolean | null;
  status?: string | null;
  invitation_status?: string | null;
  auth_link_valid?: boolean;
};

export function getStaffAuthState(staff: StaffAuthFields): StaffAuthState {
  if (!staff.auth_user_id || staff.auth_link_valid === false) return "link_needs_repair";
  if (staff.must_change_password || staff.status === "invited" || ["invited", "pending", "password_required"].includes(staff.invitation_status ?? "")) return "setup_pending";
  return "auth_linked";
}

export const staffAuthStateLabels: Record<StaffAuthState, string> = {
  auth_linked: "Auth linked",
  setup_pending: "Setup pending",
  link_needs_repair: "Link needs repair",
};
