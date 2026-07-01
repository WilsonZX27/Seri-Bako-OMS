"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, companySchema, documentSequenceSchema, locationSchema, roleSchema, staffAccessSchema, staffSchema } from "@/lib/validations/foundation";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";

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
    const supabase = await createClient();
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
      const supabase = await createClient();
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
      const supabase = await createClient();
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
  await requirePermission("branches.create");
  const payload = branchPayload(formData);

  if (!isMockMode()) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("branches").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "branch", entityId: data.id, activityType: "created", message: `Branch ${payload.branch_name} created` });
  }

  revalidatePath("/branches");
  redirect("/branches");
}

export async function updateBranch(id: string, formData: FormData) {
  await requirePermission("branches.update");
  const payload = branchPayload(formData);

  if (!isMockMode()) {
    const supabase = await createClient();
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
      const supabase = await createClient();
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
  await requirePermission("locations.create");
  const payload = locationPayload(formData);
  if (!isMockMode()) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("locations").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "location", entityId: data.id, activityType: "created", message: `Location ${payload.location_name} created` });
  }
  revalidatePath("/locations");
  redirect("/locations");
}

export async function updateLocation(id: string, formData: FormData) {
  await requirePermission("locations.update");
  const payload = locationPayload(formData);
  if (!isMockMode()) {
    const supabase = await createClient();
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
      const supabase = await createClient();
      const { error } = await supabase.from("locations").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
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
    location_ids: formData.getAll("location_ids").map(String),
  });
}

async function replaceStaffAccess(staffId: string, formData: FormData) {
  const access = staffAccessPayload(formData);
  const supabase = await createClient();

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

  if (access.location_ids.length) {
    const { error: locationError } = await supabase.from("staff_locations").insert(access.location_ids.map((locationId) => ({ staff_id: staffId, location_id: locationId })));
    if (locationError) throw new Error(locationError.message);
  }
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

async function getSiteUrl() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

async function inviteStaffByEmail(staffId: string, email: string) {
  const admin = createAdminClient();
  const redirectTo = `${await getSiteUrl()}/auth/callback?next=/set-password`;
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

  const updates: { auth_user_id?: string; invite_email: string; invited_at: string } = {
    invite_email: email,
    invited_at: new Date().toISOString(),
  };
  if (authUserId) updates.auth_user_id = authUserId;

  const { error: updateError } = await admin.from("staffs").update(updates).eq("id", staffId);
  if (updateError) throw new Error(updateError.message);
}

export async function createStaff(formData: FormData) {
  await requirePermissionOrRedirect("staffs.create", "/staffs/new");
  try {
    const payload = staffPayload(formData);
    const access = staffAccessPayload(formData);
    if (!isMockMode()) {
      const supabase = await createClient();
      if (!access.role_id || !access.branch_id) {
        throw new Error("Role and default branch are required before invite.");
      }
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
      };

      const { data, error } = existing
        ? await supabase.from("staffs").update(staffRecord).eq("id", existing.id).select("id").single()
        : await supabase.from("staffs").insert(staffRecord).select("id").single();
      if (error) throw new Error(error.message);
      await replaceStaffAccess(data.id, formData);
      await inviteStaffByEmail(data.id, payload.email);
      await writeActivityLog({ entityType: "staff", entityId: data.id, activityType: existing ? "updated" : "created", message: `Staff ${payload.full_name} invited` });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/staffs/new", "error", formatActionError(error, "Could not create and invite this staff member."));
  }
  revalidatePath("/staffs");
  safeRedirectWithMessage("/staffs", "success", "Staff invitation sent.");
}

export async function updateStaff(id: string, formData: FormData) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    const payload = staffPayload(formData);
    const access = staffAccessPayload(formData);
    if (!isMockMode()) {
      const supabase = await createClient();
      if (!access.role_id || !access.branch_id) {
        throw new Error("Role and default branch are required.");
      }
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

export async function resendStaffInvite(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    if (!isMockMode()) {
      const supabase = await createClient();
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

export async function disableStaff(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await supabase.from("staffs").update({ status: "disabled" }).eq("id", id);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: "Staff disabled" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/staffs/${id}`, "error", formatActionError(error, "Could not disable this user."));
  }
  revalidatePath("/staffs");
  revalidatePath(`/staffs/${id}`);
  safeRedirectWithMessage(`/staffs/${id}`, "success", "User disabled.");
}

export async function enableStaff(id: string) {
  await requirePermissionOrRedirect("staffs.update", `/staffs/${id}`);
  try {
    if (!isMockMode()) {
      const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
    const supabase = await createClient();
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
      const supabase = await createClient();
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
