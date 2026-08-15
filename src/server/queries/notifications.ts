import { createClient } from "@/lib/supabase/server";
import { todayInKualaLumpur } from "@/lib/business-date";
import { isMockMode } from "@/lib/mock-mode";
import type { Database } from "@/types/database";
import type { PurchaseRequestStatus } from "@/lib/status-contracts";
import { hasCompanyWideOperationalScope } from "@/lib/roles";
import { getCanonicalEntityHref } from "@/lib/document-routing";
import { actorDisplayName, formatActivityWithActor, resolveActorDisplayMap } from "@/server/actors/display";
import { cache } from "react";

export type CurrentUserScope = {
  authUserId: string;
  staffId: string | null;
  roleIds: string[];
  branchIds: string[];
  roleCode: string;
  companyWideAccess: boolean;
};

export const getCurrentUserScope = cache(async function getCurrentUserScope(): Promise<CurrentUserScope | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff, error: staffError } = await supabase.from("staffs").select("id, auth_user_id").eq("auth_user_id", user.id).maybeSingle();
  if (staffError) throw new Error(staffError.message);
  const staffId = staff?.id ?? null;

  if (!staffId) {
    return {
      authUserId: user.id,
      staffId: null,
      roleIds: [],
      branchIds: [],
      roleCode: "outlet_staff",
      companyWideAccess: false,
    };
  }

  const today = todayInKualaLumpur();
  const [staffRolesResult, staffBranchesResult, rolesResult] = await Promise.all([
    supabase.from("staff_roles").select("role_id, branch_id, is_primary, effective_from").eq("staff_id", staffId).lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`),
    supabase.from("staff_branches").select("branch_id").eq("staff_id", staffId),
    supabase.from("roles").select("id, role_code"),
  ]);
  for (const result of [staffRolesResult, staffBranchesResult, rolesResult]) {
    if (result.error) throw new Error(result.error.message);
  }
  const staffRoles = staffRolesResult.data;
  const staffBranches = staffBranchesResult.data;
  const roles = rolesResult.data;

  const activeRoles = [...(staffRoles ?? [])].sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
  const roleIds = activeRoles.map((row) => row.role_id);
  const branchIds = (staffBranches ?? []).map((row) => row.branch_id);
  const roleById = new Map((roles ?? []).map((row) => [row.id, row.role_code]));
  const roleCode = roleIds.map((id) => roleById.get(id)).find(Boolean) ?? "outlet_staff";
  const companyWideAccess = hasCompanyWideOperationalScope(roleCode);

  return { authUserId: user.id, staffId, roleIds, branchIds, roleCode, companyWideAccess };
});

export const getVisibleNotificationsForCurrentUser = cache(async function getVisibleNotificationsForCurrentUser() {
  if (isMockMode()) {
    return [];
  }

  const scope = await getCurrentUserScope();
  if (!scope) return [];

  const supabase = await createClient();
  const recipientQuery = supabase
    .from("notification_recipients")
    .select("notification_id, read_at, dismissed_at, recipient_user_id, recipient_staff_id")
    .order("created_at", { ascending: false });

  const [notificationsResult, recipientsResult] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, title, message, action_url, priority, created_at, read_at, dismissed_at, is_company_wide, recipient_user_id, recipient_staff_id, recipient_role_id, branch_id, entity_type, entity_id",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    scope.staffId
      ? recipientQuery.or(`recipient_user_id.eq.${scope.authUserId},recipient_staff_id.eq.${scope.staffId}`).limit(80)
      : recipientQuery.eq("recipient_user_id", scope.authUserId).limit(80),
  ]);

  if (notificationsResult.error) throw new Error(notificationsResult.error.message);
  if (recipientsResult.error) throw new Error(recipientsResult.error.message);

  const recipientByNotificationId = new Map<
    string,
    Pick<
      Database["public"]["Tables"]["notification_recipients"]["Row"],
      "notification_id" | "read_at" | "dismissed_at" | "recipient_user_id" | "recipient_staff_id"
    >
  >();
  for (const recipient of recipientsResult.data ?? []) {
    if (!recipientByNotificationId.has(recipient.notification_id)) {
      recipientByNotificationId.set(recipient.notification_id, recipient);
    }
  }

  const visibleNotifications = (notificationsResult.data ?? [])
    .filter((notification) => {
      const personalRecipient = recipientByNotificationId.get(notification.id);
      const effectiveDismissedAt = personalRecipient?.dismissed_at ?? notification.dismissed_at;
      if (effectiveDismissedAt) return false;
      if (notification.branch_id && !scope.companyWideAccess && !scope.branchIds.includes(notification.branch_id)) return false;
      const hasExplicitRecipient = Boolean(notification.recipient_user_id || notification.recipient_staff_id || notification.recipient_role_id || personalRecipient);
      if (hasExplicitRecipient) {
        return Boolean(
          personalRecipient
          || (notification.recipient_user_id && notification.recipient_user_id === scope.authUserId)
          || (notification.recipient_staff_id && scope.staffId && notification.recipient_staff_id === scope.staffId)
          || (notification.recipient_role_id && scope.roleIds.includes(notification.recipient_role_id)),
        );
      }
      if (notification.branch_id && scope.branchIds.includes(notification.branch_id)) return true;
      if (notification.is_company_wide) return true;
      return false;
    })
    .map((notification) => {
      const personalRecipient = recipientByNotificationId.get(notification.id);
      const actionUrl = getCanonicalEntityHref(notification.entity_type, notification.entity_id, notification.action_url ?? "");
      return {
        ...notification,
        message: notification.message ?? "",
        action_url: actionUrl.startsWith("/") ? actionUrl : null,
        read_at: personalRecipient?.read_at ?? notification.read_at,
        dismissed_at: personalRecipient?.dismissed_at ?? notification.dismissed_at,
      };
    })
    .filter((notification) => notification.is_company_wide || notification.action_url);

  const pendingPrStatusesByRole: Record<string, PurchaseRequestStatus[]> = {
    super_admin: ["manager_review", "admin_review", "finance_review", "ready_to_convert"],
    manager: ["manager_review"],
    purchasing: ["admin_review", "ready_to_convert"],
    finance: ["finance_review"],
  };
  const allowedPrStatuses = pendingPrStatusesByRole[scope.roleCode];
  const prIds = visibleNotifications.flatMap((row) => row.entity_type === "purchase_request" && row.entity_id ? [row.entity_id] : []);
  const stockCountIds = visibleNotifications.flatMap((row) => row.entity_type === "stock_count" && row.entity_id ? [row.entity_id] : []);
  const [pendingRequestsResult, activeStockCountsResult] = await Promise.all([
    allowedPrStatuses && prIds.length
      ? supabase.from("purchase_requests").select("id, status").in("id", prIds).in("status", allowedPrStatuses)
      : Promise.resolve({ data: [], error: null }),
    stockCountIds.length
      ? supabase.from("stock_counts").select("id, status").in("id", stockCountIds).is("deleted_at", null).in("status", ["draft", "submitted", "reviewed", "approved"])
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (pendingRequestsResult.error) throw new Error(pendingRequestsResult.error.message);
  if (activeStockCountsResult.error) throw new Error(activeStockCountsResult.error.message);
  const pendingPrIds = new Set((pendingRequestsResult.data ?? []).map((row) => row.id));
  const pendingIds = pendingPrIds;
  const activeStockCountIds = new Set((activeStockCountsResult.data ?? []).map((row) => row.id));
  return visibleNotifications.filter((row) => {
    if (row.entity_type === "purchase_request") return Boolean(row.entity_id && pendingIds.has(row.entity_id));
    if (row.entity_type === "stock_count") return Boolean(row.entity_id && activeStockCountIds.has(row.entity_id));
    return true;
  });
});

const activityEntitiesByRole = {
  super_admin: null,
  finance: ["document", "purchase_request", "purchase_order", "goods_receiving", "supplier_invoice", "payment", "stock_transaction", "supplier", "item", "branch", "staff", "document_sequence"],
  manager: ["document", "purchase_request", "purchase_order", "goods_receiving", "purchase_return", "production_job", "outlet_daily_record", "stock_transaction", "stock_count", "stock_transfer", "stock_wastage"],
  purchasing: ["document", "purchase_request", "purchase_order", "goods_receiving", "purchase_return", "supplier", "supplier_item", "item", "import"],
  kitchen: ["document", "purchase_request", "goods_receiving", "production_job", "stock_transaction", "stock_count", "stock_transfer", "stock_wastage"],
  outlet_staff: ["outlet_daily_record"],
} satisfies Record<string, readonly string[] | null>;

const protectedActivityEntities = new Set(["company", "role", "backup"]);

export async function getVisibleRecentActivitiesForCurrentUser(limit = 6) {
  const scope = await getCurrentUserScope();
  if (!scope) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, entity_type, entity_id, activity_type, created_by, message, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit * 2, 24), 100));
  if (error) throw new Error(error.message);

  const allowedEntities = activityEntitiesByRole[scope.roleCode as keyof typeof activityEntitiesByRole] ?? [];
  const visible = (data ?? []).filter((activity) => {
    if (scope.roleCode === "super_admin") return true;
    if (protectedActivityEntities.has(activity.entity_type)) return false;
    if (activity.created_by && scope.staffId && activity.created_by === scope.staffId) return true;
    if (!allowedEntities?.includes(activity.entity_type)) return false;
    // Activity rows have no branch_id. Lower roles only receive their own rows here; branch-targeted updates come from notifications.
    return scope.companyWideAccess;
  }).slice(0, limit);

  const displayMap = await resolveActorDisplayMap(visible.map((activity) => activity.created_by));
  return visible.map((activity) => {
    const createdByName = actorDisplayName(displayMap, activity.created_by);
    return {
      ...activity,
      created_by_name: createdByName,
      message: formatActivityWithActor(activity.message, createdByName),
      href: getCanonicalEntityHref(activity.entity_type, activity.entity_id, ""),
    };
  });
}

export async function getTopBarNotificationScope() {
  const scope = await getCurrentUserScope();
  return scope;
}
