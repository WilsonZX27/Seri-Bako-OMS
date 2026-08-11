"use server";

import { redirect } from "next/navigation";
import { getLandingIaItems } from "@/lib/information-architecture";
import { isSystemRoleCode } from "@/lib/roles";
import { isMockMode } from "@/lib/mock-mode";
import { getAppUrl } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatActionError } from "@/server/actions/error-handling";
import { readEmailInput, readPasswordChangeInput, readSignInInput } from "@/server/auth/auth-input";
import { resolveEffectivePermission } from "@/server/auth/permissions";
import { acceptCurrentStaffInvite, requireCurrentLinkedStaff } from "@/server/auth/staff-session";
import { logServerError, logServerWarning } from "@/server/observability/logger";

function isRetryableAuthNetworkError(error: { name?: string; message?: string } | null) {
  const normalized = error?.message?.toLowerCase() ?? "";
  return error?.name === "AuthRetryableFetchError" || normalized.includes("fetch failed") || normalized.includes("network");
}

async function requireLinkedStaffForAuthUser(_userId: string, _email: string | null) {
  void _userId;
  void _email;
  return requireCurrentLinkedStaff();
}

export async function signIn(formData: FormData) {
  if (isMockMode()) {
    redirect(getLandingIaItems("super_admin")[0]?.href ?? "/access-status?reason=no-permitted-route");
  }

  const parsed = readSignInInput(formData);
  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter a valid email and password.")}`);
  }
  const { email, password } = parsed.data;
  const supabase = await createClient();

  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && isRetryableAuthNetworkError(error)) {
    logServerWarning(error, { source: "auth.sign-in.retry" });
    await new Promise((resolve) => setTimeout(resolve, 250));
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  }
  if (error) {
    logServerError(error, { source: "auth.sign-in" });
    if (isRetryableAuthNetworkError(error)) {
      redirect(`/login?error=${encodeURIComponent("Unable to contact the sign-in service. Check your connection and try again.")}`);
    }
    redirect(`/login?error=${encodeURIComponent("Invalid email or password.")}`);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    logServerError(userError ?? "Signed-in user was unavailable after authentication.", { source: "auth.sign-in.current-user" });
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("We could not complete your sign-in. Please try again.")}`);
  }

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("id, must_change_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (staffError) {
    logServerError(staffError, { source: "auth.sign-in.staff-lookup", actorId: user.id });
    redirect("/access-status?reason=workspace-unavailable");
  }
  if (staff?.must_change_password) {
    redirect("/change-password");
  }
  if (!staff?.id) redirect("/access-status?reason=missing-profile");
  const today = new Date().toISOString().slice(0, 10);
  const { data: assignments } = await supabase
    .from("staff_roles")
    .select("is_primary, roles(role_code)")
    .eq("staff_id", staff.id)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`);
  const assignment = assignments?.find((row) => row.is_primary) ?? assignments?.[0];
  const assignedRole = assignment?.roles as { role_code?: string | null } | { role_code?: string | null }[] | null;
  const roleCode = Array.isArray(assignedRole) ? assignedRole[0]?.role_code : assignedRole?.role_code;
  if (!isSystemRoleCode(roleCode)) redirect("/access-status?reason=no-permitted-route");
  for (const item of getLandingIaItems(roleCode)) {
    if (await resolveEffectivePermission(supabase, [item.permission]).catch(() => false)) {
      redirect(item.href);
    }
  }
  redirect("/access-status?reason=no-permitted-route");
}

export async function signOut() {
  if (isMockMode()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function sendPasswordReset(formData: FormData) {
  if (isMockMode()) {
    redirect(`/login?message=${encodeURIComponent("Password reset email sent.")}`);
  }

  const parsed = readEmailInput(formData.get("email"));
  if (!parsed.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter a valid work email address.")}`);
  }
  const email = parsed.data;

  const supabase = await createClient();
  const redirectTo = `${await getAppUrl()}/auth/callback?next=/set-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(formatActionError(error, "We could not send the email right now. Please contact the Super Admin / Owner or try again later."))}`);
  }

  redirect(`/forgot-password?success=${encodeURIComponent("If this email exists, a reset link has been sent.")}`);
}

export async function updatePassword(formData: FormData) {
  if (isMockMode()) {
    redirect("/set-password?success=1");
  }

  const parsed = readPasswordChangeInput(formData);
  if (!parsed.success) {
    redirect(`/set-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Review the password fields and try again.")}`);
  }
  const { password } = parsed.data;
  const expectedUserId = String(formData.get("invited_user_id") ?? "");
  const expectedEmail = String(formData.get("invited_email") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/set-password?error=${encodeURIComponent("Your reset link has expired or is invalid. Please request a new password reset email.")}`);
  }
  if (!expectedUserId || !expectedEmail) {
    redirect(`/set-password?error=${encodeURIComponent("This password setup session is missing invitation identity details. Please open the invitation link again.")}`);
  }
  if (user.id !== expectedUserId || (user.email ?? "").toLowerCase() !== expectedEmail) {
    redirect(`/set-password?error=${encodeURIComponent("This invitation belongs to a different account. Please sign out and open the invitation link again.")}`);
  }

  try {
    await requireLinkedStaffForAuthUser(user.id, user.email ?? null);
  } catch (error) {
    redirect(`/set-password?error=${encodeURIComponent(formatActionError(error, "This sign-in is not linked to a staff profile. Ask the Super Admin / Owner to repair the sign-in link."))}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("auth session missing")) {
      redirect(`/set-password?error=${encodeURIComponent("Your reset link has expired or is invalid. Please request a new password reset email.")}`);
    }
    if (message.includes("different from the old password")) {
      redirect(`/set-password?error=${encodeURIComponent("This password is too similar to your current password. Please choose a different password.")}`);
    }
    if (message.includes("password")) {
      redirect(`/set-password?error=${encodeURIComponent("Password does not meet the required policy. Please use a stronger password and try again.")}`);
    }
    redirect(`/set-password?error=${encodeURIComponent("We could not update your password right now. Please try again later or request a new link.")}`);
  }

  await acceptCurrentStaffInvite();
  redirect("/set-password?success=1");
}

export async function changePassword(formData: FormData) {
  if (isMockMode()) {
    redirect("/dashboard");
  }

  const parsed = readPasswordChangeInput(formData);
  if (!parsed.success) {
    redirect(`/change-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Review the password fields and try again.")}`);
  }
  const { password } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?error=Please sign in before changing your password.");
  }

  let staff: Awaited<ReturnType<typeof requireLinkedStaffForAuthUser>>;
  try {
    staff = await requireLinkedStaffForAuthUser(user.id, user.email ?? null);
  } catch (error) {
    redirect(`/change-password?error=${encodeURIComponent(formatActionError(error, "This sign-in is not linked to a staff profile. Ask the Super Admin / Owner to repair the sign-in link."))}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("different from the old password") || normalized.includes("same password") || normalized.includes("should be different")) {
      redirect(`/change-password?error=${encodeURIComponent("Please choose a password different from your temporary password.")}`);
    }
    redirect(`/change-password?error=${encodeURIComponent(formatActionError(error, "We could not update your password right now."))}`);
  }

  const now = new Date().toISOString();
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (adminError) {
    logServerError(adminError, { source: "auth.change-password.admin-client" });
    redirect(`/change-password?error=${encodeURIComponent("Password was changed, but your staff profile could not be updated. Please contact the Super Admin / Owner.")}`);
  }
  const { error: staffUpdateError } = await admin
    .from("staffs")
    .update({
      must_change_password: false,
      password_changed_at: now,
      accepted_at: now,
      status: staff.status === "invited" ? "active" : staff.status,
      invitation_status: "completed",
      last_login_at: now,
    })
    .eq("id", staff.id);

  if (staffUpdateError) {
    logServerError(staffUpdateError, { source: "auth.change-password.staff-update", actorId: user.id });
    redirect(`/change-password?error=${encodeURIComponent("Password was changed, but your staff profile could not be updated. Please contact the Super Admin / Owner.")}`);
  }

  redirect("/dashboard");
}
