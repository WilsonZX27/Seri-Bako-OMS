"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

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
  let attachmentId: string | null = null;
  let storagePath: string | null = null;
  if (file) {
    if (file.size > 10 * 1024 * 1024) redirect(complianceMessageUrl(returnPath, "error", "Supporting document must be 10 MB or smaller."));
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
    if (uploadError) redirect(complianceMessageUrl(returnPath, "error", uploadError.message));
    const { error: attachmentError } = await supabase.from("attachments").insert({ id: attachmentId, company_id: actor.companyId, entity_type: "compliance_record", entity_id: recordId, file_name: file.name.slice(0,180), file_type: file.type, file_size: file.size, storage_path: storagePath, file_url: null, uploaded_by: actor.staffId, created_by: actor.staffId, updated_by: actor.staffId });
    if (attachmentError) { await supabase.storage.from("document-attachments").remove([storagePath]); redirect(complianceMessageUrl(returnPath, "error", attachmentError.message)); }
  }
  const { data, error } = await supabase.from("compliance_records").insert({
    id: recordId, company_id: actor.companyId, compliance_type_id: value.compliance_type_id, subject_kind: value.subject_kind,
    branch_id: value.branch_id, staff_id: value.staff_id, asset_external_ref: value.asset_external_ref || null,
    subject_label: value.subject_label, reference_no: value.reference_no || null, issued_on: value.issued_on || null,
    expires_on: value.expires_on || null, responsible_staff_id: value.responsible_staff_id, attachment_id: attachmentId, notes: value.notes || null,
    review_status: value.submit_for_review ? "pending_review" : "draft", created_by: actor.staffId, updated_by: actor.staffId,
  }).select("id, expires_on").single();
  if (error || !data) {
    if (attachmentId) await supabase.from("attachments").delete().eq("id", attachmentId);
    if (storagePath) await supabase.storage.from("document-attachments").remove([storagePath]);
    redirect(complianceMessageUrl(returnPath, "error", error?.message ?? "Record could not be created."));
  }
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: data.id, event_type: value.submit_for_review ? "submitted" : "created", safe_summary: value.submit_for_review ? "Record created and submitted for review." : "Draft record created.", new_expires_on: data.expires_on, actor_staff_id: actor.staffId });
  revalidatePath(value.subject_kind === "outlet" ? "/outlet-compliance" : "/people");
  redirect(value.subject_kind === "outlet" && value.branch_id ? `/outlet-compliance/${value.branch_id}?success=Evidence+received+and+submitted+for+review.` : value.subject_kind === "staff" && value.staff_id ? `/people/${value.staff_id}?section=compliance&success=Compliance+record+and+file+saved.` : "/people?success=Compliance+record+created.");
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
  if (decision === "rejected" && !note) redirect(target.branch_id ? `/outlet-compliance/${target.branch_id}?error=Add+a+corrective+note+before+returning+evidence.` : "/outlet-compliance?error=Add+a+corrective+note+before+returning+evidence.");
  await requirePermission(target.subject_kind === "outlet" ? "outlet_compliance.review" : target.subject_kind === "staff" ? "people.compliance.manage" : "compliance.review");
  const { error } = await supabase.rpc("review_compliance_record_atomic" as never, { p_record_id: id, p_decision: decision, p_note: note || null } as never);
  if (error) {
    const message = error.code === "55000" ? "This evidence is no longer pending review. Reload to see its current state." : error.message;
    redirect(complianceMessageUrl(target.branch_id ? `/outlet-compliance/${target.branch_id}` : "/compliance", "error", message));
  }
  revalidatePath(target.subject_kind === "outlet" ? "/outlet-compliance" : "/people");
  redirect(target.branch_id ? `/outlet-compliance/${target.branch_id}?success=${decision === "approved" ? "Evidence+approved." : "Evidence+returned+with+the+correction+note."}` : "/compliance?success=Review+saved.");
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
  if (!['draft', 'pending_review', 'rejected'].includes(target.review_status)) redirect(complianceMessageUrl(returnPath, "error", "Approved evidence cannot be revoked. Add a renewal instead."));
  const { error } = await supabase.from("compliance_records").update({ deleted_at: new Date().toISOString(), updated_by: actor.staffId }).eq("id", id).eq("company_id", actor.companyId).is("deleted_at", null);
  if (error) redirect(complianceMessageUrl(returnPath, "error", error.message));
  await supabase.from("compliance_record_history").insert({ company_id: actor.companyId, compliance_record_id: id, event_type: "updated", safe_summary: "Testing or incorrect evidence revoked before approval.", actor_staff_id: actor.staffId });
  revalidatePath("/outlet-compliance");
  redirect(complianceMessageUrl(returnPath, "success", "Evidence revoked. You can upload the correct document now."));
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
  const actor = await requireActiveTenantActor();
  const typeName = z.string().trim().min(2).max(100).parse(formData.get("type_name"));
  const subjectKind = z.enum(["outlet", "staff", "asset"]).parse(formData.get("subject_kind"));
  const sensitive = formData.get("is_sensitive") === "1";
  const typeCode = typeName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
  const supabase = await createClient();
  const { data, error } = await supabase.from("compliance_types").insert({ company_id: actor.companyId, type_code: typeCode, type_name: typeName, subject_kind: subjectKind, is_sensitive: sensitive }).select("id").single();
  if (error || !data) redirect(`/compliance?error=${encodeURIComponent(error?.message ?? "Type could not be created.")}`);
  if(subjectKind==="outlet") {
    const {data:branches}=await supabase.from("branches").select("id").eq("company_id",actor.companyId).eq("branch_type","outlet").eq("status","active").is("deleted_at",null);
    if(branches?.length) await supabase.from("outlet_compliance_requirements").insert(branches.map(branch=>({company_id:actor.companyId,branch_id:branch.id,compliance_type_id:data.id,is_required:true})));
  }
  revalidatePath(subjectKind==="outlet"?"/outlet-compliance":"/compliance");
  redirect(subjectKind==="outlet"?"/outlet-compliance?success=Requirement+type+added+to+all+active+outlets.":"/compliance?success=Compliance+type+created.");
}
