"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { formatActionError, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { readOwnPasswordChangeInput, readOwnProfileInput } from "@/server/auth/auth-input";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { logServerError } from "@/server/observability/logger";

const avatarTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function hasExpectedAvatarSignature(file: File, type: keyof typeof avatarTypes) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (type === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

async function getCurrentStaffForAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const actor = await requireActiveTenantActor();

  const { data: staff, error } = await supabase
    .from("staffs")
    .select("id, full_name, email, phone, avatar_path")
    .eq("id", actor.staffId)
    .eq("auth_user_id", user.id)
    .eq("company_id", actor.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!staff) redirect("/dashboard?error=Your account has no staff profile assigned.");

  return { supabase, user, staff };
}

export async function updateOwnProfile(formData: FormData) {
  try {
    const { supabase, user, staff } = await getCurrentStaffForAccount();
    const parsed = readOwnProfileInput(formData);
    if (!parsed.success) safeRedirectWithMessage("/account", "error", parsed.error.issues[0]?.message ?? "Please check your profile details.");
    const { fullName, phone } = parsed.data;

    const db = looseSupabase(supabase);
    const { error } = await db
      .from("staffs")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", staff.id)
      .eq("auth_user_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/account");
    safeRedirectWithMessage("/account", "success", "Staff profile updated.");
  } catch (error) {
    rethrowRedirect(error);
    logServerError(error, { source: "account.updateOwnProfile" });
    safeRedirectWithMessage("/account", "error", formatActionError(error, "Profile could not be updated."));
  }
}

export async function uploadOwnAvatar(formData: FormData) {
  try {
    const { supabase, user, staff } = await getCurrentStaffForAccount();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      safeRedirectWithMessage("/account", "error", "Please choose an image to upload.");
    }
    if (file.size > 2 * 1024 * 1024) {
      safeRedirectWithMessage("/account", "error", "Profile picture must be 2MB or smaller.");
    }
    const ext = avatarTypes[file.type];
    if (!ext) {
      safeRedirectWithMessage("/account", "error", "Please upload a PNG, JPG, or WebP image.");
    }
    if (!(await hasExpectedAvatarSignature(file, file.type as keyof typeof avatarTypes))) {
      safeRedirectWithMessage("/account", "error", "The image file content does not match its file type.");
    }

    const path = `${staff.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("staff-avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("staff-avatars").getPublicUrl(path);
    const db = looseSupabase(supabase);
    const { error: updateError } = await db
      .from("staffs")
      .update({ avatar_url: data.publicUrl, avatar_path: path })
      .eq("id", staff.id)
      .eq("auth_user_id", user.id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath("/account");
    safeRedirectWithMessage("/account", "success", "Profile picture updated.");
  } catch (error) {
    rethrowRedirect(error);
    logServerError(error, { source: "account.uploadOwnAvatar" });
    safeRedirectWithMessage("/account", "error", formatActionError(error, "Profile picture could not be uploaded."));
  }
}

export async function removeOwnAvatar() {
  try {
    const { supabase, user, staff } = await getCurrentStaffForAccount();
    if (staff.avatar_path) {
      await supabase.storage.from("staff-avatars").remove([staff.avatar_path]);
    }
    const db = looseSupabase(supabase);
    const { error } = await db
      .from("staffs")
      .update({ avatar_url: null, avatar_path: null })
      .eq("id", staff.id)
      .eq("auth_user_id", user.id);
    if (error) throw new Error(error.message);
    revalidatePath("/account");
    safeRedirectWithMessage("/account", "success", "Profile picture removed.");
  } catch (error) {
    rethrowRedirect(error);
    logServerError(error, { source: "account.removeOwnAvatar" });
    safeRedirectWithMessage("/account", "error", formatActionError(error, "Profile picture could not be removed."));
  }
}

export async function changeOwnPassword(formData: FormData) {
  try {
    const parsed = readOwnPasswordChangeInput(formData);
    if (!parsed.success) safeRedirectWithMessage("/account", "error", parsed.error.issues[0]?.message ?? "Please check the new password.");
    const { currentPassword, password: newPassword } = parsed.data;

    const { supabase, user, staff } = await getCurrentStaffForAccount();
    if (!user.email) safeRedirectWithMessage("/account", "error", "Your account email could not be verified.");
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) safeRedirectWithMessage("/account", "error", "Current password is incorrect.");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);

    const admin = createAdminClient();
    const db = looseSupabase(admin);
    const { error: staffUpdateError } = await db
      .from("staffs")
      .update({ password_changed_at: new Date().toISOString(), must_change_password: false })
      .eq("id", staff.id)
      .eq("auth_user_id", user.id);
    if (staffUpdateError) {
      logServerError(staffUpdateError, { source: "account.changeOwnPassword.staff-update", actorId: user.id });
      safeRedirectWithMessage("/account", "error", "Your password changed, but the account status could not be refreshed. Please sign in again or contact the Super Admin / Owner.");
    }
    safeRedirectWithMessage("/account", "success", "Password changed successfully.");
  } catch (error) {
    rethrowRedirect(error);
    logServerError(error, { source: "account.changeOwnPassword" });
    const message = error instanceof Error && error.message.toLowerCase().includes("different")
      ? "Please choose a password different from your current password."
      : formatActionError(error, "Password could not be changed.");
    safeRedirectWithMessage("/account", "error", message);
  }
}
