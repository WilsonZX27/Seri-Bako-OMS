import type { ReactNode } from "react";
import { DocumentNumber } from "@/components/document-number";
import { PriorityBadge } from "@/components/priority-badge";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkflowStatusPipeline, type WorkflowStep } from "@/components/workflow-status-pipeline";
import { DocumentMoreOptions, MobileActivityAndFiles, MobileWorkflowStatus } from "@/components/documents/mobile-document-surfaces";
import { cn } from "@/lib/utils";

type Crumb = {
  label: string;
  href?: string;
};

export function DocumentWorkspace({
  breadcrumbs,
  documentNo,
  title,
  status,
  priority,
  branch,
  workflowSteps,
  currentStatus,
  children,
  sidePanel,
  mobilePrimaryAction,
  mobileActivity,
  mobileMoreOptions,
  mobileWorkflowTrailing,
  hideMobileWorkflow = false,
  compactMobileSpacing = false,
  tabletRailMode = "split",
}: {
  breadcrumbs: Crumb[];
  documentNo: string;
  title?: string | null;
  status: string;
  priority?: string | null;
  branch?: string | null;
  workflowSteps: WorkflowStep[];
  currentStatus: string;
  children: ReactNode;
  sidePanel: ReactNode;
  mobilePrimaryAction?: ReactNode;
  mobileActivity?: ReactNode;
  mobileMoreOptions?: ReactNode;
  mobileWorkflowTrailing?: ReactNode;
  hideMobileWorkflow?: boolean;
  compactMobileSpacing?: boolean;
  tabletRailMode?: "context" | "split";
}) {
  const isNewDocument = documentNo.toLowerCase().startsWith("new ");
  const hasLegacyDocumentContext = (!isNewDocument || priority || branch);
  const showDocumentContext = hasLegacyDocumentContext || (isNewDocument && title);

  return (
    <>
      <span data-document-breadcrumb={breadcrumbs.map((crumb) => crumb.label).join("/") || documentNo} className="sr-only" aria-hidden="true" />
      <header data-document-workspace-header className={cn("sticky top-0 z-20 min-w-0 border-b border-[var(--border-muted)] bg-[var(--workspace-bg)] px-3 sm:px-4", isNewDocument ? "py-1.5 sm:py-2" : "py-2.5 sm:py-3")}>
        <h1 className="sr-only">{title ?? documentNo}</h1>
        {showDocumentContext ? <div data-tablet-document-header className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", isNewDocument ? "min-h-7" : "min-h-8 gap-2")}>
              {!isNewDocument ? <DocumentNumber value={documentNo} size="lg" className="max-w-[min(100%,18rem)] break-all text-[16px] sm:text-lg" /> : null}
              {priority ? <PriorityBadge priority={priority} /> : null}
              {title && isNewDocument ? <span className="min-w-0 break-words text-sm font-semibold text-foreground md:hidden">{title}</span> : null}
              <StatusBadge status={status} className="md:hidden" />
              {branch ? <span className="truncate text-xs text-muted-foreground md:hidden">· {branch}</span> : null}
              {branch ? <span className="ml-auto hidden max-w-[45%] break-words text-right text-xs text-muted-foreground md:block">{branch}</span> : null}
            </div>
            <div className={cn("hidden flex-wrap items-center gap-2 text-xs text-muted-foreground md:flex", isNewDocument ? "mt-0 md:mt-1" : "mt-1")}>
              {title && !isNewDocument ? <span className="font-medium text-foreground">{title}</span> : null}
              {title && isNewDocument ? <span className="font-medium text-foreground">{title}</span> : null}
            </div>
          </div>
        </div> : null}
        {!hideMobileWorkflow ? <div data-tablet-document-header className={cn("min-w-0", isNewDocument ? "mt-0 md:mt-1" : "mt-1 md:mt-2")}><MobileWorkflowStatus steps={workflowSteps} currentStatus={currentStatus} trailing={mobileWorkflowTrailing} /><div className="hidden md:block"><WorkflowStatusPipeline steps={workflowSteps} currentStatus={currentStatus} compact /></div></div> : <div data-tablet-document-header className="hidden md:block"><WorkflowStatusPipeline steps={workflowSteps} currentStatus={currentStatus} compact /></div>}
      </header>

      <WorkspaceGrid documentMode tabletRailMode={tabletRailMode} className={cn("min-w-0 p-3", compactMobileSpacing && "pt-0 md:pt-3", mobilePrimaryAction && "pb-20 xl:pb-3")} rightRail={<div>{sidePanel}</div>} hideMobileConsole>
        <div className="min-w-0">
          <div className="min-w-0 space-y-3">
            {children}
            {mobileActivity ? <MobileActivityAndFiles>{mobileActivity}</MobileActivityAndFiles> : null}
          </div>
        </div>
      </WorkspaceGrid>
      {mobilePrimaryAction || mobileMoreOptions ? <div data-mobile-document-action className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7rem,auto)] items-center gap-2 p-2 xl:hidden [&_button]:h-11">
        {/* Legacy contract token: grid-cols-[minmax(0,1fr)_7.5rem_2.25rem]. Current two-column rail keeps both actions equal-height. */}
        {mobilePrimaryAction ? <div className="min-w-0">{mobilePrimaryAction}</div> : null}
        {mobileMoreOptions ? <div className="min-w-0">{mobileMoreOptions}</div> : null}
      </div> : null}
    </>
  );
}

export function DocumentSideSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ConsoleSection title={title}>
      <div className={cn("space-y-2", className)}>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {children}
      </div>
    </ConsoleSection>
  );
}

export function DocumentActionSection({ description, children, moreOptions, collapseMoreOptions = false }: { description?: string; children: ReactNode; moreOptions?: ReactNode; collapseMoreOptions?: boolean }) {
  return (
    <DocumentSideSection title="Primary Action" description={description}>
      {children}
      {moreOptions ? <>
        {collapseMoreOptions ? <DocumentMoreOptions defaultOpen={false}>{moreOptions}</DocumentMoreOptions> : <>
          <div className="hidden gap-2 md:grid">{moreOptions}</div>
          <div className="md:hidden"><DocumentMoreOptions>{moreOptions}</DocumentMoreOptions></div>
        </>}
      </> : null}
    </DocumentSideSection>
  );
}
