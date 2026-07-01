"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, companySchema, documentSequenceSchema, locationSchema, roleSchema, staffAccessSchema, staffSchema } from "@/lib/validations/foundation";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";

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
  await requirePermission("branches.update");
  if (!isMockMode()) {
    const supabase = await createClient();
    const { error } = await supabase.from("branches").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "branch", entityId: id, activityType: "archived", message: "Branch archived" });
  }
  revalidatePath("/branches");
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
  await requirePermission("locations.update");
  if (!isMockMode()) {
    const supabase = await createClient();
    const { error } = await supabase.from("locations").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "location", entityId: id, activityType: "archived", message: "Location archived" });
  }
  revalidatePath("/locations");
}

function staffPayload(formData: FormData) {
  return staffSchema.parse({
    company_id: formValue(formData, "company_id"),
    staff_code: formValue(formData, "staff_code"),
    full_name: formValue(formData, "full_name"),
    email: formValue(formData, "email"),
    phone: formValue(formData, "phone"),
    default_branch_id: formValue(formData, "default_branch_id"),
    status: formValue(formData, "status") ?? "active",
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

export async function createStaff(formData: FormData) {
  await requirePermission("staffs.create");
  const payload = staffPayload(formData);
  if (!isMockMode()) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("staffs").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await replaceStaffAccess(data.id, formData);
    await writeActivityLog({ entityType: "staff", entityId: data.id, activityType: "created", message: `Staff ${payload.full_name} created` });
  }
  revalidatePath("/staffs");
  redirect("/staffs");
}

export async function updateStaff(id: string, formData: FormData) {
  await requirePermission("staffs.update");
  const payload = staffPayload(formData);
  if (!isMockMode()) {
    const supabase = await createClient();
    const { error } = await supabase.from("staffs").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await replaceStaffAccess(id, formData);
    await writeActivityLog({ entityType: "staff", entityId: id, activityType: "updated", message: `Staff ${payload.full_name} updated` });
  }
  revalidatePath("/staffs");
  redirect("/staffs");
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
  await requirePermission("document_sequences.update");
  if (!isMockMode()) {
    const supabase = await createClient();
    const { error } = await supabase.from("document_sequences").update({ deleted_at: new Date().toISOString(), status: "archived" }).eq("id", id);
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "document_sequence", entityId: id, activityType: "archived", message: "Document sequence archived" });
  }
  revalidatePath("/document-sequences");
}
