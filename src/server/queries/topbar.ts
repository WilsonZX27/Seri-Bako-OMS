import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockDocuments } from "@/lib/mock-mode";

export async function getTopBarActivity() {
  if (isMockMode()) {
    return {
      pendingApprovals: mockDocuments.filter((document) => document.approval_status === "pending").slice(0, 5),
      activities: [
        { id: "activity-1", message: "PR review waiting for Purchasing", created_at: "2026-07-02T09:00:00.000Z" },
      ],
      notifications: [],
    };
  }

  const supabase = await createClient();
  const [pendingApprovals, activities] = await Promise.all([
    supabase.from("documents").select("id, document_no, title").eq("approval_status", "pending").order("updated_at", { ascending: false }).limit(5),
    supabase.from("activity_logs").select("id, message, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  return {
    pendingApprovals: pendingApprovals.error ? [] : pendingApprovals.data ?? [],
    activities: activities.error ? [] : activities.data ?? [],
    notifications: [],
  };
}
