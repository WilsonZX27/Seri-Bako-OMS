import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { MobileActionReserve } from "@/components/documents/mobile-action-reserve";

export function AssetFormWorkspace({ children, actions, hint }: { children: ReactNode; actions: ReactNode; hint: string }) {
  return <>
    <WorkspaceGrid documentMode hideMobileConsole tabletRailMode="split" rightRail={<><ConsoleSection title="Actions">{actions}</ConsoleSection><ConsoleSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{hint}</p></ConsoleSection></>}>
      {children}
    </WorkspaceGrid>
    <MobileActionReserve><div data-mobile-document-action data-action-count="1" className="sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] grid gap-2 border-t bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
      <p role="status" className="flex items-start gap-2 rounded-lg border border-[var(--sb-border-soft)] bg-white px-3 py-2 text-[11px] leading-4 text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true"/>{hint}</p>
      {actions}
    </div></MobileActionReserve>
  </>;
}
