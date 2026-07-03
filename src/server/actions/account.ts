"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { formatActionError, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";

const avatarTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function getCurrentStaffForAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff, error } = await supabase
    .from("staffs")
    .select("id, full_name, email, phone, avatar_path")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!staff) redirect("/dashboard?error=Your account has no staff profile assigned.");

  return { supabase, user, staff };
}

export async function updateOwnProfile(formData: FormData) {
  try {
    const { supabase, staff } = await getCurrentStaffForAccount();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!fullName) {
      safeRedirectWithMessage("/account", "error", "Display name is required.");
    }

    const db = looseSupabase(supabase);
    const { error } = await db.from("staffs").update({ full_name: fullName, phone: phone || null }).eq("id", staff.id);
    if (error) throw new Error(error.message);
    revalidatePath("/account");
    safeRedirectWithMessage("/account", "success", "Staff profile updated.");
  } catch (error) {
    rethrowRedirect(error);
    console.error(error);
    safeRedirectWithMessage("/account", "error", formatActionError(error, "Profile could not be updated."));
  }
}

export async function uploadOwnAvatar(formData: FormData) {
  try {
    const { supabase, staff } = await getCurrentStaffForAccount();
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

    const path = `${staff.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("staff-avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("staff-avatars").getPublicUrl(path);
    const db = looseSupabase(supabase);
    const { error: updateError } = await db.from("staffs").update({ avatar_url: data.publicUrl, avatar_path: path }).eq("id", staff.id);
    if (updateError) throw new Error(updateError.message);

    revalidatePath("/account");
    safeRedirectWithMessage("/account", "success", "Profile picture updated.");
  } catch (error) {
    rethrowRedirect(error);
    console.error(error);
    safeRedirectWithMessage("/account", "error", formatActionError(error, "Profile picture could not be uploaded."));
  }
}

export async function removeOwnAvatar() {
  try {
    const { supabase, staff } = await getCurrentStaffForAccount();
    if (staff.avatar_path) {
      await supabase.storage.from("staff-avatars").remove([staff.avatar_path]);
    }
    const db = looseSupabase(supabase);
    const { error } = await db.from("staffs").update({ avatar_url: null, avatar_path: null }).eq("id", staff.id);
    if (error) throw new Error(error.message);
    revalidatePath("/account");
    safeRedirectWithMessage("/account", "success", "Profile picture removed.");
  } catch (error) {
    rethrowRedirect(error);
    console.error(error);
    safeRedirectWithMessage("/account", "error", formatActionError(error, "Profile picture could not be removed."));
  }
}

export async function changeOwnPassword(formData: FormData) {
  try {
    const currentPassword = String(formData.get("current_password") ?? "");
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    if (newPassword.length < 8) safeRedirectWithMessage("/account", "error", "New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) safeRedirectWithMessage("/account", "error", "Passwords do not match.");

    const { supabase, user, staff } = await getCurrentStaffForAccount();
    if (!user.email) safeRedirectWithMessage("/account", "error", "Your account email could not be verified.");
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) safeRedirectWithMessage("/account", "error", "Current password is incorrect.");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);

    const admin = createAdminClient();
    const db = looseSupabase(admin);
    await db.from("staffs").update({ password_changed_at: new Date().toISOString(), must_change_password: false }).eq("id", staff.id);
    safeRedirectWithMessage("/account", "success", "Password changed successfully.");
  } catch (error) {
    rethrowRedirect(error);
    console.error(error);
    const message = error instanceof Error && error.message.toLowerCase().includes("different")
      ? "Please choose a password different from your current password."
      : formatActionError(error, "Password could not be changed.");
    safeRedirectWithMessage("/account", "error", message);
  }
}
