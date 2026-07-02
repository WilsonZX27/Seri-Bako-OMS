import { createClient } from "@/lib/supabase/server";
import { isMockMode } from "@/lib/mock-mode";
import type { Database } from "@/types/database";

type CurrentUserScope = {
  authUserId: string;
  staffId: string | null;
  roleIds: string[];
  branchIds: string[];
  roleCode: string;
};

export async function getCurrentUserScope(): Promise<CurrentUserScope | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase.from("staffs").select("id, auth_user_id").eq("auth_user_id", user.id).maybeSingle();
  const staffId = staff?.id ?? null;

  if (!staffId) {
    return {
      authUserId: user.id,
      staffId: null,
      roleIds: [],
      branchIds: [],
      roleCode: "viewer",
    };
  }

  const [{ data: staffRoles }, { data: staffBranches }, { data: roles }] = await Promise.all([
    supabase.from("staff_roles").select("role_id").eq("staff_id", staffId),
    supabase.from("staff_branches").select("branch_id").eq("staff_id", staffId),
    supabase.from("roles").select("id, role_code"),
  ]);

  const roleIds = (staffRoles ?? []).map((row) => row.role_id);
  const branchIds = (staffBranches ?? []).map((row) => row.branch_id);
  const roleById = new Map((roles ?? []).map((row) => [row.id, row.role_code]));
  const roleCode = roleIds.map((id) => roleById.get(id)).find(Boolean) ?? "viewer";

  return { authUserId: user.id, staffId, roleIds, branchIds, roleCode };
}

export async function getVisibleNotificationsForCurrentUser() {
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
        "id, title, message, action_url, priority, created_at, read_at, dismissed_at, is_company_wide, recipient_user_id, recipient_staff_id, recipient_role_id, branch_id",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    scope.staffId
      ? recipientQuery.or(`recipient_user_id.eq.${scope.authUserId},recipient_staff_id.eq.${scope.staffId}`).limit(80)
      : recipientQuery.eq("recipient_user_id", scope.authUserId).limit(80),
  ]);

  if (notificationsResult.error || recipientsResult.error) return [];

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

  return (notificationsResult.data ?? [])
    .filter((notification) => {
      const personalRecipient = recipientByNotificationId.get(notification.id);
      const effectiveDismissedAt = personalRecipient?.dismissed_at ?? notification.dismissed_at;
      if (effectiveDismissedAt) return false;
      if (personalRecipient) return true;
      if (notification.recipient_user_id && notification.recipient_user_id === scope.authUserId) return true;
      if (notification.recipient_staff_id && scope.staffId && notification.recipient_staff_id === scope.staffId) return true;
      if (notification.recipient_role_id && scope.roleIds.includes(notification.recipient_role_id)) return true;
      if (notification.branch_id && scope.branchIds.includes(notification.branch_id)) return true;
      if (notification.is_company_wide) return true;
      return false;
    })
    .map((notification) => {
      const personalRecipient = recipientByNotificationId.get(notification.id);
      return {
        ...notification,
        message: notification.message ?? "",
        read_at: personalRecipient?.read_at ?? notification.read_at,
        dismissed_at: personalRecipient?.dismissed_at ?? notification.dismissed_at,
      };
    });
}

export async function getTopBarNotificationScope() {
  const scope = await getCurrentUserScope();
  return scope;
}
