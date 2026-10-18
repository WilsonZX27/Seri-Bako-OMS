import type { ReactNode } from "react";
import { AssetActionFeedback } from "@/components/asset-action-feedback";
import { AssetUnsavedGuard } from "@/components/asset-unsaved-guard";
import { getCurrentProfile } from "@/server/queries/common";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
export default async function AssetLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile?.company_id || !profile.id) redirect("/login");
  const authUser = "auth_user_id" in profile ? profile.auth_user_id : isMockMode() ? "local-mock" : null;
  if (!authUser) redirect("/login");
  const draftScope = `${profile.company_id}:${profile.id}:${authUser}`;
  return <AssetUnsavedGuard key={draftScope} draftScope={draftScope}><AssetActionFeedback>{children}</AssetActionFeedback></AssetUnsavedGuard>;
}
