import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCanonicalDocumentHref, getCanonicalEntityHref } from "@/lib/document-routing";
import { isMockMode, mockDocuments } from "@/lib/mock-mode";
import { hasPermission } from "@/server/auth/permissions";
import { getVisibleNotificationsForCurrentUser } from "@/server/queries/notifications";
import { getCurrentUserPendingActions } from "@/server/queries/pending-actions";
import { logServerWarning } from "@/server/observability/logger";

type AssignedActivity = {
  id: string;
  message: string;
  created_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
};

type PendingAction = {
  id: string;
  document_no: string;
  title: string;
  href: string;
  step?: string;
  branch_name?: string | null;
  age_label?: string;
};

export async function getTopBarActivity() {
  if (isMockMode()) {
    return {
      availability: { pendingActions: true, notifications: true },
      pendingApprovals: mockDocuments
        .filter((document) => document.approval_status === "pending")
        .slice(0, 5)
        .map((document) => ({
          id: document.id,
          document_no: document.document_no,
          title: document.title,
          href: getCanonicalDocumentHref(document),
        })),
      assignedActivities: [] as AssignedActivity[],
      notifications: [],
      announcements: [],
    };
  }

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [documentApprovals, notificationsResult, assignedActivities, workflowPendingActionsResult, canApproveProductionResult, canPostProductionResult] = await Promise.all([
    supabase.from("documents").select("id, document_no, title, document_type, related_entity_type, related_entity_id").eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5),
    getVisibleNotificationsForCurrentUser().then((rows) => ({ rows, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.notifications" });
      return { rows: [], unavailable: true };
    }),
    // The complete activity stream belongs to /activity. Resolving actor
    // identities here made every application route wait on an audit-log query.
    Promise.resolve([] as AssignedActivity[]),
    getCurrentUserPendingActions(5).then((rows) => ({ rows, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.pending-actions" });
      return { rows: [] as PendingAction[], unavailable: true };
    }),
    hasPermission("production.approve").then((allowed) => ({ allowed, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.production-approve-permission" });
      return { allowed: false, unavailable: true };
    }),
    hasPermission("production.post").then((allowed) => ({ allowed, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.production-post-permission" });
      return { allowed: false, unavailable: true };
    }),
  ]);
  const notifications = notificationsResult.rows;
  const workflowPendingActions = workflowPendingActionsResult.rows;
  const canApproveProduction = canApproveProductionResult.allowed;
  const canPostProduction = canPostProductionResult.allowed;
  let pendingActionsUnavailable = Boolean(
    documentApprovals.error
    || workflowPendingActionsResult.unavailable
    || canApproveProductionResult.unavailable
    || canPostProductionResult.unavailable
  );
  if (documentApprovals.error) logServerWarning(documentApprovals.error, { source: "topbar.document-approvals" });

  const documentPendingActions: PendingAction[] = documentApprovals.error
    ? []
    : (documentApprovals.data ?? []).map((document) => ({
        id: document.id,
        document_no: document.document_no,
        title: document.title,
        href: getCanonicalDocumentHref(document),
      }));
  const stockCountDocumentIds = (documentApprovals.data ?? [])
    .filter((document) => document.related_entity_type === "stock_count" && document.related_entity_id)
    .map((document) => document.related_entity_id as string);
  let activeStockCountIds = new Set<string>();
  let activeStockCountValidationFailed = false;
  if (stockCountDocumentIds.length) {
    const activeStockCountsResult = await supabase
      .from("stock_counts")
      .select("id")
      .in("id", stockCountDocumentIds)
      .is("deleted_at", null)
      .in("status", ["draft", "submitted", "reviewed", "approved"]);
    if (!activeStockCountsResult.error) {
      activeStockCountIds = new Set((activeStockCountsResult.data ?? []).map((row) => row.id));
    } else {
      activeStockCountValidationFailed = true;
      pendingActionsUnavailable = true;
      logServerWarning(activeStockCountsResult.error, { source: "topbar.active-stock-counts" });
    }
  }
  const liveDocumentPendingActions = (documentApprovals.data ?? []).length
    ? documentPendingActions.filter((_, index) => {
        const document = documentApprovals.data?.[index];
        if (document?.related_entity_type !== "stock_count" || !document.related_entity_id) return true;
        return activeStockCountValidationFailed || activeStockCountIds.has(document.related_entity_id);
      })
    : documentPendingActions;
  const workflowPrHrefs = new Set(workflowPendingActions.filter((item) => item.href.startsWith("/purchase-requests/")).map((item) => item.href));
  const scopedDocumentPendingActions = liveDocumentPendingActions.filter((item) => !item.href.startsWith("/purchase-requests/") || workflowPrHrefs.has(item.href));

  const productionPendingActions: PendingAction[] = [];
  if (canApproveProduction || canPostProduction) {
    const productionStatuses = [
      ...(canApproveProduction ? [{ status: "submitted", label: "Production approval required" }] : []),
      ...(canPostProduction ? [{ status: "approved", label: "Ready to post production" }] : []),
    ];
    for (const filter of productionStatuses) {
      const { data, error } = await db
        .from("production_jobs")
        .select("id, production_job_no, branch_id, updated_at")
        .eq("status", filter.status)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) {
        pendingActionsUnavailable = true;
        logServerWarning(error, { source: `topbar.production-${filter.status}` });
        continue;
      }
      productionPendingActions.push(...((data ?? []) as Array<{ id: string; production_job_no: string }>).map((row) => ({
        id: `prod-${filter.status}-${row.id}`,
        document_no: row.production_job_no,
        title: filter.label,
        href: `/production/jobs/${row.id}`,
      })));
    }
  }

  const pendingApprovals = [...workflowPendingActions, ...productionPendingActions, ...scopedDocumentPendingActions]
    .filter((item, index, rows) => rows.findIndex((row) => row.href === item.href) === index)
    .slice(0, 5);
  const pendingActionHrefs = new Set(pendingApprovals.map((item) => item.href));
  const actionableNotifications = notifications
    .filter((row) => !row.is_company_wide && !row.read_at)
    .map((row) => ({
      ...row,
      action_url: getCanonicalEntityHref(row.entity_type, row.entity_id, row.action_url ?? "#"),
    }))
    // A workflow item is already represented in "My Pending Actions". Keep
    // the notification feed for events that do not duplicate an actionable
    // queue entry.
    .filter((row) => !pendingActionHrefs.has(row.action_url ?? ""));

  const result = {
    availability: {
      pendingActions: !pendingActionsUnavailable,
      notifications: !notificationsResult.unavailable,
    },
    pendingApprovals,
    assignedActivities: assignedActivities as AssignedActivity[],
    notifications: actionableNotifications.slice(0, 5),
    announcements: notifications.filter((row) => row.is_company_wide && !row.read_at).slice(0, 5),
  };
  return result;
}
