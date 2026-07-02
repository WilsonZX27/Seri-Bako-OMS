import {
  isMockMode,
  mockApprovalSteps,
  mockApprovals,
  mockAttachments,
  mockDocumentComments,
  mockDocumentRevisions,
  mockDocuments,
  mockProfile,
} from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";

type DocumentFilters = Record<string, string | undefined>;

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"] & {
  created_by_name?: string | null;
};

function filterDocuments(rows: DocumentRow[], filters: DocumentFilters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const type = filters.document_type && filters.document_type !== "all" ? filters.document_type : null;
  const approvalStatus = filters.approval_status && filters.approval_status !== "all" ? filters.approval_status : null;
  const sort = filters.sort ?? "updated_at";
  const dir = filters.dir ?? "desc";
  return rows
    .filter((document) => {
      const matchesSearch = search
        ? [document.document_no, document.document_type, document.title, document.current_step ?? "", document.related_entity_type ?? ""].some((value) =>
            value.toLowerCase().includes(search),
          )
        : true;
      const matchesStatus = status ? document.status === status : true;
      const matchesType = type ? document.document_type === type : true;
      const matchesApproval = approvalStatus ? document.approval_status === approvalStatus : true;
      return matchesSearch && matchesStatus && matchesType && matchesApproval;
    })
    .sort((a, b) => compareTableValues(a[sort as keyof DocumentRow], b[sort as keyof DocumentRow], dir));
}

export async function getDocuments(filters: DocumentFilters = {}) {
  if (isMockMode()) {
    const rows = mockDocuments.map((document) => ({ ...document, created_by_name: mockProfile.full_name }));
    return paginateRows(filterDocuments(rows, filters), filters.page, 12);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return paginateRows(filterDocuments((data ?? []) as DocumentRow[], filters), filters.page, 12);
}

export async function getDocument(id: string) {
  if (isMockMode()) {
    const document = mockDocuments.find((row) => row.id === id);
    if (!document) throw new Error("Mock document not found");
    return { ...document, created_by_name: mockProfile.full_name };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data as DocumentRow;
}

export async function getDocumentBundle(id: string) {
  if (isMockMode()) {
    const document = await getDocument(id);
    const approval = mockApprovals.find((row) => row.entity_id === id) ?? null;
    return {
      document,
      comments: mockDocumentComments.filter((row) => row.document_id === id && !row.deleted_at),
      revisions: mockDocumentRevisions.filter((row) => row.document_id === id),
      attachments: mockAttachments.filter((row) => row.entity_type === "document" && row.entity_id === id && row.status === "active"),
      approval,
      approvalSteps: approval ? mockApprovalSteps.filter((row) => row.approval_id === approval.id) : [],
      activityLogs: [
        { id: `activity-created-${id}`, activity_type: "created", message: "Document created", created_at: document.created_at, created_by: document.created_by },
        ...(document.submitted_at ? [{ id: `activity-submitted-${id}`, activity_type: "submitted", message: "Document submitted", created_at: document.submitted_at, created_by: document.created_by }] : []),
        ...(document.posted_at ? [{ id: `activity-posted-${id}`, activity_type: "posted", message: "Document posted", created_at: document.posted_at, created_by: document.updated_by }] : []),
      ],
    };
  }

  const supabase = await createClient();
  const [document, comments, revisions, attachments, approvals, activityLogs] = await Promise.all([
    getDocument(id),
    supabase.from("document_comments").select("*").eq("document_id", id).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("document_revisions").select("*").eq("document_id", id).order("revision_no", { ascending: true }),
    supabase.from("attachments").select("*").eq("entity_type", "document").eq("entity_id", id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("approvals").select("*").eq("entity_type", "document").eq("entity_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(1),
    supabase.from("activity_logs").select("*").eq("entity_type", "document").eq("entity_id", id).order("created_at", { ascending: true }),
  ]);
  if (comments.error) throw new Error(comments.error.message);
  if (revisions.error) throw new Error(revisions.error.message);
  if (attachments.error) throw new Error(attachments.error.message);
  if (approvals.error) throw new Error(approvals.error.message);
  if (activityLogs.error) throw new Error(activityLogs.error.message);
  const approval = approvals.data?.[0] ?? null;
  let approvalSteps: Database["public"]["Tables"]["approval_steps"]["Row"][] = [];
  if (approval) {
    const { data, error } = await supabase.from("approval_steps").select("*").eq("approval_id", approval.id).order("step_no", { ascending: true });
    if (error) throw new Error(error.message);
    approvalSteps = data ?? [];
  }
  return {
    document,
    comments: comments.data ?? [],
    revisions: revisions.data ?? [],
    attachments: attachments.data ?? [],
    approval,
    approvalSteps,
    activityLogs: activityLogs.data ?? [],
  };
}
