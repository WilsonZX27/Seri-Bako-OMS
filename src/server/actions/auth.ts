"use server";

import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { getAppUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { formatActionError } from "@/server/actions/error-handling";
import { acceptStaffInviteForUser, syncCurrentAuthUserToStaff } from "@/server/auth/staff-session";

export async function signIn(formData: FormData) {
  if (isMockMode()) {
    redirect("/dashboard");
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  await syncCurrentAuthUserToStaff();
  redirect("/dashboard");
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

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/forgot-password?error=Email is required.");
  }

  const supabase = await createClient();
  const redirectTo = `${await getAppUrl()}/auth/callback?next=/set-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(formatActionError(error, "We could not send the email right now. Please contact admin or try again later."))}`);
  }

  redirect(`/forgot-password?success=${encodeURIComponent("If this email exists, a reset link has been sent.")}`);
}

export async function updatePassword(formData: FormData) {
  if (isMockMode()) {
    redirect("/set-password?success=1");
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const expectedUserId = String(formData.get("invited_user_id") ?? "");
  const expectedEmail = String(formData.get("invited_email") ?? "").trim().toLowerCase();
  if (password.length < 8) {
    redirect("/set-password?error=Password must be at least 8 characters.");
  }
  if (password !== confirmPassword) {
    redirect("/set-password?error=Passwords do not match.");
  }

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

  await acceptStaffInviteForUser(user.id, user.email ?? null);
  redirect("/set-password?success=1");
}
