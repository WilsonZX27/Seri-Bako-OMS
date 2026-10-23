import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCanonicalDocumentHref, getCanonicalEntityHref } from "@/lib/document-routing";
import { isMockMode, mockDocuments } from "@/lib/mock-mode";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentUserScope, getVisibleNotificationsForCurrentUser } from "@/server/queries/notifications";
import { getCurrentUserPendingActionSnapshot } from "@/server/queries/pending-actions";
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
  maintenance_description?: string | null;
  maintenance_asset_name?: string | null;
  maintenance_priority?: string | null;
  maintenance_author_name?: string | null;
  updated_at?: string;
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
      attentionHrefs: mockDocuments.filter((document) => document.approval_status === "pending").map(getCanonicalDocumentHref),
      assignedActivities: [] as AssignedActivity[],
      notifications: [
        { id: "mock-maintenance-update", title: "Repair needs attention", message: "Review the maintenance queue.", action_url: "/asset-management?view=maintenance" },
        { id: "mock-purchase-update", title: "PR Finance Review required", message: "Review purchase requests.", action_url: "/purchase-requests" },
        { id: "mock-compliance-update", title: "Outlet requirement due", message: "Review outlet compliance.", action_url: "/outlet-compliance" },
        { id: "mock-invoice-update", title: "Supplier invoice due", message: "Review supplier invoices.", action_url: "/supplier-invoices" },
      ],
      announcements: [{ id: "mock-announcement", title: "Operations announcement" }],
    };
  }

  const initialScope = await getCurrentUserScope().catch((error) => {
    logServerWarning(error, { source: "topbar.current-user-scope" });
    return null;
  });
  // Kitchen has no company-wide work queue or announcement feed. Return before
  // querying approvals, production, or notifications that could expose other
  // teams' operational data through the shared application shell.
  if (initialScope?.roleCode === "kitchen") {
    return {
      availability: { pendingActions: true, notifications: true },
      pendingApprovals: [] as PendingAction[],
      attentionHrefs: [] as string[],
      assignedActivities: [] as AssignedActivity[],
      notifications: [],
      announcements: [],
    };
  }

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [documentApprovals, notificationsResult, assignedActivities, workflowPendingActionsResult, canApproveProductionResult, canPostProductionResult, currentScope] = await Promise.all([
    supabase.from("documents").select("id, document_no, title, document_type, related_entity_type, related_entity_id").eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5),
    getVisibleNotificationsForCurrentUser().then((rows) => ({ rows, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.notifications" });
      return { rows: [], unavailable: true };
    }),
    // The complete activity stream belongs to /activity. Resolving actor
    // identities here made every application route wait on an audit-log query.
    Promise.resolve([] as AssignedActivity[]),
    getCurrentUserPendingActionSnapshot(5, true, false, false).then((snapshot) => ({ rows: snapshot.unavailable ? [] : snapshot.items, attentionHrefs: snapshot.unavailable ? [] : snapshot.attentionHrefs, unavailable: snapshot.unavailable })).catch((error) => {
      logServerWarning(error, { source: "topbar.pending-actions" });
      return { rows: [] as PendingAction[], attentionHrefs: [] as string[], unavailable: true };
    }),
    hasPermission("production.approve").then((allowed) => ({ allowed, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.production-approve-permission" });
      return { allowed: false, unavailable: true };
    }),
    hasPermission("production.post").then((allowed) => ({ allowed, unavailable: false })).catch((error) => {
      logServerWarning(error, { source: "topbar.production-post-permission" });
      return { allowed: false, unavailable: true };
    }),
    Promise.resolve(initialScope),
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
  let actionableNotifications = notifications
    .filter((row) => !row.is_company_wide && !row.read_at)
    .map((row) => {
      const repairAction = row.entity_type === "asset_maintenance" && row.entity_id
        ? workflowPendingActions.find((item) => item.id === `maintenance-${row.entity_id}`)
        : undefined;
      return {
        ...row,
        ...(repairAction ? {
          title: `Repair · ${repairAction.maintenance_asset_name ?? "Site problem"} · ${repairAction.branch_name ?? "Location unavailable"}`,
          message: [repairAction.maintenance_priority ? `${repairAction.maintenance_priority} priority` : null, repairAction.maintenance_description?.trim() || repairAction.step || "Open this request to review details"].filter(Boolean).join(" · "),
          action_url: repairAction.href,
        } : { action_url: getCanonicalEntityHref(row.entity_type, row.entity_id, row.action_url ?? "#") }),
      };
    })
    // A workflow item is already represented in "My Pending Actions". Keep
    // the notification feed for events that do not duplicate an actionable
    // queue entry.
    .filter((row) => !pendingActionHrefs.has(row.action_url ?? ""));

  const complianceReminderRoles = new Set(["purchasing", "manager", "finance", "people_operations", "super_admin"]);
  if (currentScope && complianceReminderRoles.has(currentScope.roleCode)) {
    const dueCutoff = new Date();
    dueCutoff.setUTCDate(dueCutoff.getUTCDate() + 30);
    const { count: dueCount, error: dueError } = await supabase.from("compliance_records").select("id", { count: "exact", head: true }).eq("subject_kind", "outlet").is("deleted_at", null).not("expires_on", "is", null).lte("expires_on", dueCutoff.toISOString().slice(0, 10));
    if (dueError) logServerWarning(dueError, { source: "topbar.compliance-reminders" });
    else if ((dueCount ?? 0) > 0) actionableNotifications = [{ id: "outlet-compliance-due", title: `${dueCount} outlet requirement${dueCount === 1 ? "" : "s"} need attention`, message: "Expired or due within 30 days.", action_url: "/outlet-compliance", priority: "high", created_at: new Date().toISOString(), read_at: null, dismissed_at: null, is_company_wide: false, recipient_user_id: null, recipient_staff_id: currentScope.staffId, recipient_role_id: null, branch_id: null, entity_type: "compliance_record", entity_id: null }, ...actionableNotifications];
  }

  const result = {
    availability: {
      pendingActions: !pendingActionsUnavailable,
      notifications: !notificationsResult.unavailable,
    },
    pendingApprovals,
    attentionHrefs: [...new Set([
      ...workflowPendingActionsResult.attentionHrefs,
      ...productionPendingActions.map((item) => item.href),
      ...scopedDocumentPendingActions.map((item) => item.href),
      // The popover is intentionally capped at five notifications. Navigation
      // attention must still include the other visible, actionable notices.
      ...actionableNotifications.map((item) => item.action_url ?? ""),
    ])],
    assignedActivities: assignedActivities as AssignedActivity[],
    notifications: actionableNotifications.slice(0, 5),
    announcements: notifications.filter((row) => row.is_company_wide && !row.read_at).slice(0, 5),
  };
  return result;
}

export function getNavAttentionHrefs(activity: Awaited<ReturnType<typeof getTopBarActivity>>) {
  const hrefs = [
    ...(activity.attentionHrefs ?? []),
    ...(activity.pendingApprovals ?? []).map((item) => item.href),
    ...(activity.notifications ?? []).map((item) => item.action_url ?? ""),
  ];
  const navHrefFor = (href: string): string | null => {
    const path = href.split("?")[0];
    if (path.startsWith("/asset-management")) return "/asset-management";
    if (path.startsWith("/attendance")) return "/attendance";
    if (path.startsWith("/outlet-compliance")) return "/outlet-compliance";
    if (path.startsWith("/purchase-requests")) return "/purchase-requests";
    if (path.startsWith("/purchase-orders")) return "/purchase-orders";
    if (path.startsWith("/supplier-invoices")) return "/supplier-invoices";
    if (path.startsWith("/production/planning")) return "/production/planning";
    if (path.startsWith("/production")) return "/production/jobs";
    if (path.startsWith("/outlet-daily-records")) return "/outlet-daily-records";
    if (path.startsWith("/stock-counts")) return "/stock-counts";
    if (path.startsWith("/stock-balance")) return "/stock-balance";
    if (path.startsWith("/stock-transfers")) return "/stock-transfers";
    if (path.startsWith("/stock-wastage")) return "/stock-wastage";
    if (path.startsWith("/goods-receivings")) return "/goods-receivings";
    return null;
  };
  return [...new Set(hrefs.map(navHrefFor).filter((href): href is string => href !== null))];
}
