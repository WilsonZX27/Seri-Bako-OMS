"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { getAppUrl } from "@/lib/site-url";
import { canAssignRoleCode, isProtectedOwnerAssignableRole, isSuperAdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, companySchema, documentSequenceSchema, locationSchema, roleSchema, staffAccessSchema, staffSchema } from "@/lib/validations/foundation";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { ensureBranchDefaultLocation, resolveDefaultLocation } from "@/server/inventory/locations";

function formValue(formData: FormData, key: string) {
  return formData.get(key);
}

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

export async function updateCompany(id: string, formData: FormData) {
  await requirePermission("company.update");
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
    const { error } = await supabase.from("companies").update(parsed).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "company", entityId: id, activityType: "updated", message: "Company profile updated" });
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
        .eq("id", id)
        .single();
      if (companyError) throw new Error(companyError.message);

      const path = `${id}/logo.${extension}`;
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
        .eq("id", id);
      if (updateError) throw new Error(updateError.message);
      await writeActivityLog({ entityType: "company", entityId: id, activityType: "updated", message: "Company logo updated" });
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
  await requirePermissionOrRedirect("company.update", "/company");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("logo_path")
        .eq("id", id)
        .single();
      if (companyError) throw new Error(companyError.message);

      if (company?.logo_path) {
        const { error: removeError } = await supabase.storage.from("company-assets").remove([company.logo_path]);
        if (removeError) throw new Error(removeError.message);
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update({ logo_path: null, logo_url: null })
        .eq("id", id);
      if (updateError) throw new Error(updateError.message);
      await writeActivityLog({ entityType: "company", entityId: id, activityType: "updated", message: "Company logo removed" });
    }
  } catch (error) {
    rethrowRedirect(error);
    logoError(formatActionError(error, "Could not remove the company logo."));
  }

  revalidatePath("/company");
  revalidatePath("/", "layout");
  safeRedirectWithMessage("/company", "success", "Company logo removed.");
}

function branchPayload(formData: FormData) {
  return branchSchema.parse({
    company_id: formValue(formData, "company_id"),
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
    const payload = branchPayload(formData);
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: archivedMatch, error: archivedError } = await supabase
        .from("branches")
        .select("id")
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
      await ensureBranchDefaultLocation(data.id);
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
  const payload = branchPayload(formData);

  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("branches").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "branch", entityId: id, activityType: "updated", message: `Branch ${payload.branch_name} updated` });
  }

  revalidatePath("/branches");
  redirect("/branches");
}

export async function deleteBranch(id: string) {
  await requirePermissionOrRedirect("branches.update", "/branches");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("branches").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
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
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("branches").update({ deleted_at: null, status: "active" }).eq("id", id);
      if (error) throw new Error(error.message);
      await ensureBranchDefaultLocation(id);
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

function locationPayload(formData: FormData) {
  return locationSchema.parse({
    company_id: formValue(formData, "company_id"),
    branch_id: formValue(formData, "branch_id"),
    location_code: formValue(formData, "location_code"),
    location_name: formValue(formData, "location_name"),
    location_type: formValue(formData, "location_type") ?? "dry_store",
    status: formValue(formData, "status") ?? "active",
  });
}

export async function createLocation(formData: FormData) {
  await requirePermissionOrRedirect("locations.create", "/locations/new");
  try {
    const payload = locationPayload(formData);
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: archivedMatch, error: archivedError } = await supabase
        .from("locations")
        .select("id")
        .eq("branch_id", payload.branch_id)
        .or(`location_code.eq.${payload.location_code},location_name.eq.${payload.location_name}`)
        .not("deleted_at", "is", null)
        .limit(1)
        .maybeSingle();
      if (archivedError) throw new Error(archivedError.message);
      if (archivedMatch) {
        safeRedirectWithMessage(`/locations/${archivedMatch.id}`, "error", "An archived location with the same code or name already exists. Restore it instead of creating a duplicate.");
      }
      const { data, error } = await supabase.from("locations").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "location", entityId: data.id, activityType: "created", message: `Location ${payload.location_name} created` });
    }
    revalidatePath("/locations");
    redirect("/locations");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/locations/new", "error", formatActionError(error, "Could not create this location."));
  }
}

export async function updateLocation(id: string, formData: FormData) {
  await requirePermission("locations.update");
  const payload = locationPayload(formData);
  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("locations").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "location", entityId: id, activityType: "updated", message: `Location ${payload.location_name} updated` });
  }
  revalidatePath("/locations");
  redirect("/locations");
}

export async function deleteLocation(id: string) {
  await requirePermissionOrRedirect("locations.update", "/locations");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: defaultBranch, error: defaultBranchError } = await supabase.from("branches").select("id").eq("default_location_id", id).limit(1).maybeSingle();
      if (defaultBranchError) throw new Error(defaultBranchError.message);
      if (defaultBranch) safeRedirectWithMessage(`/locations/${id}`, "error", "This system-default location cannot be archived while it is assigned to a branch.");
      const { error } = await supabase.from("locations").update({ deleted_at: new Date().toISOString(), status: "inactive" }).eq("id", id);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "location", entityId: id, activityType: "archived", message: "Location archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/locations", "error", formatActionError(error, "Could not archive this location."));
  }
  revalidatePath("/locations");
  safeRedirectWithMessage("/locations", "success", "Location archived.");
}

export async function restoreLocation(id: string) {
  await requirePermissionOrRedirect("locations.update", `/locations/${id}`);
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("locations").update({ deleted_at: null, status: "active" }).eq("id", id);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "location", entityId: id, activityType: "restored", message: "Location restored" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/locations/${id}`, "error", formatActionError(error, "Could not restore this location."));
  }
  revalidatePath("/locations");
  revalidatePath(`/locations/${id}`);
  safeRedirectWithMessage(`/locations/${id}`, "success", "Location restored.");
}

export async function fixMissingDefaultLocations() {
  await requirePermissionOrRedirect("locations.update", "/data-onboarding");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: branches, error } = await supabase.from("branches").select("id").is("deleted_at", null);
      if (error) throw new Error(error.message);
      for (const branch of branches ?? []) {
        await ensureBranchDefaultLocation(branch.id);
      }
      await writeActivityLog({ entityType: "location", entityId: "00000000-0000-0000-0000-000000000000", activityType: "updated", message: "Missing default stock areas fixed" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/data-onboarding", "error", formatActionError(error, "Could not fix missing internal stock areas."));
  }
  revalidatePath("/data-onboarding");
  revalidatePath("/locations");
  safeRedirectWithMessage("/data-onboarding", "success", "Missing internal stock areas fixed.");
}

export async function archiveDuplicateLocation(id: string) {
  await requirePermissionOrRedirect("locations.update", "/locations");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: location, error: locationError } = await supabase
        .from("locations")
        .select("id, branch_id")
        .eq("id", id)
        .single();
      if (locationError) throw new Error(locationError.message);
      if (!location.branch_id) throw new Error("This location is not linked to a branch.");

      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .select("default_location_id")
        .eq("id", location.branch_id)
        .maybeSingle();
      if (branchError) throw new Error(branchError.message);
      if (branch?.default_location_id === id) throw new Error("This location is the current default stock area and cannot be archived.");

      const { count: stockHistoryCount, error: stockHistoryError } = await supabase
        .from("stock_transactions")
        .select("id", { count: "exact", head: true })
        .eq("location_id", id);
      if (stockHistoryError) throw new Error(stockHistoryError.message);
      if ((stockHistoryCount ?? 0) > 0) {
        throw new Error("This duplicate location already has stock history. Leave it in place and review it manually.");
      }

      const { error } = await supabase.from("locations").update({ deleted_at: new Date().toISOString(), status: "inactive" }).eq("id", id);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "location", entityId: id, activityType: "archived", message: "Duplicate location archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/locations", "error", formatActionError(error, "Could not archive this duplicate location."));
  }
  revalidatePath("/locations");
  safeRedirectWithMessage("/locations", "success", "Duplicate location archived.");
}

export async function cleanDuplicateLocations() {
  await requirePermissionOrRedirect("locations.update", "/locations");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const [{ data: locations, error: locationsError }, { data: branches, error: branchesError }] = await Promise.all([
        supabase
          .from("locations")
          .select("id, branch_id, location_name, deleted_at")
          .is("deleted_at", null),
        supabase
          .from("branches")
          .select("id, branch_name, default_location_id")
          .is("deleted_at", null),
      ]);
      if (locationsError) throw new Error(locationsError.message);
      if (branchesError) throw new Error(branchesError.message);

      const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch]));
      const duplicateCandidates = (locations ?? []).filter((location) => {
        const branch = location.branch_id ? branchById.get(location.branch_id) ?? null : null;
        return Boolean(branch && branch.default_location_id !== location.id && branch.branch_name.trim().toLowerCase() === location.location_name.trim().toLowerCase());
      });

      let archivedCount = 0;
      let skippedCount = 0;

      for (const location of duplicateCandidates) {
        const { count, error } = await supabase
          .from("stock_transactions")
          .select("id", { count: "exact", head: true })
          .eq("location_id", location.id);
        if (error) throw new Error(error.message);

        if ((count ?? 0) > 0) {
          skippedCount += 1;
          continue;
        }

        const { error: archiveError } = await supabase
          .from("locations")
          .update({ deleted_at: new Date().toISOString(), status: "inactive" })
          .eq("id", location.id);
        if (archiveError) throw new Error(archiveError.message);
        archivedCount += 1;
      }

      await writeActivityLog({
        entityType: "location",
        entityId: "00000000-0000-0000-0000-000000000000",
        activityType: "updated",
        message: `Duplicate internal locations cleaned. Archived ${archivedCount}, skipped ${skippedCount}.`,
      });

      revalidatePath("/locations");
      revalidatePath("/data-onboarding");
      safeRedirectWithMessage("/locations", "success", `Cleaned duplicate internal locations. Archived ${archivedCount}, skipped ${skippedCount}.`);
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/locations", "error", formatActionError(error, "Could not clean duplicate internal locations."));
  }

  revalidatePath("/locations");
  safeRedirectWithMessage("/locations", "success", "Duplicate internal locations reviewed.");
}

function staffPayload(formData: FormData) {
  return staffSchema.parse({
    company_id: formValue(formData, "company_id"),
    staff_code: formValue(formData, "staff_code"),
    full_name: formValue(formData, "full_name"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone"),
    default_branch_id: formValue(formData, "branch_id"),
    status: formValue(formData, "status") ?? "invited",
  });
}

function staffAccessPayload(formData: FormData) {
  return staffAccessSchema.parse({
    role_id: formValue(formData, "role_id"),
    role_branch_id: formValue(formData, "role_branch_id"),
    effective_from: formValue(formData, "effective_from") || new Date().toISOString().slice(0, 10),
    effective_to: formValue(formData, "effective_to"),
    branch_id: formValue(formData, "branch_id"),
    access_level: formValue(formData, "access_level") ?? "read_only",
    location_ids: [],
  });
}

async function replaceStaffAccess(staffId: string, formData: FormData) {
  const access = staffAccessPayload(formData);
  const supabase = createAdminClient();

  const [{ error: deleteRolesError }, { error: deleteBranchesError }, { error: deleteLocationsError }] = await Promise.all([
    supabase.from("staff_roles").delete().eq("staff_id", staffId),
    supabase.from("staff_branches").delete().eq("staff_id", staffId),
    supabase.from("staff_locations").delete().eq("staff_id", staffId),
  ]);
  if (deleteRolesError) throw new Error(deleteRolesError.message);
  if (deleteBranchesError) throw new Error(deleteBranchesError.message);
  if (deleteLocationsError) throw new Error(deleteLocationsError.message);

  const { error: roleError } = await supabase.from("staff_roles").insert({
    staff_id: staffId,
    role_id: access.role_id,
    branch_id: access.role_branch_id,
    is_primary: true,
    effective_from: access.effective_from,
    effective_to: access.effective_to,
  });
  if (roleError) throw new Error(roleError.message);

  const { error: branchError } = await supabase.from("staff_branches").insert({
    staff_id: staffId,
    branch_id: access.branch_id,
    access_level: access.access_level,
    is_default: true,
  });
  if (branchError) throw new Error(branchError.message);

  const defaultLocationId = await resolveDefaultLocation(access.branch_id);
  const { error: locationError } = await supabase.from("staff_locations").insert([{ staff_id: staffId, location_id: defaultLocationId }]);
  if (locationError) throw new Error(locationError.message);
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
  const { data, error } = await admin.from("roles").select("role_code").eq("id", roleId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role_code ?? null;
}

async function getPrimaryStaffRoleId(admin: ReturnType<typeof createAdminClient>, staffId: string) {
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
  const { data: roles, error: rolesError } = await admin.from("roles").select("id").in("role_code", ["super_admin", "admin"]).eq("status", "active").is("deleted_at", null);
  if (rolesError) throw new Error(rolesError.message);
  const roleIds = (roles ?? []).map((role) => role.id);
  if (!roleIds.length) return 0;

  const { data: assignments, error: assignmentError } = await admin.from("staff_roles").select("staff_id, effective_from, effective_to").in("role_id", roleIds);
  if (assignmentError) throw new Error(assignmentError.message);
  const today = new Date().toISOString().slice(0, 10);
  const staffIds = Array.from(new Set((assignments ?? []).filter((row) => (!row.effective_from || row.effective_from <= today) && (!row.effective_to || row.effective_to >= today)).map((row) => row.staff_id).filter(Boolean)));
  if (!staffIds.length) return 0;

  const { data: staffs, error: staffError } = await admin.from("staffs").select("id, status, deleted_at").in("id", staffIds);
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
      throw new Error("Only Super Admin / Owner can change protected administrator roles.");
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

async function assertCanDeactivateStaff(admin: ReturnType<typeof createAdminClient>, staffId: string) {
  const roleId = await getPrimaryStaffRoleId(admin, staffId);
  const roleCode = await getRoleCodeById(admin, roleId);
  if (!isSuperAdminRole(roleCode)) return;

  const currentStaffId = await getCurrentStaffId();
  const ownerCount = await activeSuperAdminCount(admin);
  if (currentStaffId === staffId && ownerCount <= 1) {
    throw new Error("You cannot deactivate your own Super Admin / Owner account while you are the only owner.");
  }
  if (ownerCount <= 1) {
    throw new Error("Cannot deactivate the last Super Admin / Owner.");
  }
}

function isWilsonOwnerStaff(staff: { staff_code?: string | null; email?: string | null; invite_email?: string | null }) {
  return (
    staff.staff_code === "SUPER-ADMIN"
    || staff.email?.toLowerCase() === "wilson@seribako.com.my"
    || staff.invite_email?.toLowerCase() === "wilson@seribako.com.my"
  );
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
  const redirectTo = `${await getAppUrl()}/auth/callback?next=/set-password`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });

  let authUserId = data.user?.id ?? null;
  if (error) {
    const message = error.message.toLowerCase();
    if (!message.includes("already") && !message.includes("registered")) {
      throw new Error(error.message);
    }

    const { data: users } = await admin.auth.admin.listUsers();
    authUserId = users.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
  }

  const updates: { auth_user_id?: string; invite_email: string; invited_at: string; auth_setup_method: string; invitation_status: string } = {
    invite_email: email,
    invited_at: new Date().toISOString(),
    auth_setup_method: "email_invitation",
    invitation_status: "invited",
  };
  if (authUserId) updates.auth_user_id = authUserId;

  const { error: updateError } = await admin.from("staffs").update(updates).eq("id", staffId);
  if (updateError) throw new Error(updateError.message);
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

async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  return data.users.find((user) => user.email?.toLowerCase() === normalized)?.id ?? null;
}

async function createOrResetStaffAuthAccount(input: {
  staffId: string;
  email: string;
  fullName: string;
  temporaryPassword?: string | null;
  resetExisting?: boolean;
}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const temporaryPassword = input.temporaryPassword?.trim() || generateTemporaryPassword();
  const now = new Date().toISOString();

  let authUserId = await findAuthUserIdByEmail(email);
  if (!authUserId) {
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
  } else if (input.resetExisting) {
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
    .eq("id", input.staffId);
  if (updateError) throw new Error(updateError.message);

  return temporaryPassword;
}

export async function createStaff(formData: FormData) {
  await requirePermissionOrRedirect("staffs.create", "/staffs/new");
  let createdStaffId: string | null = null;
  let temporaryPassword: string | null = null;
  try {
    const payload = staffPayload(formData);
    const access = staffAccessPayload(formData);
    const authSetupMethod = String(formData.get("auth_setup_method") ?? "temporary_password");
    const enteredTemporaryPassword = cleanText(formData.get("temporary_password"));
    if (!isMockMode()) {
      const supabase = createAdminClient();
      if (!access.role_id || !access.branch_id) {
        throw new Error("Role and default branch are required before invite.");
      }
      await assertCanAssignStaffRole(supabase, access.role_id);
      const invitedBy = await getCurrentStaffId();
      const { data: existing, error: existingError } = await supabase
        .from("staffs")
        .select("id, accepted_at")
        .eq("company_id", payload.company_id)
        .eq("email", payload.email)
        .is("deleted_at", null)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);

      const now = new Date().toISOString();
      const staffRecord = {
        ...payload,
        invite_email: payload.email,
        status: existing?.accepted_at ? payload.status : "invited",
        invited_at: now,
        invited_by: invitedBy,
        auth_setup_method: authSetupMethod === "email_invitation" ? "email_invitation" : "temporary_password",
        invitation_status: authSetupMethod === "email_invitation" ? "invited" : "password_required",
        must_change_password: authSetupMethod !== "email_invitation",
        temp_password_issued_at: authSetupMethod !== "email_invitation" ? now : null,
      };

      const { data, error } = existing
        ? await supabase.from("staffs").update(staffRecord).eq("id", existing.id).select("id").single()
        : await supabase.from("staffs").insert(staffRecord).select("id").single();
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
        activityType: existing ? "updated" : "created",
        message: authSetupMethod === "email_invitation" ? `Staff ${payload.full_name} invited` : `Staff ${payload.full_name} auth account created`,
      });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/staffs/new", "error", formatActionError(error, "Could not create this staff member."));
  }
  revalidatePath("/staffs");
  if (createdStaffId && temporaryPassword) {
    redirect(`/staffs/${createdStaffId}?success=${encodeURIComponent("Staff account created. Copy the temporary password now.")}&temp_password=${encodeURIComponent(temporaryPassword)}`);
  }
  safeRedirectWithMessage("/staffs", "success", "Staff created.");
}

export async function updateStaff(id: string, formData: FormData) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const payload = staffPayload(formData);
    const access = staffAccessPayload(formData);
    if (!isMockMode()) {
      const supabase = createAdminClient();
      if (!access.role_id || !access.branch_id) {
        throw new Error("Role and default branch are required.");
      }
      await assertCanAssignStaffRole(supabase, access.role_id, id);
      const { error } = await supabase.from("staffs").update({ ...payload, invite_email: payload.email }).eq("id", id);
      if (error) throw new Error(error.message);
      await replaceStaffAccess(id, formData);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: `Staff ${payload.full_name} updated` });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not update this staff member."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Staff updated.");
}

async function saveStaffPermissionOverrides(id: string, overrides: { permission_id: string; effect: "allow" | "deny" }[]) {
  await requirePermissionOrRedirect("roles.update", `/staffs/${id}`);
  try {
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
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: staff, error } = await supabase.from("staffs").select("email, invite_email, full_name").eq("id", id).single();
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
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: staff, error } = await supabase
        .from("staffs")
        .select("id, email, invite_email, full_name, auth_user_id")
        .eq("id", id)
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
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "password_reset", message: "Admin reset temporary password for staff" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not reset the temporary password."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  if (temporaryPassword) {
    redirect(`/staffs/${id}?success=${encodeURIComponent("Temporary password generated. Copy it now.")}&temp_password=${encodeURIComponent(temporaryPassword)}`);
  }
  safeRedirectWithMessage(`/staffs/${id}`, "success", "Temporary password generated.");
}

export async function forceStaffPasswordChange(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("staffs")
        .update({
          must_change_password: true,
          invitation_status: "password_required",
          auth_setup_method: "temporary_password",
          temp_password_issued_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "password_change_required", message: "Admin required staff password change" });
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
    if (!isMockMode()) {
      const supabase = createAdminClient();
      await assertCanDeactivateStaff(supabase, id);
      const { data: staff, error: staffError } = await supabase.from("staffs").select("staff_code, email, invite_email").eq("id", id).single();
      if (staffError) throw new Error(staffError.message);
      if (isWilsonOwnerStaff(staff)) throw new Error("Wilson Super Admin / Owner cannot be disabled.");
      const { error } = await supabase.from("staffs").update({ status: "disabled" }).eq("id", id);
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
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: staff, error: staffError } = await supabase.from("staffs").select("accepted_at").eq("id", id).single();
      if (staffError) throw new Error(staffError.message);
      const { error } = await supabase.from("staffs").update({ status: staff.accepted_at ? "active" : "invited" }).eq("id", id);
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
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { data: staff, error: staffError } = await supabase
        .from("staffs")
        .select("id, staff_code, email, invite_email, full_name, auth_user_id")
        .eq("id", id)
        .single();
      if (staffError) throw new Error(staffError.message);
      if (isWilsonOwnerStaff(staff)) throw new Error("Wilson Super Admin / Owner cannot be permanently deleted.");

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

      const [{ error: roleError }, { error: branchError }, { error: locationError }] = await Promise.all([
        supabase.from("staff_roles").delete().eq("staff_id", id),
        supabase.from("staff_branches").delete().eq("staff_id", id),
        supabase.from("staff_locations").delete().eq("staff_id", id),
      ]);
      if (roleError) throw new Error(roleError.message);
      if (branchError) throw new Error(branchError.message);
      if (locationError) throw new Error(locationError.message);

      const { error: deleteError } = await supabase.from("staffs").delete().eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not permanently delete this staff member."));
  }
  revalidatePath("/staffs");
  safeRedirectWithMessage("/staffs", "success", "Staff permanently deleted.");
}

function rolePayload(formData: FormData) {
  return roleSchema.parse({
    company_id: formValue(formData, "company_id"),
    role_code: formValue(formData, "role_code"),
    role_name: formValue(formData, "role_name"),
    description: cleanText(formValue(formData, "description")),
    status: formValue(formData, "status") ?? "active",
  });
}

export async function createRole(formData: FormData) {
  await requirePermission("roles.create");
  const payload = rolePayload(formData);
  if (!isMockMode()) {
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
  const payload = rolePayload(formData);
  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("roles").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "role", entityId: id, activityType: "updated", message: `Role ${payload.role_name} updated` });
  }
  revalidatePath("/roles");
  redirect("/roles");
}

function documentSequencePayload(formData: FormData) {
  return documentSequenceSchema.parse({
    company_id: formValue(formData, "company_id"),
    document_type: formValue(formData, "document_type"),
    prefix: formValue(formData, "prefix"),
    next_number: formValue(formData, "next_number") ?? 1,
    padding: formValue(formData, "padding") ?? 5,
    reset_frequency: formValue(formData, "reset_frequency") ?? "yearly",
    status: formValue(formData, "status") ?? "active",
  });
}

export async function createDocumentSequence(formData: FormData) {
  await requirePermission("document_sequences.create");
  const payload = documentSequencePayload(formData);
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
  const payload = documentSequencePayload(formData);
  if (!isMockMode()) {
    const supabase = createAdminClient();
    const { error } = await supabase.from("document_sequences").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "document_sequence", entityId: id, activityType: "updated", message: `Document sequence ${payload.document_type} updated` });
  }
  revalidatePath("/document-sequences");
  redirect("/document-sequences");
}

export async function deleteDocumentSequence(id: string) {
  await requirePermissionOrRedirect("document_sequences.update", "/document-sequences");
  try {
    if (!isMockMode()) {
      const supabase = createAdminClient();
      const { error } = await supabase.from("document_sequences").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
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
