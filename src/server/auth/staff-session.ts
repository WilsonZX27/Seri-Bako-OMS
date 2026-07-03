"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRoleDisplayLabel } from "@/lib/roles";

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

  await acceptStaffInviteForUser(user.id, user.email ?? null);
}

export async function acceptStaffInviteForUser(userId: string, email: string | null) {
  if (!email) throw new Error("A valid invitation email is required.");

  const staffId = await syncAuthUserToStaff(userId, email);
  if (!staffId) return;

  const admin = getOptionalAdminClient();
  if (!admin) return;
  const now = new Date().toISOString();
  const { error } = await admin
    .from("staffs")
    .update({
      accepted_at: now,
      last_login_at: now,
      status: "active",
      must_change_password: false,
      password_changed_at: now,
      invitation_status: "active",
    })
    .eq("id", staffId);
  if (error) throw new Error(error.message);
}

async function syncAuthUserToStaff(userId: string, userEmail: string) {
  const admin = getOptionalAdminClient();
  if (!admin) return null;
  const email = userEmail.toLowerCase();
  const now = new Date().toISOString();

  const { data: linked, error: linkedError } = await admin
    .from("staffs")
    .select("id")
    .eq("auth_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (linkedError) throw new Error(linkedError.message);

  if (linked) {
    await admin.from("staffs").update({ last_login_at: now }).eq("id", linked.id);
    return linked.id;
  }

  const { data: emailMatches, error: emailError } = await admin
    .from("staffs")
    .select("id")
    .in("email", [email])
    .is("deleted_at", null);
  if (emailError) throw new Error(emailError.message);

  const { data: inviteMatches, error: inviteError } = await admin
    .from("staffs")
    .select("id")
    .in("invite_email", [email])
    .is("deleted_at", null);
  if (inviteError) throw new Error(inviteError.message);

  const uniqueIds = Array.from(new Set([...(emailMatches ?? []), ...(inviteMatches ?? [])].map((row) => row.id)));
  if (uniqueIds.length !== 1) return null;

  const staffId = uniqueIds[0];
  const { error: updateError } = await admin
    .from("staffs")
    .update({ auth_user_id: userId, last_login_at: now })
    .eq("id", staffId);
  if (updateError) throw new Error(updateError.message);
  return staffId;
}

export type PasswordSetupContext = {
  userId: string;
  email: string;
  staffName: string | null;
  staffStatus: string | null;
  companyName: string;
  companyLogoUrl: string | null;
  invitedByName: string | null;
  roleName: string | null;
  branchName: string | null;
  invitedAt: string | null;
  expiryLabel: string;
};

export async function getPasswordSetupContext(): Promise<PasswordSetupContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admin = getOptionalAdminClient();
  const fallback = {
    userId: user.id,
    email: user.email,
    staffName: null,
    staffStatus: null,
    companyName: "Seri Bako OMS",
    companyLogoUrl: null,
    invitedByName: null,
    roleName: null,
    branchName: null,
    invitedAt: null,
    expiryLabel: "Based on the Supabase invitation email policy.",
  };
  if (!admin) return fallback;

  const email = user.email.toLowerCase();
  const { data: linkedStaff, error: linkedError } = await admin
    .from("staffs")
    .select("*")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (linkedError) throw new Error(linkedError.message);

  let staff = linkedStaff;
  if (!staff) {
    const { data: matches, error: matchError } = await admin
      .from("staffs")
      .select("*")
      .in("invite_email", [email])
      .is("deleted_at", null);
    if (matchError) throw new Error(matchError.message);
    if ((matches ?? []).length === 1) staff = matches?.[0] ?? null;
  }
  if (!staff) return fallback;

  const [{ data: company }, { data: primaryRole }, { data: defaultBranch }, { data: inviter }] = await Promise.all([
    admin.from("companies").select("company_name, logo_url").eq("id", staff.company_id).maybeSingle(),
    admin.from("staff_roles").select("role_id").eq("staff_id", staff.id).eq("is_primary", true).maybeSingle(),
    staff.default_branch_id
      ? admin.from("branches").select("branch_name").eq("id", staff.default_branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
    staff.invited_by
      ? admin.from("staffs").select("full_name").eq("id", staff.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let roleName: string | null = null;
  if (primaryRole?.role_id) {
    const { data: role } = await admin.from("roles").select("role_code, role_name").eq("id", primaryRole.role_id).maybeSingle();
    roleName = role ? getRoleDisplayLabel(role.role_code, role.role_name) : null;
  }

  let branchName = defaultBranch?.branch_name ?? null;
  if (!branchName) {
    const { data: staffBranch } = await admin
      .from("staff_branches")
      .select("branch_id")
      .eq("staff_id", staff.id)
      .eq("is_default", true)
      .maybeSingle();
    if (staffBranch?.branch_id) {
      const { data: branch } = await admin.from("branches").select("branch_name").eq("id", staffBranch.branch_id).maybeSingle();
      branchName = branch?.branch_name ?? null;
    }
  }

  return {
    userId: user.id,
    email: staff.invite_email ?? staff.email ?? user.email,
    staffName: staff.full_name,
    staffStatus: staff.status,
    companyName: company?.company_name ?? fallback.companyName,
    companyLogoUrl: company?.logo_url ?? null,
    invitedByName: inviter?.full_name ?? null,
    roleName,
    branchName,
    invitedAt: staff.invited_at,
    expiryLabel: staff.invited_at
      ? "Based on the Supabase invitation email policy from the invited time."
      : fallback.expiryLabel,
  };
}
