import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockDocuments } from "@/lib/mock-mode";
import { getVisibleNotificationsForCurrentUser, getTopBarNotificationScope } from "@/server/queries/notifications";

type AssignedActivity = {
  id: string;
  message: string;
};

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
    supabase.from("activity_logs").select("id, message").order("created_at", { ascending: false }).limit(5),
  ]);

  return {
    pendingApprovals: pendingApprovals.error ? [] : pendingApprovals.data ?? [],
    assignedActivities: recentActivities.error ? [] as AssignedActivity[] : recentActivities.data ?? [],
    notifications: notifications.filter((row) => !row.is_company_wide && !row.read_at).slice(0, 5),
    announcements: notifications.filter((row) => row.is_company_wide && !row.read_at).slice(0, 5),
  };
}
