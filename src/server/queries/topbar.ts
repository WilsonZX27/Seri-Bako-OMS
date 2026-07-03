import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCanonicalDocumentHref, getCanonicalEntityHref } from "@/lib/document-routing";
import { isMockMode, mockDocuments } from "@/lib/mock-mode";
import { actorDisplayName, formatActivityWithActor, resolveActorDisplayMap } from "@/server/actors/display";
import { hasPermission } from "@/server/auth/permissions";
import { getVisibleNotificationsForCurrentUser, getTopBarNotificationScope } from "@/server/queries/notifications";
import type { PurchaseRequestStatus } from "@/types/database";

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
};

const activityEntityAllowlist = {
  admin: ["document", "stock_transaction", "supplier", "supplier_item", "import", "item"],
  super_admin: ["document", "stock_transaction", "supplier", "supplier_item", "import", "item", "branch", "company", "location", "role", "staff", "document_sequence"],
  operations_admin: ["document", "stock_transaction", "supplier", "supplier_item", "import", "item", "branch", "company", "location", "staff"],
  manager: ["document", "stock_transaction", "supplier", "supplier_item", "import", "item"],
  finance: ["document", "stock_transaction", "supplier", "supplier_item", "import"],
  purchasing: ["document", "supplier", "supplier_item", "item", "import"],
  kitchen: ["document", "stock_transaction", "item"],
  kitchen_staff: ["document", "stock_transaction", "item"],
  viewer: [],
} satisfies Record<string, string[]>;

const adminOnlyActivityTypes = new Set(["archived", "restored", "invite_resent", "staff_updated", "staff_invited"]);
const adminOnlyEntityTypes = new Set(["branch", "company", "location", "role", "staff", "document_sequence"]);

function canSeeActivity(
  scope: NonNullable<Awaited<ReturnType<typeof getTopBarNotificationScope>>>,
  activity: { entity_type: string; activity_type: string; created_by: string | null },
) {
  if (["admin", "super_admin", "operations_admin"].includes(scope.roleCode)) return true;
  if (activity.created_by && scope.staffId && activity.created_by === scope.staffId) return true;
  if (adminOnlyEntityTypes.has(activity.entity_type) || adminOnlyActivityTypes.has(activity.activity_type)) return false;
  const allowedEntityTypes = new Set(activityEntityAllowlist[scope.roleCode as keyof typeof activityEntityAllowlist] ?? []);
  if (["kitchen", "kitchen_staff"].includes(scope.roleCode)) {
    return allowedEntityTypes.has(activity.entity_type) && ["created", "submitted", "approved", "posted", "cancelled", "rejected", "barcode_scanned", "unknown_barcode_scanned", "item_counted_via_barcode", "barcode_workflow_line_saved"].includes(activity.activity_type);
  }
  if (scope.roleCode === "purchasing") return allowedEntityTypes.has(activity.entity_type);
  if (scope.roleCode === "finance") return allowedEntityTypes.has(activity.entity_type);
  if (scope.roleCode === "manager") return allowedEntityTypes.has(activity.entity_type);
  return false;
}

export async function getTopBarActivity() {
  if (isMockMode()) {
    return {
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

  const scope = await getTopBarNotificationScope();
  if (!scope) {
    return { pendingApprovals: [], assignedActivities: [] as AssignedActivity[], notifications: [], announcements: [] };
  }

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [documentApprovals, notifications, recentActivities, canAdminReview, canPurchasingReview, canManagerApprove, canConvertPo, canViewAll, canApproveProduction, canPostProduction] = await Promise.all([
    supabase.from("documents").select("id, document_no, title, document_type, related_entity_type, related_entity_id").eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5),
    getVisibleNotificationsForCurrentUser(),
    supabase.from("activity_logs").select("id, entity_type, activity_type, message, created_at, created_by").order("created_at", { ascending: false }).limit(40),
    hasPermission("pr.admin_review"),
    hasPermission("pr.purchasing_review"),
    hasPermission("pr.manager_approve"),
    hasPermission("pr.convert_to_po"),
    hasPermission("pr.view_all"),
    hasPermission("production.approve"),
    hasPermission("production.post"),
  ]);

  const prStatusFilters: Array<{ status: PurchaseRequestStatus; allowed: boolean; label: string }> = [
    { status: "admin_review", allowed: canAdminReview, label: "Admin Review required" },
    { status: "purchasing_review", allowed: canPurchasingReview, label: "Purchasing Review required" },
    { status: "pending_approval", allowed: canManagerApprove, label: "Manager Approval required" },
    { status: "approved", allowed: canConvertPo, label: "Convert to PO" },
  ];

  const pendingPrResults = await Promise.all(
    prStatusFilters
      .filter((filter) => filter.allowed)
      .map(async (filter) => {
        let query = supabase
          .from("purchase_requests")
          .select("id, request_no, branch_id, updated_at")
          .eq("status", filter.status)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(5);
        if (!canViewAll && scope.branchIds.length) query = query.in("branch_id", scope.branchIds);
        if (!canViewAll && !scope.branchIds.length) return [] as PendingAction[];
        const { data, error } = await query;
        if (error) return [] as PendingAction[];
        return (data ?? []).map((row) => ({
          id: `pr-${filter.status}-${row.id}`,
          document_no: row.request_no,
          title: filter.label,
          href: `/purchase-requests/${row.id}`,
        }));
      }),
  );

  const documentPendingActions: PendingAction[] = documentApprovals.error
    ? []
    : (documentApprovals.data ?? []).map((document) => ({
        id: document.id,
        document_no: document.document_no,
        title: document.title,
        href: getCanonicalDocumentHref(document),
      }));

  const productionPendingActions: PendingAction[] = [];
  if (canApproveProduction || canPostProduction) {
    const productionStatuses = [
      ...(canApproveProduction ? [{ status: "submitted", label: "Production approval required" }] : []),
      ...(canPostProduction ? [{ status: "approved", label: "Ready to post production" }] : []),
    ];
    for (const filter of productionStatuses) {
      const { data } = await db
        .from("production_jobs")
        .select("id, production_job_no, branch_id, updated_at")
        .eq("status", filter.status)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5);
      productionPendingActions.push(...((data ?? []) as Array<{ id: string; production_job_no: string }>).map((row) => ({
        id: `prod-${filter.status}-${row.id}`,
        document_no: row.production_job_no,
        title: filter.label,
        href: `/production/jobs/${row.id}`,
      })));
    }
  }

  const pendingApprovals = [...pendingPrResults.flat(), ...productionPendingActions, ...documentPendingActions]
    .filter((item, index, rows) => rows.findIndex((row) => row.href === item.href) === index)
    .slice(0, 5);

  const activityRows = recentActivities.error ? [] : (recentActivities.data ?? []).filter((activity) => canSeeActivity(scope, activity)).slice(0, 5);
  const displayMap = await resolveActorDisplayMap(activityRows.map((row) => row.created_by));
  const assignedActivities = activityRows.map((row) => {
    const createdByName = actorDisplayName(displayMap, row.created_by);
    return {
      ...row,
      created_by_name: createdByName,
      message: formatActivityWithActor(row.message, createdByName),
    };
  });

  return {
    pendingApprovals,
    assignedActivities: assignedActivities as AssignedActivity[],
    notifications: notifications
      .filter((row) => !row.is_company_wide && !row.read_at)
      .map((row) => ({
        ...row,
        action_url: getCanonicalEntityHref(row.entity_type, row.entity_id, row.action_url ?? "#"),
      }))
      .slice(0, 5),
    announcements: notifications.filter((row) => row.is_company_wide && !row.read_at).slice(0, 5),
  };
}
