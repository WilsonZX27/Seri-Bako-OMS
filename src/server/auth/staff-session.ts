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

export async function acceptCurrentStaffInvite() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to set a password.");

  await acceptStaffInviteForCurrentUser(user.id, user.email ?? null);
}

export async function requireCurrentLinkedStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return requireLinkedStaffForAuthUser(user.id, user.email ?? null);
}

async function acceptStaffInviteForCurrentUser(userId: string, email: string | null) {
  const staff = await requireLinkedStaffForAuthUser(userId, email);
  const admin = createAdminClient();
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
    .eq("id", staff.id);
  if (error) throw new Error(error.message);
}

async function requireLinkedStaffForAuthUser(userId: string, userEmail: string | null) {
  if (!userEmail) throw new Error("A valid staff sign-in email is required.");
  const admin = createAdminClient();
  const { data: linked, error } = await admin
    .from("staffs")
    .select("id, email, invite_email, status")
    .eq("auth_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!linked) throw new Error("This sign-in is not linked to a staff profile. Ask the Super Admin / Owner to repair the sign-in link.");
  if (linked.status === "disabled") throw new Error("This staff account is disabled.");
  const normalized = userEmail.trim().toLowerCase();
  const staffEmails = [linked.email, linked.invite_email].filter(Boolean).map((value) => value!.trim().toLowerCase());
  if (!staffEmails.length || !staffEmails.some((value) => value === normalized)) {
    throw new Error("The staff profile email does not match this sign-in account. Ask the Super Admin / Owner to review it.");
  }
  return linked;
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
  if (!admin) return null;
  const { data: linkedStaff, error: linkedError } = await admin
    .from("staffs")
    .select("id,email,invite_email,status,company_id,default_branch_id,invited_by,full_name,invited_at")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (linkedError) throw new Error(linkedError.message);

  const staff = linkedStaff;
  if (!staff) return null;
  const normalized = user.email.trim().toLowerCase();
  const staffEmails = [staff.email, staff.invite_email].filter(Boolean).map((value) => value!.trim().toLowerCase());
  if (!staffEmails.length || !staffEmails.some((value) => value === normalized)) return null;

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
    companyName: company?.company_name ?? "Seri Bako OMS",
    companyLogoUrl: company?.logo_url ?? null,
    invitedByName: inviter?.full_name ?? null,
    roleName,
    branchName,
    invitedAt: staff.invited_at,
    expiryLabel: staff.invited_at
      ? "Based on the Supabase invitation email policy from the invited time."
      : "Based on the Supabase invitation email policy.",
  };
}
