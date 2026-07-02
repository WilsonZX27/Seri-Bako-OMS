"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { acceptCurrentStaffInvite, syncCurrentAuthUserToStaff } from "@/server/auth/staff-session";

async function getSiteUrl() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

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
  const redirectTo = `${await getSiteUrl()}/auth/callback?next=/set-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent("We could not send a reset email right now. Please try again.")}`);
  }

  redirect(`/forgot-password?success=${encodeURIComponent("Reset link sent. Check your inbox for the next step.")}`);
}

export async function updatePassword(formData: FormData) {
  if (isMockMode()) {
    redirect("/set-password?success=1");
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
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
    redirect(`/set-password?error=${encodeURIComponent("We could not update your password right now. Please try again.")}`);
  }

  await acceptCurrentStaffInvite();
  redirect("/set-password?success=1");
}
