"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { getAppUrl } from "@/lib/site-url";
import { canAssignRoleCode, isProtectedOwnerAssignableRole, isSuperAdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { setTemporaryPasswordHandoff } from "@/server/auth/temporary-password-handoff";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, companySchema, documentSequenceSchema, roleSchema, staffAccessSchema, staffSchema } from "@/lib/validations/foundation";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { findAuthUsersByEmail } from "@/server/auth/admin-users";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

function formValue(formData: FormData, key: string) {
  return formData.get(key);
}

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function updateCompany(id: string, formData: FormData) {
  await requirePermission("company.update");
  const actor = await requireActiveTenantActor();
  const parsed = companySchema.parse({
    company_code: formValue(formData, "company_code"),
    company_name: formValue(formData, "company_name"),
    registration_no: formValue(formData, "registration_no"),
    tax_no: formValue(formData, "tax_no"),
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    address: formValue(formData, "address"),
    status: formValue(formData, "status") ?? "active",
  });

  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("companies").update(parsed).eq("id", actor.companyId);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "company", entityId: actor.companyId, activityType: "updated", message: "Company profile updated" });
  }

  revalidatePath("/company");
  redirect("/company");
}

const logoTypes: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function logoError(message: string): never {
  redirect(`/company?logoError=${encodeURIComponent(message)}`);
}

export async function updateCompanyLogo(id: string, formData: FormData) {
  await requirePermissionOrRedirect("company.update", "/company");
  try {
    const actor = await requireActiveTenantActor();
    const file = formData.get("logo");

    if (!(file instanceof File) || file.size === 0) {
      logoError("Choose a logo image to upload.");
    }

    if (file.size > 2 * 1024 * 1024) {
      logoError("Logo must be 2MB or smaller.");
    }

    const extension = logoTypes[file.type];
    if (!extension) {
      logoError("Logo must be a PNG, JPG, JPEG, WEBP, or SVG image.");
    }

    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("logo_path")
        .eq("id", actor.companyId)
        .single();
      if (companyError) throw new Error(companyError.message);

      const path = `${actor.companyId}/logo.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      if (company?.logo_path && company.logo_path !== path) {
        await supabase.storage.from("company-assets").remove([company.logo_path]);
      }

      const { data: publicUrl } = supabase.storage.from("company-assets").getPublicUrl(path);
      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_path: path, logo_url: publicUrl.publicUrl })
        .eq("id", actor.companyId);
      if (updateError) throw new Error(updateError.message);
      await writeActivityLog({ entityType: "company", entityId: actor.companyId, activityType: "updated", message: "Company logo updated" });
    }
  } catch (error) {
    rethrowRedirect(error);
    logoError(formatActionError(error, "Could not update the company logo."));
  }

  revalidatePath("/company");
  revalidatePath("/", "layout");
  safeRedirectWithMessage("/company", "success", "Company logo updated.");
}

export async function removeCompanyLogo(id: string) {
  void id; // The target is always derived from the authenticated actor.
  await requirePermissionOrRedirect("company.update", "/company");
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("logo_path")
        .eq("id", actor.companyId)
        .single();
      if (companyError) throw new Error(companyError.message);

      if (company?.logo_path) {
        const { error: removeError } = await supabase.storage.from("company-assets").remove([company.logo_path]);
        if (removeError) throw new Error(removeError.message);
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_path: null, logo_url: null })
        .eq("id", actor.companyId);
      if (updateError) throw new Error(updateError.message);
      await writeActivityLog({ entityType: "company", entityId: actor.companyId, activityType: "updated", message: "Company logo removed" });
    }
  } catch (error) {
    rethrowRedirect(error);
    logoError(formatActionError(error, "Could not remove the company logo."));
  }

  revalidatePath("/company");
  revalidatePath("/", "layout");
  safeRedirectWithMessage("/company", "success", "Company logo removed.");
}

function branchPayload(formData: FormData, companyId: string) {
  return branchSchema.parse({
    company_id: companyId,
    branch_code: formValue(formData, "branch_code"),
    branch_name: formValue(formData, "branch_name"),
    branch_type: formValue(formData, "branch_type") ?? "outlet",
    phone: formValue(formData, "phone"),
    email: formValue(formData, "email"),
    address: formValue(formData, "address"),
    status: formValue(formData, "status") ?? "active",
  });
}

export async function createBranch(formData: FormData) {
  await requirePermissionOrRedirect("branches.create", "/branches/new");
  try {
    const actor = await requireActiveTenantActor();
    const payload = branchPayload(formData, actor.companyId);
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: archivedMatch, error: archivedError } = await supabase
        .from("branches")
        .select("id")
        .eq("company_id", actor.companyId)
        .or(`branch_code.eq.${payload.branch_code},branch_name.eq.${payload.branch_name}`)
        .not("deleted_at", "is", null)
        .limit(1)
        .maybeSingle();
      if (archivedError) throw new Error(archivedError.message);
      if (archivedMatch) {
        safeRedirectWithMessage(`/branches/${archivedMatch.id}`, "error", "An archived branch with the same code or name already exists. Restore it instead of creating a duplicate.");
      }
      const { data, error } = await supabase.from("branches").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "branch", entityId: data.id, activityType: "created", message: `Branch ${payload.branch_name} created` });
    }
    revalidatePath("/branches");
    redirect("/branches");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/branches/new", "error", formatActionError(error, "Could not create this branch."));
  }
}

export async function updateBranch(id: string, formData: FormData) {
  await requirePermission("branches.update");
  const actor = await requireActiveTenantActor();
  const payload = branchPayload(formData, actor.companyId);

  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("branches").update(payload).eq("id", id).eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "branch", entityId: id, activityType: "updated", message: `Branch ${payload.branch_name} updated` });
  }

  revalidatePath("/branches");
  redirect("/branches");
}

export async function deleteBranch(id: string) {
  await requirePermissionOrRedirect("branches.update", "/branches");
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("branches").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id).eq("company_id", actor.companyId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "branch", entityId: id, activityType: "archived", message: "Branch archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/branches", "error", formatActionError(error, "Could not archive this branch."));
  }
  revalidatePath("/branches");
  safeRedirectWithMessage("/branches", "success", "Branch archived.");
}

export async function restoreBranch(id: string) {
  await requirePermissionOrRedirect("branches.update", `/branches/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("branches").update({ deleted_at: null, status: "active" }).eq("id", id).eq("company_id", actor.companyId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "branch", entityId: id, activityType: "restored", message: "Branch restored" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/branches/${id}`, "error", formatActionError(error, "Could not restore this branch."));
  }
  revalidatePath("/branches");
  revalidatePath(`/branches/${id}`);
  safeRedirectWithMessage(`/branches/${id}`, "success", "Branch restored.");
}

function staffPayload(formData: FormData, companyId: string) {
  return staffSchema.parse({
    company_id: companyId,
    staff_code: formValue(formData, "staff_code"),
    full_name: formValue(formData, "full_name"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone"),
    default_branch_id: null,
    status: formValue(formData, "status") ?? "invited",
  });
}

function staffAccessPayload(formData: FormData) {
  return staffAccessSchema.parse({
    role_id: formValue(formData, "role_id"),
    default_branch_id: formValue(formData, "default_branch_id"),
    accessible_branch_ids: formData.getAll("accessible_branch_ids").map(String),
  });
}

async function replaceStaffAccess(staffId: string, formData: FormData, payload?: ReturnType<typeof staffPayload>) {
  const access = staffAccessPayload(formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_staff_access_atomic", {
    p_staff_id: staffId,
    p_role_id: access.role_id,
    p_default_branch_id: access.default_branch_id,
    p_accessible_branch_ids: access.accessible_branch_ids,
    p_status: payload?.status,
    p_staff_code: payload?.staff_code,
    p_full_name: payload?.full_name,
    p_email: payload?.email,
    p_phone: payload?.phone,
  });
  if (error) throw new Error(error.message);
}

async function getCurrentStaffId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("staffs").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data?.id ?? null;
}

async function getCurrentStaffRoleCodes(admin: ReturnType<typeof createAdminClient>) {
  const staffId = await getCurrentStaffId();
  if (!staffId) return [];
  const { data, error } = await admin.from("staff_roles").select("roles(role_code)").eq("staff_id", staffId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => {
      const role = row.roles as { role_code?: string | null } | { role_code?: string | null }[] | null;
      return Array.isArray(role) ? role[0]?.role_code : role?.role_code;
    })
    .filter((roleCode): roleCode is string => Boolean(roleCode));
}

async function getRoleCodeById(admin: ReturnType<typeof createAdminClient>, roleId: string | null | undefined) {
  if (!roleId) return null;
  const actor = await requireActiveTenantActor();
  const { data, error } = await admin.from("roles").select("role_code").eq("id", roleId).eq("company_id", actor.companyId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role_code ?? null;
}

async function getPrimaryStaffRoleId(admin: ReturnType<typeof createAdminClient>, staffId: string) {
  const actor = await requireActiveTenantActor();
  const { data: target, error: targetError } = await admin.from("staffs").select("id").eq("id", staffId).eq("company_id", actor.companyId).maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error("Target staff was not found in your company.");
  const { data, error } = await admin
    .from("staff_roles")
    .select("role_id")
    .eq("staff_id", staffId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role_id ?? null;
}

async function activeSuperAdminCount(admin: ReturnType<typeof createAdminClient>) {
  const actor = await requireActiveTenantActor();
  const { data: roles, error: rolesError } = await admin.from("roles").select("id").eq("company_id", actor.companyId).eq("role_code", "super_admin").eq("status", "active").is("deleted_at", null);
  if (rolesError) throw new Error(rolesError.message);
  const roleIds = (roles ?? []).map((role) => role.id);
  if (!roleIds.length) return 0;

  const { data: assignments, error: assignmentError } = await admin.from("staff_roles").select("staff_id, effective_from, effective_to").in("role_id", roleIds);
  if (assignmentError) throw new Error(assignmentError.message);
  const today = new Date().toISOString().slice(0, 10);
  const staffIds = Array.from(new Set((assignments ?? []).filter((row) => (!row.effective_from || row.effective_from <= today) && (!row.effective_to || row.effective_to >= today)).map((row) => row.staff_id).filter(Boolean)));
  if (!staffIds.length) return 0;

  const { data: staffs, error: staffError } = await admin.from("staffs").select("id, status, deleted_at").eq("company_id", actor.companyId).in("id", staffIds);
  if (staffError) throw new Error(staffError.message);
  return (staffs ?? []).filter((staff) => staff.status === "active" && !staff.deleted_at).length;
}

async function assertCanAssignStaffRole(admin: ReturnType<typeof createAdminClient>, roleId: string, staffId?: string) {
  const targetRoleCode = await getRoleCodeById(admin, roleId);
  if (!targetRoleCode) throw new Error("Selected role was not found.");
  const currentRoleCodes = await getCurrentStaffRoleCodes(admin);
  const currentIsSuperAdmin = currentRoleCodes.some(isSuperAdminRole);

  if (staffId) {
    const existingRoleId = await getPrimaryStaffRoleId(admin, staffId);
    const existingRoleCode = await getRoleCodeById(admin, existingRoleId);
    if (existingRoleCode && existingRoleCode !== targetRoleCode && isProtectedOwnerAssignableRole(existingRoleCode) && !currentIsSuperAdmin) {
      throw new Error("Only Super Admin / Owner can change a protected owner role.");
    }
    if (existingRoleCode && isSuperAdminRole(existingRoleCode) && !isSuperAdminRole(targetRoleCode)) {
      const currentStaffId = await getCurrentStaffId();
      const ownerCount = await activeSuperAdminCount(admin);
      if (currentStaffId === staffId && ownerCount <= 1) {
        throw new Error("You cannot remove your own Super Admin / Owner role while you are the only owner.");
      }
      if (ownerCount <= 1) {
        throw new Error("Cannot remove the last Super Admin / Owner role.");
      }
    }
    if (existingRoleCode === targetRoleCode) return;
  }

  if (!currentRoleCodes.some((roleCode) => canAssignRoleCode(roleCode, targetRoleCode))) {
    throw new Error("You do not have permission to assign this role.");
  }
}

async function assertCanManageStaffAccount(admin: ReturnType<typeof createAdminClient>, staffId: string) {
  const actor = await requireActiveTenantActor();
  const { data: target, error } = await admin.from("staffs").select("id").eq("id", staffId).eq("company_id", actor.companyId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  if (!target) throw new Error("Target staff was not found in your company.");
  const targetRoleId = await getPrimaryStaffRoleId(admin, staffId);
  const targetRoleCode = await getRoleCodeById(admin, targetRoleId);
  if (!isSuperAdminRole(targetRoleCode)) return;
  const currentRoleCodes = await getCurrentStaffRoleCodes(admin);
  if (!currentRoleCodes.some(isSuperAdminRole)) {
    throw new Error("Super Admin / Owner accounts are protected and can only be managed by another owner.");
  }
}

async function countStaffHistory(admin: ReturnType<typeof createAdminClient>, staffId: string) {
  const checks = await Promise.all([
    admin.from("purchase_requests").select("id", { count: "exact", head: true }).or(`requested_by.eq.${staffId},created_by.eq.${staffId},updated_by.eq.${staffId}`),
    admin.from("purchase_orders").select("id", { count: "exact", head: true }).or(`created_by.eq.${staffId},updated_by.eq.${staffId}`),
    admin.from("goods_receivings").select("id", { count: "exact", head: true }).or(`received_by.eq.${staffId},posted_by.eq.${staffId},created_by.eq.${staffId},updated_by.eq.${staffId}`),
    admin.from("stock_transactions").select("id", { count: "exact", head: true }).eq("created_by", staffId),
    admin.from("document_comments").select("id", { count: "exact", head: true }).eq("created_by", staffId),
    admin.from("attachments").select("id", { count: "exact", head: true }).or(`uploaded_by.eq.${staffId},created_by.eq.${staffId}`),
    admin.from("activity_logs").select("id", { count: "exact", head: true }).or(`entity_id.eq.${staffId},created_by.eq.${staffId}`),
  ]);

  for (const check of checks) {
    if (check.error) throw new Error(check.error.message);
  }

  return checks.reduce((sum, check) => sum + (check.count ?? 0), 0);
}

async function inviteStaffByEmail(staffId: string, email: string) {
  const admin = createAdminClient();
  const actor = await requireActiveTenantActor();
  const normalized = email.trim().toLowerCase();
  const { data: staff, error: staffError } = await admin.from("staffs").select("auth_user_id").eq("id", staffId).eq("company_id", actor.companyId).single();
  if (staffError) throw new Error(staffError.message);
  const redirectTo = `${await getAppUrl()}/auth/callback?next=/set-password`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, { redirectTo });

  let authUserId = data.user?.id ?? null;
  let createdAuthUser = Boolean(authUserId);
  if (error) {
    const message = error.message.toLowerCase();
    if (!message.includes("already") && !message.includes("registered")) {
      throw new Error(error.message);
    }

    createdAuthUser = false;
    const users = await findAuthUsersByEmail(normalized);
    if (users.length !== 1) throw new Error(users.length ? "Multiple Auth accounts match this email. The sign-in link cannot be repaired automatically." : "The existing Auth account could not be matched exactly.");
    authUserId = users[0].id;
    if (!staff.auth_user_id) throw new Error("An Auth account already exists for this email. Use Repair sign-in link after exact-match validation.");
    if (staff.auth_user_id !== authUserId) throw new Error("This staff profile is linked to a different Auth account.");
  }

  const updates: { auth_user_id?: string; invite_email: string; invited_at: string; auth_setup_method: string; invitation_status: string } = {
    invite_email: normalized,
    invited_at: new Date().toISOString(),
    auth_setup_method: "email_invitation",
    invitation_status: "invited",
  };
  if (authUserId) updates.auth_user_id = authUserId;

  const { error: updateError } = await admin.from("staffs").update(updates).eq("id", staffId).eq("company_id", actor.companyId);
  if (updateError) {
    if (createdAuthUser && authUserId) await admin.auth.admin.deleteUser(authUserId).catch(console.error);
    throw new Error(updateError.message);
  }
}

function generateTemporaryPassword() {
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = `${lowercase}${uppercase}${digits}${symbols}`;
  const pick = (chars: string) => chars[randomInt(0, chars.length)];
  const chars = [pick(lowercase), pick(uppercase), pick(digits), pick(symbols)];
  while (chars.length < 14) chars.push(pick(all));
  return chars
    .map((char) => ({ char, sort: randomInt(0, 1000000) }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.char)
    .join("");
}

async function createOrResetStaffAuthAccount(input: {
  staffId: string;
  email: string;
  fullName: string;
  temporaryPassword?: string | null;
  resetExisting?: boolean;
}) {
  const admin = createAdminClient();
  const actor = await requireActiveTenantActor();
  const email = input.email.trim().toLowerCase();
  const temporaryPassword = input.temporaryPassword?.trim() || generateTemporaryPassword();
  const now = new Date().toISOString();
  const { data: staff, error: staffError } = await admin.from("staffs").select("auth_user_id").eq("id", input.staffId).eq("company_id", actor.companyId).single();
  if (staffError) throw new Error(staffError.message);

  let authUserId = staff.auth_user_id;
  let createdAuthUser = false;
  if (!authUserId) {
    const matches = await findAuthUsersByEmail(email);
    if (matches.length > 1) throw new Error("Multiple Auth accounts match this email. The sign-in link cannot be repaired automatically.");
    if (matches.length === 1) throw new Error("An Auth account already exists for this email. Use Repair sign-in link after exact-match validation.");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        staff_id: input.staffId,
        force_password_change: true,
      },
    });
    if (error) throw new Error(error.message);
    authUserId = data.user?.id ?? null;
    createdAuthUser = Boolean(authUserId);
  } else if (input.resetExisting) {
    const { data: linkedUser, error: linkedUserError } = await admin.auth.admin.getUserById(authUserId);
    if (linkedUserError) throw new Error(linkedUserError.message);
    if (linkedUser.user.email?.trim().toLowerCase() !== email) throw new Error("The linked Auth account email does not match this staff profile.");
    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      password: temporaryPassword,
      user_metadata: {
        full_name: input.fullName,
        staff_id: input.staffId,
        force_password_change: true,
      },
    });
    if (error) throw new Error(error.message);
  } else {
    throw new Error("An auth account already exists for this email. Link or reset password instead.");
  }

  if (!authUserId) throw new Error("Could not create the auth account for this staff member.");

  const { error: updateError } = await admin
    .from("staffs")
    .update({
      auth_user_id: authUserId,
      invite_email: email,
      status: "invited",
      auth_setup_method: "temporary_password",
      invitation_status: "password_required",
      must_change_password: true,
      temp_password_issued_at: now,
      invited_at: now,
    })
    .eq("id", input.staffId)
    .eq("company_id", actor.companyId);
  if (updateError) {
    if (createdAuthUser) await admin.auth.admin.deleteUser(authUserId).catch(console.error);
    throw new Error(updateError.message);
  }

  return temporaryPassword;
}

export async function createStaff(formData: FormData) {
  await requirePermissionOrRedirect("staffs.create", "/staffs/new");
  let createdStaffId: string | null = null;
  let temporaryPassword: string | null = null;
  try {
    const actor = await requireActiveTenantActor();
    const payload = staffPayload(formData, actor.companyId);
    const access = staffAccessPayload(formData);
    const authSetupMethod = String(formData.get("auth_setup_method") ?? "temporary_password");
    const enteredTemporaryPassword = cleanText(formData.get("temporary_password"));
    if (!isMockMode()) {
      const supabase = createAdminClient();
      if (!access.role_id || !access.default_branch_id) {
        throw new Error("Role and default branch are required before invite.");
      }
      await assertCanAssignStaffRole(supabase, access.role_id);
      const invitedBy = actor.staffId;
      const { data: existing, error: existingError } = await supabase
        .from("staffs")
        .select("id")
        .eq("company_id", payload.company_id)
        .ilike("email", payload.email)
        .is("deleted_at", null)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing) throw new Error("An active staff profile already uses this email. Open that staff profile instead of creating a duplicate.");

      const now = new Date().toISOString();
      const staffRecord = {
        ...payload,
        invite_email: payload.email,
        status: "invited" as const,
        invited_at: now,
        invited_by: invitedBy,
        auth_setup_method: authSetupMethod === "email_invitation" ? "email_invitation" : "temporary_password",
        invitation_status: authSetupMethod === "email_invitation" ? "invited" : "password_required",
        must_change_password: authSetupMethod !== "email_invitation",
        temp_password_issued_at: authSetupMethod !== "email_invitation" ? now : null,
      };

      const { data, error } = await supabase.from("staffs").insert(staffRecord).select("id").single();
      if (error) throw new Error(error.message);
      createdStaffId = data.id;
      await replaceStaffAccess(data.id, formData);
      if (authSetupMethod === "email_invitation") {
        await inviteStaffByEmail(data.id, payload.email);
      } else {
        temporaryPassword = await createOrResetStaffAuthAccount({
          staffId: data.id,
          email: payload.email,
          fullName: payload.full_name,
          temporaryPassword: enteredTemporaryPassword,
          resetExisting: false,
        });
      }
      await writeActivityLog({
        entityType: "staff",
        entityId: data.id,
        activityType: "created",
        message: authSetupMethod === "email_invitation" ? `Staff ${payload.full_name} invited` : `Staff ${payload.full_name} auth account created`,
      });
    }
  } catch (error) {
    rethrowRedirect(error);
    if (createdStaffId && !isMockMode()) {
      const actor = await requireActiveTenantActor();
      const admin = createAdminClient();
      const { data: createdStaff } = await admin.from("staffs").select("auth_user_id").eq("id", createdStaffId).eq("company_id", actor.companyId).maybeSingle();
      await admin.from("staffs").delete().eq("id", createdStaffId).eq("company_id", actor.companyId);
      if (createdStaff?.auth_user_id) await admin.auth.admin.deleteUser(createdStaff.auth_user_id).catch(console.error);
      createdStaffId = null;
    }
    safeRedirectWithMessage("/staffs/new", "error", formatActionError(error, "Could not create this staff member."));
  }
  revalidatePath("/staffs");
  if (createdStaffId && temporaryPassword) {
    await setTemporaryPasswordHandoff(createdStaffId, temporaryPassword);
    redirect(`/staffs/${createdStaffId}?success=${encodeURIComponent("Staff account created. Copy the temporary password now.")}`);
  }
  safeRedirectWithMessage("/staffs", "success", "Staff created.");
}

export async function updateStaff(id: string, formData: FormData) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    const payload = staffPayload(formData, actor.companyId);
    const access = staffAccessPayload(formData);
    if (!isMockMode()) {
      const supabase = createAdminClient();
      if (!access.role_id || !access.default_branch_id) {
        throw new Error("Role and default branch are required.");
      }
      await assertCanManageStaffAccount(supabase, id);
      await assertCanAssignStaffRole(supabase, access.role_id, id);
      await replaceStaffAccess(id, formData, payload);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: `Staff ${payload.full_name} updated` });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not update this staff member."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  revalidatePath("/", "layout");
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Staff updated.");
}

async function saveStaffPermissionOverrides(id: string, overrides: { permission_id: string; effect: "allow" | "deny" }[]) {
  await requirePermissionOrRedirect("roles.update", `/staffs/${id}`);
  try {
    await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await supabase.rpc("set_staff_permission_overrides", { target_staff_id: id, overrides });
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not update permission overrides."));
  }
  revalidatePath(`/staffs/${id}`);
  revalidatePath("/", "layout");
}

export async function updateStaffPermissionOverrides(id: string, formData: FormData) {
  const overrides: { permission_id: string; effect: "allow" | "deny" }[] = Array.from(formData.entries()).flatMap(([key, value]) => {
    if (!key.startsWith("permission:") || (value !== "allow" && value !== "deny")) return [];
    return [{ permission_id: key.slice("permission:".length), effect: value }];
  });
  await saveStaffPermissionOverrides(id, overrides);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Permission overrides updated.");
}

export async function resetStaffPermissionOverrides(id: string) {
  await saveStaffPermissionOverrides(id, []);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Permission overrides reset to role defaults.");
}

export async function resendStaffInvite(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanManageStaffAccount(supabase, id);
      const { data: staff, error } = await supabase.from("staffs").select("email, invite_email, full_name").eq("id", id).eq("company_id", actor.companyId).single();
      if (error) throw new Error(error.message);
      const email = (staff.invite_email ?? staff.email ?? "").trim().toLowerCase();
      if (!email) throw new Error("Staff email is required before sending an invite.");
      await inviteStaffByEmail(id, email);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: `Invite resent to ${staff.full_name}` });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not resend the invite."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Invite resent.");
}

export async function resetStaffTemporaryPassword(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  let temporaryPassword: string | null = null;
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanManageStaffAccount(supabase, id);
      const { data: staff, error } = await supabase
        .from("staffs")
        .select("id, email, invite_email, full_name, auth_user_id")
        .eq("id", id)
        .eq("company_id", actor.companyId)
        .single();
      if (error) throw new Error(error.message);
      const email = (staff.invite_email ?? staff.email ?? "").trim().toLowerCase();
      if (!email) throw new Error("Staff email is required before generating a temporary password.");
      temporaryPassword = await createOrResetStaffAuthAccount({
        staffId: id,
        email,
        fullName: staff.full_name,
        resetExisting: true,
      });
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "password_reset", message: "Owner reset temporary password for staff" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not reset the temporary password."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  if (temporaryPassword) {
    await setTemporaryPasswordHandoff(id, temporaryPassword);
    redirect(`/staffs/${id}?success=${encodeURIComponent("Temporary password generated. Copy it now.")}`);
  }
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Temporary password generated.");
}

export async function repairStaffSignInLink(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const admin = createAdminClient();
      const roleCodes = await getCurrentStaffRoleCodes(admin);
      if (!roleCodes.some(isSuperAdminRole)) throw new Error("Only the Super Admin / Owner can repair a staff sign-in link.");

      const { data: staff, error } = await admin
        .from("staffs")
        .select("email, invite_email, auth_user_id, status")
        .eq("id", id)
        .eq("company_id", actor.companyId)
        .is("deleted_at", null)
        .single();
      if (error) throw new Error(error.message);
      if (!["active", "invited"].includes(staff.status)) throw new Error("Only an active or invited staff profile can be repaired.");
      const email = staff.email?.trim().toLowerCase() ?? "";
      if (!email || (staff.invite_email && staff.invite_email.trim().toLowerCase() !== email)) {
        throw new Error("The staff profile email details do not match exactly.");
      }

      const authMatches = await findAuthUsersByEmail(email);
      if (authMatches.length !== 1) {
        throw new Error(authMatches.length ? "Multiple Auth accounts match this email. No link was changed." : "No Auth account matches this staff email. No link was changed.");
      }
      const supabase = await createClient();
      const { data: outcome, error: repairError } = await supabase.rpc("repair_staff_auth_link", {
        target_staff_id: id,
        target_auth_user_id: authMatches[0].id,
        normalized_email: email,
      });
      if (repairError) throw new Error(repairError.message);
      revalidatePath("/staffs");
      revalidatePath(`/staffs/${id}`);
      safeRedirectWithMessage(`/staffs/${id}`, "success", outcome === "setup_pending" ? "Sign-in link repaired. Staff setup is pending." : "Sign-in link repaired. Auth is linked.");
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not repair the sign-in link."));
  }
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Sign-in link repaired.");
}

export async function forceStaffPasswordChange(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanManageStaffAccount(supabase, id);
      const { error } = await supabase
        .from("staffs")
        .update({
          must_change_password: true,
          invitation_status: "password_required",
          auth_setup_method: "temporary_password",
          temp_password_issued_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", actor.companyId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "password_change_required", message: "Owner required staff password change" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not force password change."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Staff must change password at next login.");
}

export async function disableStaff(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanManageStaffAccount(supabase, id);
      const { error } = await (await createClient()).rpc("set_staff_status_atomic", { p_staff_id: id, p_status: "disabled" });
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: "Staff sign-in disabled" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not disable sign-in for this user."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Staff sign-in disabled.");
}

export async function enableStaff(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanManageStaffAccount(supabase, id);
      const { data: staff, error: staffError } = await supabase.from("staffs").select("accepted_at").eq("id", id).eq("company_id", actor.companyId).single();
      if (staffError) throw new Error(staffError.message);
      const { error } = await supabase.from("staffs").update({ status: staff.accepted_at ? "active" : "invited" }).eq("id", id).eq("company_id", actor.companyId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: "Staff enabled" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not enable this user."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "User enabled.");
}

export async function permanentlyDeleteStaff(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanManageStaffAccount(supabase, id);
      const { data: staff, error: staffError } = await supabase
        .from("staffs")
        .select("id, staff_code, email, invite_email, full_name, auth_user_id")
        .eq("id", id)
        .eq("company_id", actor.companyId)
        .single();
      if (staffError) throw new Error(staffError.message);
      const roleId = await getPrimaryStaffRoleId(supabase, id);
      const roleCode = await getRoleCodeById(supabase, roleId);
      if (isSuperAdminRole(roleCode)) {
        const ownerCount = await activeSuperAdminCount(supabase);
        if (ownerCount <= 1) throw new Error("Cannot permanently delete the last Super Admin / Owner.");
        throw new Error("Super Admin / Owner accounts are protected. Disable sign-in or remove owner access first.");
      }

      const historyCount = await countStaffHistory(supabase, id);
      if (historyCount > 0) {
        throw new Error("This staff has historical records and cannot be permanently deleted. Disable sign-in instead.");
      }

      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "deleted", message: `Permanent staff delete approved for ${staff.full_name}` });

      if (staff.auth_user_id) {
        const { error: authError } = await supabase.auth.admin.deleteUser(staff.auth_user_id);
        if (authError) throw new Error(authError.message);
      }

      const [{ error: roleError }, { error: branchError }] = await Promise.all([
        supabase.from("staff_roles").delete().eq("staff_id", id),
        supabase.from("staff_branches").delete().eq("staff_id", id),
      ]);
      if (roleError) throw new Error(roleError.message);
      if (branchError) throw new Error(branchError.message);

      const { error: deleteError } = await supabase.from("staffs").delete().eq("id", id).eq("company_id", actor.companyId);
      if (deleteError) throw new Error(deleteError.message);
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not permanently delete this staff member."));
  }
  revalidatePath("/staffs");
  safeRedirectWithMessage("/staffs", "success", "Staff permanently deleted.");
}

function rolePayload(formData: FormData, companyId: string) {
  return roleSchema.parse({
    company_id: companyId,
    role_code: formValue(formData, "role_code"),
    role_name: formValue(formData, "role_name"),
    description: cleanText(formValue(formData, "description")),
    status: formValue(formData, "status") ?? "active",
  });
}

export async function createRole(formData: FormData) {
  await requirePermission("roles.create");
  const actor = await requireActiveTenantActor();
  const payload = rolePayload(formData, actor.companyId);
  if (!isMockMode()) {
    if (isProtectedOwnerAssignableRole(payload.role_code)) throw new Error("Super Admin / Owner roles cannot be created here.");
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("roles").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "role", entityId: data.id, activityType: "created", message: `Role ${payload.role_name} created` });
  }
  revalidatePath("/roles");
  redirect("/roles");
}

export async function updateRole(id: string, formData: FormData) {
  await requirePermission("roles.update");
  const actor = await requireActiveTenantActor();
  const payload = rolePayload(formData, actor.companyId);
  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { data: currentRole, error: roleError } = await supabase.from("roles").select("role_code, company_id").eq("id", id).eq("company_id", actor.companyId).single();
    if (roleError) throw new Error(roleError.message);
    if (isProtectedOwnerAssignableRole(currentRole.role_code) || isProtectedOwnerAssignableRole(payload.role_code)) throw new Error("Super Admin / Owner roles cannot be changed here.");
    if (payload.role_code !== currentRole.role_code) throw new Error("Role codes cannot be changed after creation.");
    const { error } = await supabase.from("roles").update(payload).eq("id", id).eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "role", entityId: id, activityType: "updated", message: `Role ${payload.role_name} updated` });
  }
  revalidatePath("/roles");
  redirect("/roles");
}

export async function updateRolePermissions(id: string, formData: FormData) {
  await requirePermissionOrRedirect("roles.update", `/roles/${id}`);
  const permissionIds = Array.from(formData.getAll("permission_id")).map(String);
  try {
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await supabase.rpc("set_role_permissions", { target_role_id: id, permission_ids: permissionIds });
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/roles/${id}`, "error", formatActionError(error, "Could not update role permissions."));
  }
  revalidatePath("/roles");
  revalidatePath(`/roles/${id}`);
  revalidatePath("/", "layout");
  safeRedirectWithMessage(`/roles/${id}`, "success", "Role permissions updated.");
}

function documentSequencePayload(formData: FormData, companyId: string) {
  return documentSequenceSchema.parse({
    company_id: companyId,
    document_type: formValue(formData, "document_type"),
    prefix: formValue(formData, "prefix"),
    next_number: formValue(formData, "next_number") ?? 1,
    padding: 3,
    reset_frequency: "monthly",
    status: formValue(formData, "status") ?? "active",
  });
}

export async function createDocumentSequence(formData: FormData) {
  await requirePermission("document_sequences.create");
  const actor = await requireActiveTenantActor();
  const payload = documentSequencePayload(formData, actor.companyId);
  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("document_sequences").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "document_sequence", entityId: data.id, activityType: "created", message: `Document sequence ${payload.document_type} created` });
  }
  revalidatePath("/document-sequences");
  redirect("/document-sequences");
}

export async function updateDocumentSequence(id: string, formData: FormData) {
  await requirePermission("document_sequences.update");
  const actor = await requireActiveTenantActor();
  const payload = documentSequencePayload(formData, actor.companyId);
  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("document_sequences").update(payload).eq("id", id).eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "document_sequence", entityId: id, activityType: "updated", message: `Document sequence ${payload.document_type} updated` });
  }
  revalidatePath("/document-sequences");
  redirect("/document-sequences");
}

export async function deleteDocumentSequence(id: string) {
  await requirePermissionOrRedirect("document_sequences.update", "/document-sequences");
  try {
    const actor = await requireActiveTenantActor();
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("document_sequences").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id).eq("company_id", actor.companyId);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "document_sequence", entityId: id, activityType: "archived", message: "Document sequence archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/document-sequences", "error", formatActionError(error, "Could not archive this document sequence."));
  }
  revalidatePath("/document-sequences");
  safeRedirectWithMessage("/document-sequences", "success", "Document sequence archived.");
}
