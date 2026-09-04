"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { logServerError } from "@/server/observability/logger";

const emptyUuid = z.literal("").transform(() => null);
const optionalUuid = z.union([z.string().uuid(), emptyUuid]);
const schema = z.object({
  compliance_type_id: z.string().uuid(), subject_kind: z.enum(["outlet", "staff", "asset"]),
  branch_id: optionalUuid, staff_id: optionalUuid, asset_external_ref: z.string().trim().max(120).optional(),
  subject_label: z.string().trim().min(2).max(160), reference_no: z.string().trim().max(120).optional(),
  issued_on: z.string().optional(), expires_on: z.string().optional(), responsible_staff_id: optionalUuid,
  notes: z.string().trim().max(1000).optional(), submit_for_review: z.string().optional(),
}).superRefine((value, context) => {
  if (value.subject_kind !== "outlet") return;
  if (!value.issued_on) context.addIssue({ code: "custom", path: ["issued_on"], message: "Issued or inspection date is required." });
  if (!value.expires_on) context.addIssue({ code: "custom", path: ["expires_on"], message: "Expiry or next inspection date is required." });
  if (value.issued_on && value.expires_on && value.expires_on < value.issued_on) context.addIssue({ code: "custom", path: ["expires_on"], message: "Expiry must be on or after the issue date." });
});

function complianceMessageUrl(path: string, kind: "error" | "success", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${kind}=${encodeURIComponent(message)}`;
}

export async function createComplianceRecord(formData: FormData) {
  const requestedKind = formData.get("subject_kind");
  await requirePermission(requestedKind === "outlet" ? "outlet_compliance.upload" : requestedKind === "staff" ? "people.compliance.manage" : "compliance.manage");
  const actor = await requireActiveTenantActor();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const staffId = String(formData.get("staff_id") ?? "");
  const branchId = String(formData.get("branch_id") ?? "");
  const returnPath = requestedKind === "staff" && z.string().uuid().safeParse(staffId).success
    ? `/people/${staffId}?section=compliance`
    : requestedKind === "outlet" && z.string().uuid().safeParse(branchId).success ? `/outlet-compliance/${branchId}` : "/outlet-compliance";
  if (!parsed.success) redirect(complianceMessageUrl(returnPath, "error", "Check the required record fields."));
  const value = parsed.data;
  if ((value.subject_kind === "outlet" && !value.branch_id) || (value.subject_kind === "staff" && !value.staff_id) || (value.subject_kind === "asset" && !value.asset_external_ref)) redirect(complianceMessageUrl(returnPath, "error", "Choose the matching subject."));
  const supabase = await createClient();
  const recordId = crypto.randomUUID();
  const fileValue = formData.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const attachmentLabel = z.string().trim().min(3).max(180).safeParse(formData.get("file_name"));
  if (value.subject_kind === "outlet" && (!file || !attachmentLabel.success)) redirect(complianceMessageUrl(returnPath, "error", "Name and choose the first attachment."));
  let attachmentId: string | null = null;
  let storagePath: string | null = null;
  if (file) {
    if (file.size > 4 * 1024 * 1024) redirect(complianceMessageUrl(returnPath, "error", `This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Compliance files must be 4 MB or smaller.`));
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(file.type)) redirect(complianceMessageUrl(returnPath, "error", "Use a PDF, PNG, JPEG, or WebP document."));
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const starts = (...expected: number[]) => expected.every((byte, index) => bytes[index] === byte);
    const signatureValid = file.type === "application/pdf" ? starts(37,80,68,70,45) : file.type === "image/png" ? starts(137,80,78,71,13,10,26,10) : file.type === "image/jpeg" ? starts(255,216,255) : bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
    if (!signatureValid) redirect(complianceMessageUrl(returnPath, "error", "Document content does not match its file type."));
    const { data: type } = await supabase.from("compliance_types").select("is_sensitive").eq("id", value.compliance_type_id).single();
    if (type?.is_sensitive) await requirePermission(value.subject_kind === "staff" ? "people.compliance.document.read" : "compliance.sensitive.read");
    attachmentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "compliance-file";
    storagePath = `${actor.companyId}/compliance/${recordId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("document-attachments").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) {
      logServerError(uploadError, { source: "action.compliance.firstAttachment.storage", operationId: recordId });
      redirect(complianceMessageUrl(returnPath, "error", "File storage could not accept this upload. Retry in a moment."));
    }
    const { error: attachmentError } = await supabase.from("attachments").insert({ id: attachmentId, company_id: actor.companyId, entity_type: "compliance_record", entity_id: recordId, file_name: (attachmentLabel.success ? attachmentLabel.data : file.name).slice(0,180), file_type: file.type, file_size: file.size, storage_path: storagePath, file_url: null, uploaded_by: actor.staffId, created_by: actor.staffId, updated_by: actor.staffId });
    if (attachmentError) {
      await supabase.storage.from("document-attachments").remove([storagePath]);
      logServerError(attachmentError, { source: "action.compliance.firstAttachment.record", operationId: recordId });
      redirect(complianceMessageUrl(returnPath, "error", "The file could not be linked. Nothing was retained; ask an Owner to verify migration 258."));
    }
  }
  const { data, error } = await supabase.from("compliance_records").insert({
    id: recordId, company_id: actor.companyId, compliance_type_id: value.compliance_type_id, subject_kind: value.subject_kind,
    branch_id: value.branch_id, staff_id: value.staff_id, asset_external_ref: value.asset_external_ref || null,
    subject_label: value.subject_label, reference_no: value.reference_no || null, issued_on: value.issued_on || null,
    expires_on: value.expires_on || null, responsible_staff_id: value.responsible_staff_id, attachment_id: attachmentId, notes: value.notes || null,
    review_status: value.subject_kind === "outlet" ? "approved" : value.submit_for_review ? "pending_review" : "draft", created_by: actor.staffId, updated_by: actor.staffId,
  }).select("id, expires_on").single();
  if (error || !data) {
    if (attachmentId) await supabase.from("attachments").delete().eq("id", attachmentId);
    if (storagePath) await supabase.storage.from("document-attachments").remove([storagePath]);
    if (error) logServerError(error, { source: "action.compliance.record.create", operationId: recordId });
    redirect(complianceMessageUrl(returnPath, "error", "The compliance record could not be created. Nothing was retained; retry after migration 258 is applied."));
  }
  if (value.subject_kind === "outlet" && value.branch_id) {
    const { error: replaceError } = await supabase.from("compliance_records").update({ deleted_at: new Date().toISOString(), updated_by: actor.staffId }).eq("company_id", actor.companyId).eq("subject_kind", "outlet").eq("branch_id", value.branch_id).eq("compliance_type_id", value.compliance_type_id).neq("id", data.id).is("deleted_at", null);
    if (replaceError) {
      await supabase.from("compliance_records").delete().eq("id", data.id).eq("company_id", actor.companyId);
      if (attachmentId) await supabase.from("attachments").delete().eq("id", attachmentId);
      if (storagePath) await supabase.storage.from("document-attachments").remove([storagePath]);
      redirect(complianceMessageUrl(returnPath, "error", "The current document could not be replaced. Your previous document is unchanged."));
    }
  }
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: data.id, event_type: value.subject_kind === "outlet" ? "created" : value.submit_for_review ? "submitted" : "created", safe_summary: value.subject_kind === "outlet" ? "Outlet document uploaded and made current." : value.submit_for_review ? "Record created and submitted for review." : "Draft record created.", new_expires_on: data.expires_on, actor_staff_id: actor.staffId });
  revalidatePath(value.subject_kind === "outlet" ? "/outlet-compliance" : "/people");
  redirect(value.subject_kind === "outlet" && value.branch_id ? `/outlet-compliance/${value.branch_id}?success=Document+uploaded+and+made+current.` : value.subject_kind === "staff" && value.staff_id ? `/people/${value.staff_id}?section=compliance&success=Compliance+record+and+file+saved.` : "/people?success=Compliance+record+created.");
}

export async function reviewComplianceRecord(formData: FormData) {
  const idResult = z.string().uuid().safeParse(formData.get("record_id") ?? formData.get("id"));
  const decisionResult = z.enum(["approved", "rejected"]).safeParse(formData.get("decision"));
  const noteResult = z.string().trim().max(500).safeParse(formData.get("review_note") ?? "");
  if (!idResult.success || !decisionResult.success || !noteResult.success) redirect("/outlet-compliance?error=The+review+request+was+incomplete.+Reload+and+try+again.");
  const id = idResult.data;
  const decision = decisionResult.data;
  const note = noteResult.data;
  const supabase = await createClient();
  const { data: target } = await supabase.from("compliance_records").select("subject_kind,branch_id").eq("id", id).single();
  if (!target) redirect("/outlet-compliance?error=Record+is+not+available+in+your+scope.");
  if (target.subject_kind === "outlet") redirect(target.branch_id ? `/outlet-compliance/${target.branch_id}?success=Outlet+documents+do+not+require+review.` : "/outlet-compliance?success=Outlet+documents+do+not+require+review.");
  if (decision === "rejected" && !note) redirect(target.branch_id ? `/outlet-compliance/${target.branch_id}?error=Add+a+corrective+note+before+returning+evidence.` : "/outlet-compliance?error=Add+a+corrective+note+before+returning+evidence.");
  await requirePermission(target.subject_kind === "staff" ? "people.compliance.manage" : "compliance.review");
  const { error } = await supabase.rpc("review_compliance_record_atomic" as never, { p_record_id: id, p_decision: decision, p_note: note || null } as never);
  if (error) {
    const message = error.code === "55000" ? "This evidence is no longer pending review. Reload to see its current state." : error.message;
    redirect(complianceMessageUrl(target.branch_id ? `/outlet-compliance/${target.branch_id}` : "/compliance", "error", message));
  }
  revalidatePath(target.subject_kind === "staff" ? "/people" : "/compliance");
  redirect(target.branch_id ? `/outlet-compliance/${target.branch_id}?success=${decision === "approved" ? "Evidence+approved." : "Evidence+returned+with+the+correction+note."}` : "/compliance?success=Review+saved.");
}

const outletDetailsSchema = z.object({
  reference_no: z.string().trim().max(120).optional(), issued_on: z.string().date(), expires_on: z.string().date(), notes: z.string().trim().max(1000).optional(),
}).refine((value) => value.expires_on >= value.issued_on, { path: ["expires_on"], message: "Expiry must be on or after the issue date." });

export async function updateOutletComplianceDetails(recordId: string, formData: FormData) {
  await requirePermission("outlet_compliance.upload");
  const actor = await requireActiveTenantActor();
  const id = z.string().uuid().parse(recordId);
  const parsed = outletDetailsSchema.safeParse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { data: current } = await supabase.from("compliance_records").select("branch_id,expires_on").eq("id", id).eq("company_id", actor.companyId).eq("subject_kind", "outlet").is("deleted_at", null).maybeSingle();
  const path = current?.branch_id ? `/outlet-compliance/${current.branch_id}` : "/outlet-compliance";
  if (!current || !parsed.success) redirect(complianceMessageUrl(path, "error", "Check the required record fields."));
  const value = parsed.data;
  const { error } = await supabase.from("compliance_records").update({ reference_no: value.reference_no || null, issued_on: value.issued_on, expires_on: value.expires_on, notes: value.notes || null, updated_by: actor.staffId }).eq("id", id).eq("company_id", actor.companyId).is("deleted_at", null);
  if (error) redirect(complianceMessageUrl(path, "error", error.message));
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: id, event_type: "updated", safe_summary: "Compliance details updated.", previous_expires_on: current.expires_on, new_expires_on: value.expires_on, actor_staff_id: actor.staffId });
  revalidatePath("/outlet-compliance");
  redirect(complianceMessageUrl(path, "success", "Compliance details updated."));
}

export async function addOutletComplianceAttachment(recordId: string, _state: { error: string | null; success: string | null }, formData: FormData) {
  try {
    await requirePermission("outlet_compliance.upload");
    const actor = await requireActiveTenantActor();
    const id = z.string().uuid().parse(recordId);
    const label = z.string().trim().min(3, "Name this attachment before uploading.").max(180).parse(formData.get("file_name"));
    const value = formData.get("file");
    const file = value instanceof File && value.size > 0 ? value : null;
    if (!file) throw new Error("Choose a file to upload.");
    if (file.size > 4 * 1024 * 1024) throw new Error(`This file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Compliance files must be 4 MB or smaller.`);
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
    if (!allowed.has(file.type)) throw new Error("Use a PDF, PNG, JPEG, or WebP document.");
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const starts = (...expected: number[]) => expected.every((byte, index) => bytes[index] === byte);
    const signatureValid = file.type === "application/pdf" ? starts(37,80,68,70,45) : file.type === "image/png" ? starts(137,80,78,71,13,10,26,10) : file.type === "image/jpeg" ? starts(255,216,255) : bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
    if (!signatureValid) throw new Error("Document content does not match its file type.");
    const supabase = await createClient();
    const { data: record, error: recordError } = await supabase.from("compliance_records").select("id,branch_id,attachment_id").eq("id", id).eq("company_id", actor.companyId).eq("subject_kind", "outlet").is("deleted_at", null).maybeSingle();
    if (recordError || !record) throw new Error("This compliance record is no longer available.");
    const attachmentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || "compliance-file";
    const storagePath = `${actor.companyId}/compliance/${id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("document-attachments").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (uploadError) {
      logServerError(uploadError, { source: "action.compliance.attachment.storage", operationId: id });
      throw new Error("File storage could not accept this upload. Retry in a moment.");
    }
    const { error: insertError } = await supabase.from("attachments").insert({ id: attachmentId, company_id: actor.companyId, entity_type: "compliance_record", entity_id: id, file_name: label, file_type: file.type, file_size: file.size, storage_path: storagePath, file_url: null, uploaded_by: actor.staffId, created_by: actor.staffId, updated_by: actor.staffId });
    if (insertError) {
      await supabase.storage.from("document-attachments").remove([storagePath]);
      logServerError(insertError, { source: "action.compliance.attachment.record", operationId: id });
      throw new Error("The file could not be linked to this requirement. Nothing was retained; retry after migration 258 is applied.");
    }
    if (!record.attachment_id) {
      const { error: primaryError } = await supabase.from("compliance_records").update({ attachment_id: attachmentId, updated_by: actor.staffId }).eq("id", id).eq("company_id", actor.companyId);
      if (primaryError) logServerError(primaryError, { source: "action.compliance.attachment.primary", operationId: `${id}:${attachmentId}` });
    }
    const { error: historyError } = await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: id, event_type: "attachment_uploaded", safe_summary: `Attachment ${label} uploaded.`, actor_staff_id: actor.staffId });
    if (historyError) logServerError(historyError, { source: "action.compliance.attachment.history", operationId: `${id}:${attachmentId}` });
    revalidatePath(record.branch_id ? `/outlet-compliance/${record.branch_id}` : "/outlet-compliance");
    return { error: null, success: `${label} uploaded.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not upload this attachment.", success: null };
  }
}

export async function archiveOutletComplianceAttachment(recordId: string, attachmentId: string) {
  await requirePermission("outlet_compliance.upload");
  const actor = await requireActiveTenantActor();
  const recordKey = z.string().uuid().parse(recordId);
  const attachmentKey = z.string().uuid().parse(attachmentId);
  const supabase = await createClient();
  const { data: record } = await supabase.from("compliance_records").select("id,branch_id,attachment_id").eq("id", recordKey).eq("company_id", actor.companyId).eq("subject_kind", "outlet").is("deleted_at", null).maybeSingle();
  const path = record?.branch_id ? `/outlet-compliance/${record.branch_id}` : "/outlet-compliance";
  if (!record) redirect(complianceMessageUrl(path, "error", "This compliance record is no longer available."));
  const { data: attachment } = await supabase.from("attachments").select("id,file_name").eq("id", attachmentKey).eq("entity_type", "compliance_record").eq("entity_id", recordKey).eq("company_id", actor.companyId).eq("status", "active").is("deleted_at", null).maybeSingle();
  if (!attachment) redirect(complianceMessageUrl(path, "error", "This attachment is no longer available."));
  const { error } = await supabase.from("attachments").update({ status: "archived", deleted_at: new Date().toISOString(), updated_by: actor.staffId }).eq("id", attachmentKey).eq("company_id", actor.companyId);
  if (error) redirect(complianceMessageUrl(path, "error", error.message));
  if (record.attachment_id === attachmentKey) {
    const { data: next } = await supabase.from("attachments").select("id").eq("entity_type", "compliance_record").eq("entity_id", recordKey).eq("company_id", actor.companyId).eq("status", "active").is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await supabase.from("compliance_records").update({ attachment_id: next?.id ?? null, updated_by: actor.staffId }).eq("id", recordKey).eq("company_id", actor.companyId);
  }
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: recordKey, event_type: "attachment_archived", safe_summary: `Attachment ${attachment.file_name} removed.`, actor_staff_id: actor.staffId });
  revalidatePath("/outlet-compliance");
  redirect(complianceMessageUrl(path, "success", "Attachment removed."));
}

export async function revokeComplianceRecord(formData: FormData) {
  await requirePermission("outlet_compliance.upload");
  const actor = await requireActiveTenantActor();
  const id = z.string().uuid().parse(formData.get("record_id"));
  const supabase = await createClient();
  const { data: target, error: readError } = await supabase.from("compliance_records").select("id,branch_id,review_status").eq("id", id).eq("subject_kind", "outlet").is("deleted_at", null).maybeSingle();
  const returnPath = target?.branch_id ? `/outlet-compliance/${target.branch_id}` : "/outlet-compliance";
  if (readError || !target) redirect(complianceMessageUrl(returnPath, "error", "This evidence is no longer available."));
  if (!target.branch_id) redirect(complianceMessageUrl(returnPath, "error", "This evidence is not linked to an outlet."));
  const { error } = await supabase.from("compliance_records").update({ deleted_at: new Date().toISOString(), updated_by: actor.staffId }).eq("id", id).eq("company_id", actor.companyId).is("deleted_at", null);
  if (error) redirect(complianceMessageUrl(returnPath, "error", error.message));
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: id, event_type: "updated", safe_summary: "Outlet document removed.", actor_staff_id: actor.staffId });
  revalidatePath("/outlet-compliance");
  redirect(complianceMessageUrl(returnPath, "success", "Document removed. You can upload its replacement now."));
}

export async function renewComplianceRecord(formData: FormData) {
  await requirePermission("compliance.manage");
  const actor = await requireActiveTenantActor();
  const id = z.string().uuid().parse(formData.get("id"));
  const expiresOn = z.string().date().parse(formData.get("expires_on"));
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase.from("compliance_records").select("expires_on").eq("id", id).single();
  if (readError || !current) redirect("/compliance?error=Compliance+record+is+not+available+in+your+scope.");
  const { error } = await supabase.from("compliance_records").update({ expires_on: expiresOn, review_status: "pending_review", reviewed_by: null, reviewed_at: null, review_note: null, updated_by: actor.staffId }).eq("id", id);
  if (error) redirect(`/compliance?error=${encodeURIComponent(error.message)}`);
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: id, event_type: "renewed", safe_summary: "Expiry renewed and returned for review.", previous_expires_on: current.expires_on, new_expires_on: expiresOn, actor_staff_id: actor.staffId });
  revalidatePath("/compliance");
}

export async function createComplianceType(formData: FormData) {
  await requirePermission("compliance.types.manage");
  await requireActiveTenantActor();
  const typeName = z.string().trim().min(2).max(100).parse(formData.get("type_name"));
  const subjectKind = z.enum(["outlet", "staff", "asset"]).parse(formData.get("subject_kind"));
  const sensitive = formData.get("is_sensitive") === "1";
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_compliance_type_atomic" as never, {
    p_type_name: typeName,
    p_subject_kind: subjectKind,
    p_is_sensitive: sensitive,
  } as never);
  if (error) {
    const message = error.code === "PGRST202"
      ? "Compliance type creation is temporarily unavailable; apply migration 261 and retry."
      : error.message;
    redirect(`/compliance?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(subjectKind==="outlet"?"/outlet-compliance":"/compliance");
  redirect(subjectKind==="outlet"?"/outlet-compliance?success=Requirement+type+added+to+all+active+sites.":"/compliance?success=Compliance+type+created.");
}
