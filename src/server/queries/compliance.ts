import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";

export type ComplianceState = "expired" | "due_7" | "due_30" | "due_60" | "due_90" | "valid" | "missing" | "pending_review" | "returned";

export function complianceState(expiresOn: string | null, reviewStatus: string, hasAttachment: boolean, now = new Date()): ComplianceState {
  if (reviewStatus === "rejected") return "returned";
  if (!hasAttachment) return "missing";
  if (reviewStatus === "pending_review") return "pending_review";
  if (!expiresOn) return "valid";
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.ceil((new Date(`${expiresOn}T00:00:00Z`).getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 7) return "due_7";
  if (days <= 30) return "due_30";
  if (days <= 60) return "due_60";
  if (days <= 90) return "due_90";
  return "valid";
}

export async function getComplianceWorkspace(filters: { state?: string; branch?: string } = {}) {
  if (isMockMode()) return { records: [], types: [], branches: [], staffs: [] };
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return { records: [], types: [], branches: [], staffs: [] };
  const [recordsResult, typesResult, branchesResult, staffsResult] = await Promise.all([
    supabase.from("compliance_records").select("*").eq("company_id", profile.company_id).is("deleted_at", null).order("expires_on", { ascending: true, nullsFirst: false }),
    supabase.from("compliance_types").select("*").eq("company_id", profile.company_id).eq("status", "active").is("deleted_at", null).order("type_name"),
    supabase.from("branches").select("id, branch_name").eq("company_id", profile.company_id).eq("status", "active").is("deleted_at", null).order("branch_name"),
    supabase.from("staffs").select("id, full_name, default_branch_id").eq("company_id", profile.company_id).eq("status", "active").is("deleted_at", null).order("full_name"),
  ]);
  for (const result of [recordsResult, typesResult, branchesResult, staffsResult]) if (result.error) throw new Error(result.error.message);
  const typeById = new Map((typesResult.data ?? []).map((row) => [row.id, row]));
  const ownerById = new Map((staffsResult.data ?? []).map((row) => [row.id, row.full_name]));
  const records = (recordsResult.data ?? []).map((record) => {
    const type = typeById.get(record.compliance_type_id);
    const state = complianceState(record.expires_on, record.review_status, Boolean(record.attachment_id));
    return { ...record, type_name: type?.type_name ?? "Unavailable type", is_sensitive: type?.is_sensitive ?? false, state, responsible_name: record.responsible_staff_id ? ownerById.get(record.responsible_staff_id) ?? "Unassigned" : "Unassigned" };
  }).filter((record) => (!filters.state || filters.state === "all" || record.state === filters.state) && (!filters.branch || filters.branch === "all" || record.branch_id === filters.branch));
  return { records, types: typesResult.data ?? [], branches: branchesResult.data ?? [], staffs: staffsResult.data ?? [] };
}

export async function getOutletComplianceWorkspace(branchId?: string) {
  if (isMockMode()) return { branches: [], requirements: [], records: [], migrationReady: true };
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  if (!profile?.company_id) return { branches: [], requirements: [], records: [], migrationReady: true };
  let branchesQuery = supabase.from("branches").select("id,branch_code,branch_name").eq("company_id", profile.company_id).eq("branch_type", "outlet").eq("status", "active").is("deleted_at", null).order("branch_name");
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
    supabase.from("compliance_types").select("id,type_code,type_name,subject_kind").eq("company_id", profile.company_id).eq("subject_kind", "outlet").eq("status", "active").is("deleted_at", null).order("type_name"),
  ]);
  for (const result of [branchesResult, recordsResult, typesResult]) if (result.error) throw new Error(result.error.message);
  const migrationReady = !requirementsResult.error;
  if (requirementsResult.error && !["42P01", "PGRST205"].includes(requirementsResult.error.code ?? "")) throw new Error(requirementsResult.error.message);
  const records = (recordsResult.data ?? []).map((record) => ({ ...record, state: complianceState(record.expires_on, record.review_status, Boolean(record.attachment_id)) }));
  const typeById = new Map((typesResult.data ?? []).map((row) => [row.id, row]));
  const latestByRequirement = new Map<string, (typeof records)[number]>();
  for (const record of records) { const key = `${record.branch_id}:${record.compliance_type_id}`; if (!latestByRequirement.has(key)) latestByRequirement.set(key, record); }
  const requirementRows = migrationReady ? requirementsResult.data ?? [] : (branchesResult.data ?? []).flatMap((branch) => (typesResult.data ?? []).map((type) => ({ id: `${branch.id}:${type.id}`, branch_id: branch.id, compliance_type_id: type.id, is_required: true, waiver_reason: null })));
  const requirements = requirementRows.map((row) => ({ ...row, type: typeById.get(row.compliance_type_id)!, record: latestByRequirement.get(`${row.branch_id}:${row.compliance_type_id}`) ?? null }));
  return { branches: branchesResult.data ?? [], requirements, records, migrationReady };
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
