import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";

export type ComplianceState = "expired" | "due_7" | "due_30" | "due_60" | "due_90" | "valid" | "missing" | "pending_review";

export function complianceState(expiresOn: string | null, reviewStatus: string, hasAttachment: boolean, now = new Date()): ComplianceState {
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
