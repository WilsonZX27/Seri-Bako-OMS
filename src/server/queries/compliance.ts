import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { isMockMode } from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, requireReadRows } from "@/server/queries/common";

export type ComplianceState = "expired" | "due_7" | "due_30" | "due_60" | "due_90" | "valid" | "missing" | "pending_review" | "returned";
export type ComplianceAttachment = { id: string; entity_id: string; file_name: string; file_type: string | null; file_size: number; storage_path: string | null; file_url: string | null; status: string; uploaded_by: string | null; created_at: string; uploaded_by_name: string | null };

export function complianceState(expiresOn: string | null, reviewStatus: string, hasAttachment: boolean, now = new Date()): ComplianceState {
  if (reviewStatus === "rejected") return "returned";
  if (!hasAttachment) return "missing";
  if (reviewStatus === "pending_review") return "pending_review";
  if (!expiresOn) return "valid";
  const today = new Date(`${todayInKualaLumpur(now)}T00:00:00Z`);
  const days = Math.ceil((new Date(`${expiresOn}T00:00:00Z`).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 7) return "due_7";
  if (days <= 30) return "due_30";
  if (days <= 60) return "due_60";
  if (days <= 90) return "due_90";
  return "valid";
}

export async function getOutletComplianceWorkspace(branchId?: string) {
  if (isMockMode()) return { branches: [], requirements: [], records: [], migrationReady: true };
  const actor = await requireActiveTenantActor();
  if (["outlet_staff", "outlet_supervisor"].includes(actor.roleCode)) throw new Error("Outlet compliance is restricted to management.");
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return { branches: [], requirements: [], records: [], migrationReady: true };
  let branchesQuery = supabase.from("branches").select("id,branch_code,branch_name,branch_type").eq("company_id", profile.company_id).in("branch_type", ["outlet", "central_kitchen"]).eq("status", "active").is("deleted_at", null).order("branch_name");
  let requirementsQuery = supabase.from("outlet_compliance_requirements").select("id,branch_id,compliance_type_id,is_required,waiver_reason").eq("company_id", profile.company_id).order("created_at");
  let recordsQuery = supabase.from("compliance_records").select("*").eq("company_id", profile.company_id).eq("subject_kind", "outlet").is("deleted_at", null).order("updated_at", { ascending: false });
  if (branchId) {
    branchesQuery = branchesQuery.eq("id", branchId);
    requirementsQuery = requirementsQuery.eq("branch_id", branchId);
    recordsQuery = recordsQuery.eq("branch_id", branchId);
  }
  const [branchesResult, requirementsResult, recordsResult, typesResult] = await Promise.all([
    branchesQuery,
    requirementsQuery,
    recordsQuery,
    supabase.from("compliance_types").select("id,type_code,type_name,subject_kind,is_required,module_scope").eq("company_id", profile.company_id).eq("subject_kind", "outlet").eq("status", "active").eq("is_required", true).eq("module_scope", "outlet").is("deleted_at", null).order("type_name"),
  ]);
  for (const result of [branchesResult, recordsResult, typesResult]) if (result.error) throw new Error(result.error.message);
  const migrationReady = !requirementsResult.error;
  if (requirementsResult.error && !["42P01", "PGRST205"].includes(requirementsResult.error.code ?? "")) throw new Error(requirementsResult.error.message);
  const recordIds = (recordsResult.data ?? []).map((record) => record.id);
  const { data: attachmentRows, error: attachmentError } = recordIds.length ? await supabase.from("attachments").select("id,entity_id,file_name,file_type,file_size,storage_path,file_url,status,uploaded_by,created_at").eq("company_id", profile.company_id).eq("entity_type", "compliance_record").in("entity_id", recordIds).eq("status", "active").is("deleted_at", null).order("created_at", { ascending: false }) : { data: [], error: null };
  if (attachmentError) throw new Error(attachmentError.message);
  const uploaderIds = [...new Set((attachmentRows ?? []).flatMap((row) => row.uploaded_by ? [row.uploaded_by] : []))];
  const { data: uploaders, error: uploaderError } = uploaderIds.length ? await supabase.from("staffs").select("id,full_name").in("id", uploaderIds) : { data: [], error: null };
  if (uploaderError) throw new Error(uploaderError.message);
  const uploaderById = new Map((uploaders ?? []).map((row) => [row.id, row.full_name]));
  const attachmentsByRecord = new Map<string, ComplianceAttachment[]>();
  for (const attachment of attachmentRows ?? []) {
    const rows = attachmentsByRecord.get(attachment.entity_id) ?? [];
    rows.push({ ...attachment, uploaded_by_name: attachment.uploaded_by ? uploaderById.get(attachment.uploaded_by) ?? null : null });
    attachmentsByRecord.set(attachment.entity_id, rows);
  }
  const recordTypeIds = [...new Set((recordsResult.data ?? []).map(record => record.compliance_type_id))];
  const { data: recordTypes, error: recordTypeError } = recordTypeIds.length ? await supabase.from("compliance_types").select("id,type_name").eq("company_id", profile.company_id).in("id", recordTypeIds) : { data: [], error: null };
  if (recordTypeError) throw new Error(recordTypeError.message);
  const recordTypeNames = new Map((recordTypes ?? []).map(type => [type.id, type.type_name]));
  const records = (recordsResult.data ?? []).map((record) => {
    const attachments = attachmentsByRecord.get(record.id) ?? [];
    return { ...record, type_name: recordTypeNames.get(record.compliance_type_id) ?? "Compliance renewal", attachments, state: complianceState(record.expires_on, record.review_status, attachments.length > 0) };
  });
  const typeById = new Map((typesResult.data ?? []).map((row) => [row.id, row]));
  const latestByRequirement = new Map<string, (typeof records)[number]>();
  for (const record of records) { const key = `${record.branch_id}:${record.compliance_type_id}`; if (!latestByRequirement.has(key)) latestByRequirement.set(key, record); }
  const savedRequirementByKey = new Map((requirementsResult.data ?? []).map((row) => [`${row.branch_id}:${row.compliance_type_id}`, row]));
  // The checklist remains usable during a staged rollout: every active Outlet
  // and Central Kitchen receives the same required type set even before the
  // idempotent assignment backfill reaches the linked database.
  const requirementRows = (branchesResult.data ?? []).flatMap((branch) => (typesResult.data ?? []).map((type) => savedRequirementByKey.get(`${branch.id}:${type.id}`) ?? ({ id: `${branch.id}:${type.id}`, branch_id: branch.id, compliance_type_id: type.id, is_required: true, waiver_reason: null })));
  const requirements = requirementRows.map((row) => ({ ...row, type: typeById.get(row.compliance_type_id)!, record: latestByRequirement.get(`${row.branch_id}:${row.compliance_type_id}`) ?? null }));
  return { branches: branchesResult.data ?? [], requirements, records, migrationReady };
}

export async function getOutletComplianceIssueCount(): Promise<number> {
  if (isMockMode()) return 0;
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return 0;

  const [branchesResult, typesResult, recordsResult] = await Promise.all([
    supabase
      .from("branches")
      .select("id")
      .eq("company_id", profile.company_id)
      .in("branch_type", ["outlet", "central_kitchen"])
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("compliance_types")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("subject_kind", "outlet")
      .eq("status", "active")
      .eq("is_required", true)
      .eq("module_scope", "outlet")
      .is("deleted_at", null),
    supabase
      .from("compliance_records")
      .select("id,branch_id,compliance_type_id,expires_on,review_status,updated_at")
      .eq("company_id", profile.company_id)
      .eq("subject_kind", "outlet")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
  ]);
  for (const result of [branchesResult, typesResult, recordsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const records = requireReadRows(recordsResult.data, "Outlet compliance issue records");
  const recordIds = records.map((record) => record.id);
  const attachmentResult = recordIds.length
    ? await supabase
      .from("attachments")
      .select("entity_id")
      .eq("company_id", profile.company_id)
      .eq("entity_type", "compliance_record")
      .in("entity_id", recordIds)
      .eq("status", "active")
      .is("deleted_at", null)
    : { data: [] as { entity_id: string }[], error: null };
  if (attachmentResult.error) throw new Error(attachmentResult.error.message);

  const recordsWithEvidence = new Set(requireReadRows(attachmentResult.data, "Outlet compliance evidence identities").map((row) => row.entity_id));
  const latestByRequirement = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = `${record.branch_id}:${record.compliance_type_id}`;
    if (!latestByRequirement.has(key)) latestByRequirement.set(key, record);
  }

  let issues = 0;
  for (const branch of requireReadRows(branchesResult.data, "Outlet compliance issue branches")) {
    for (const type of requireReadRows(typesResult.data, "Outlet compliance issue types")) {
      const record = latestByRequirement.get(`${branch.id}:${type.id}`);
      if (!record) {
        issues += 1;
        continue;
      }
      const state = complianceState(record.expires_on, record.review_status, recordsWithEvidence.has(record.id));
      if (state === "missing" || state === "expired") issues += 1;
    }
  }
  return issues;
}

export async function getPeopleCompliance(staffId?: string) {
  if (isMockMode()) return [];
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return [];
  let query = supabase.from("compliance_records").select("*").eq("company_id", profile.company_id).eq("subject_kind", "staff").is("deleted_at", null).order("expires_on", { ascending: true, nullsFirst: false });
  if (staffId) query = query.eq("staff_id", staffId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const typeIds = [...new Set((data ?? []).map((row) => row.compliance_type_id))];
  const { data: types, error: typeError } = typeIds.length ? await supabase.from("compliance_types").select("id,type_name,is_sensitive").in("id", typeIds) : { data: [], error: null };
  if (typeError) throw new Error(typeError.message);
  const typeById = new Map((types ?? []).map((row) => [row.id, row]));
  return (data ?? []).map((record) => ({ ...record, type: typeById.get(record.compliance_type_id), state: complianceState(record.expires_on, record.review_status, Boolean(record.attachment_id)) }));
}

export async function getPeopleComplianceTypes() {
  if (isMockMode()) return [];
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return [];
  const { data, error } = await supabase
    .from("compliance_types")
    .select("id,type_name,subject_kind,is_sensitive")
    .eq("company_id", profile.company_id)
    .eq("subject_kind", "staff")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("type_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
