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
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";
import type { Database } from "@/types/database";

type DocumentFilters = Record<string, string | undefined>;

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"] & {
  created_by_name?: string | null;
  updated_by_name?: string | null;
};

type ActorActivity = Database["public"]["Tables"]["activity_logs"]["Row"] & { created_by_name?: string | null };
type ActorAttachment = Database["public"]["Tables"]["attachments"]["Row"] & { uploaded_by_name?: string | null; created_by_name?: string | null };
type ActorComment = Database["public"]["Tables"]["document_comments"]["Row"] & { created_by_name?: string | null };
type ActorRevision = Database["public"]["Tables"]["document_revisions"]["Row"] & { changed_by_name?: string | null };
type ActorApprovalStep = Database["public"]["Tables"]["approval_steps"]["Row"] & { acted_by_name?: string | null; approver_staff_name?: string | null };

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
      const statusGroup =
        status === "rejected" ? ["rejected", "cancelled"]
        : status === "closed" ? ["completed", "closed", "converted"]
        : status === "posted" ? ["posted"]
        : status === "pending_approval" ? ["pending_approval", "submitted"]
        : status ? [status] : [];
      const matchesStatus = statusGroup.length ? statusGroup.includes(document.status) : true;
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
  const displayMap = await resolveActorDisplayMap((data ?? []).flatMap((document) => [document.created_by, document.updated_by]));
  const rows = ((data ?? []) as DocumentRow[]).map((document) => ({
    ...document,
    created_by_name: actorDisplayName(displayMap, document.created_by),
    updated_by_name: actorDisplayName(displayMap, document.updated_by),
  }));
  return paginateRows(filterDocuments(rows, filters), filters.page, 12);
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
  const displayMap = await resolveActorDisplayMap([data.created_by, data.updated_by]);
  return {
    ...(data as DocumentRow),
    created_by_name: actorDisplayName(displayMap, data.created_by),
    updated_by_name: actorDisplayName(displayMap, data.updated_by),
  };
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
  const actorIds = [
    document.created_by,
    document.updated_by,
    ...(comments.data ?? []).map((row) => row.created_by),
    ...(revisions.data ?? []).map((row) => row.changed_by),
    ...(attachments.data ?? []).flatMap((row) => [row.uploaded_by, row.created_by]),
    approval?.submitted_by,
    approval?.created_by,
    approval?.updated_by,
    ...approvalSteps.flatMap((row) => [row.acted_by, row.approver_staff_id]),
    ...(activityLogs.data ?? []).map((row) => row.created_by),
  ];
  const displayMap = await resolveActorDisplayMap(actorIds);
  const withActor = (actorId: string | null | undefined) => actorDisplayName(displayMap, actorId);

  return {
    document: {
      ...document,
      created_by_name: withActor(document.created_by),
      updated_by_name: withActor(document.updated_by),
    },
    comments: ((comments.data ?? []) as ActorComment[]).map((row) => ({ ...row, created_by_name: withActor(row.created_by) })),
    revisions: ((revisions.data ?? []) as ActorRevision[]).map((row) => ({ ...row, changed_by_name: withActor(row.changed_by) })),
    attachments: ((attachments.data ?? []) as ActorAttachment[]).map((row) => ({
      ...row,
      uploaded_by_name: withActor(row.uploaded_by),
      created_by_name: withActor(row.created_by),
    })),
    approval,
    approvalSteps: (approvalSteps as ActorApprovalStep[]).map((row) => ({
      ...row,
      acted_by_name: withActor(row.acted_by),
      approver_staff_name: withActor(row.approver_staff_id),
    })),
    activityLogs: ((activityLogs.data ?? []) as ActorActivity[]).map((row) => ({ ...row, created_by_name: withActor(row.created_by) })),
  };
}
