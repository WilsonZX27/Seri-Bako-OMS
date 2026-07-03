import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockDocuments } from "@/lib/mock-mode";
import { actorDisplayName, formatActivityWithActor, resolveActorDisplayMap } from "@/server/actors/display";
import { getVisibleNotificationsForCurrentUser, getTopBarNotificationScope } from "@/server/queries/notifications";

type AssignedActivity = {
  id: string;
  message: string;
  created_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
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
      pendingApprovals: mockDocuments.filter((document) => document.approval_status === "pending").slice(0, 5),
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
  const [pendingApprovals, notifications, recentActivities] = await Promise.all([
    scope.roleCode === "admin" || scope.roleCode === "finance"
      ? supabase.from("documents").select("id, document_no, title").eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5)
      : scope.staffId
        ? supabase.from("documents").select("id, document_no, title").eq("created_by", scope.staffId).eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: [], error: null }),
    getVisibleNotificationsForCurrentUser(),
    supabase.from("activity_logs").select("id, entity_type, activity_type, message, created_at, created_by").order("created_at", { ascending: false }).limit(40),
  ]);

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
    pendingApprovals: pendingApprovals.error ? [] : pendingApprovals.data ?? [],
    assignedActivities: assignedActivities as AssignedActivity[],
    notifications: notifications.filter((row) => !row.is_company_wide && !row.read_at).slice(0, 5),
    announcements: notifications.filter((row) => row.is_company_wide && !row.read_at).slice(0, 5),
  };
}
