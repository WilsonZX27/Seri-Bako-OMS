"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getOptionalAdminClient() {
  try {
    return createAdminClient();
  } catch (error) {
    if (error instanceof Error && error.message.includes("service role key")) {
      return null;
    }
    throw error;
  }
}

export async function syncCurrentAuthUserToStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const admin = getOptionalAdminClient();
  if (!admin) return null;
  const email = user.email.toLowerCase();
  const now = new Date().toISOString();

  const { data: linked, error: linkedError } = await admin
    .from("staffs")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (linkedError) throw new Error(linkedError.message);

  if (linked) {
    await admin.from("staffs").update({ last_login_at: now }).eq("id", linked.id);
    return linked.id;
  }

  const { data: matches, error: matchError } = await admin
    .from("staffs")
    .select("id")
    .in("email", [email])
    .is("deleted_at", null);
  if (matchError) throw new Error(matchError.message);
  const directMatches = matches ?? [];

  const { data: inviteMatches, error: inviteMatchError } = await admin
    .from("staffs")
    .select("id")
    .in("invite_email", [email])
    .is("deleted_at", null);
  if (inviteMatchError) throw new Error(inviteMatchError.message);

  const uniqueIds = Array.from(new Set([...directMatches, ...(inviteMatches ?? [])].map((row) => row.id)));
  if (uniqueIds.length !== 1) return null;

  const staffId = uniqueIds[0];
  const { error: updateError } = await admin
    .from("staffs")
    .update({ auth_user_id: user.id, last_login_at: now })
    .eq("id", staffId);
  if (updateError) throw new Error(updateError.message);
  return staffId;
}

export async function acceptCurrentStaffInvite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to set a password.");

  const staffId = await syncCurrentAuthUserToStaff();
  if (!staffId) return;

  const admin = getOptionalAdminClient();
  if (!admin) return;
  const now = new Date().toISOString();
  const { error } = await admin
    .from("staffs")
    .update({ accepted_at: now, last_login_at: now, status: "active" })
    .eq("id", staffId);
  if (error) throw new Error(error.message);
}
