import type { ReactNode } from "react";
import { Notice } from "@/components/ui/system-states";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { MobileActionReserve } from "@/components/documents/mobile-action-reserve";

export function AssetFormWorkspace({ children, actions, hint }: { children: ReactNode; actions: ReactNode; hint: string }) {
  return <>
    <WorkspaceGrid documentMode hideMobileConsole tabletRailMode="split" rightRail={<><ConsoleSection title="Actions">{actions}</ConsoleSection><ConsoleSection title="Next step"><Notice>{hint}</Notice></ConsoleSection></>}>
      {children}
    </WorkspaceGrid>
    <MobileActionReserve><div data-mobile-document-action data-action-count="1" className="sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] grid gap-2 border-t bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <Notice>{hint}</Notice>
      {actions}
    </div></MobileActionReserve>
  </>;
}
