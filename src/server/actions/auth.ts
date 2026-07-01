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
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?message=${encodeURIComponent("Password reset email sent. Check your inbox.")}`);
}

export async function updatePassword(formData: FormData) {
  if (isMockMode()) {
    redirect("/dashboard");
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
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/set-password?error=${encodeURIComponent(error.message)}`);
  }

  await acceptCurrentStaffInvite();
  redirect("/dashboard");
}
