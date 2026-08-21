import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { DocumentNumber } from "@/components/document-number";
import { PriorityBadge } from "@/components/priority-badge";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { WorkflowStatusPipeline, type WorkflowStep } from "@/components/workflow-status-pipeline";
import { DocumentMoreOptions, MobileActivityAndFiles, MobileWorkflowStatus } from "@/components/documents/mobile-document-surfaces";
import { DocumentContextSummary } from "@/components/documents/document-context-summary";
import { StatusBadge } from "@/components/ui/status-badge";
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
  mobileContextDate,
  mobileStatusOnly = false,
  hideMobileWorkflow = false,
  hideWorkflow = false,
  compactMobileSpacing = false,
  tabletRailMode = "split",
}: {
  breadcrumbs: Crumb[];
  documentNo: string;
  title?: string | null;
  status: string;
  priority?: string | null;
  branch?: string | null;
  workflowSteps?: WorkflowStep[];
  currentStatus?: string;
  children: ReactNode;
  sidePanel: ReactNode;
  mobilePrimaryAction?: ReactNode;
  mobileActivity?: ReactNode;
  mobileMoreOptions?: ReactNode;
  mobileWorkflowTrailing?: ReactNode;
  mobileContextDate?: string | null;
  mobileStatusOnly?: boolean;
  hideMobileWorkflow?: boolean;
  hideWorkflow?: boolean;
  compactMobileSpacing?: boolean;
  tabletRailMode?: "context" | "split";
}) {
  const isNewDocument = documentNo.toLowerCase().startsWith("new ");
  const resolvedWorkflowSteps = workflowSteps ?? [];
  const resolvedCurrentStatus = currentStatus ?? status;
  const hasLegacyDocumentContext = (!isNewDocument || priority || branch);
  const showDocumentContext = hasLegacyDocumentContext || (isNewDocument && title);

  return (
    <>
      <span data-document-breadcrumb={documentNo} data-document-route-context={breadcrumbs.map((crumb) => crumb.label).join("/")} className="sr-only" aria-hidden="true" />
      <span data-document-context-sentinel className="block h-px" aria-hidden="true" />
      <header data-document-workspace-header className={cn("sticky top-0 z-20 min-w-0 border-b border-[var(--border-muted)] bg-[var(--workspace-bg)] px-3 transition-[padding] duration-200 motion-reduce:transition-none sm:px-4", isNewDocument ? "py-1.5 sm:py-2" : "py-2.5 sm:py-3")}>
        <h1 className="sr-only">{title ?? documentNo}</h1>
        {showDocumentContext ? <div data-tablet-document-header className={cn("flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between", isNewDocument && "hidden md:flex")}>
          <div className="min-w-0">
            <div className={cn("min-w-0", isNewDocument ? "min-h-7" : "flex min-h-8 flex-wrap items-center gap-2")}>
              {isNewDocument ? <DocumentContextSummary title={title} status={status} branch={branch} date={mobileContextDate} mobileStatusOnly={mobileStatusOnly} /> : <>
              {!isNewDocument ? <DocumentNumber value={documentNo} size="lg" className="max-w-[min(100%,18rem)] break-all text-[16px] sm:text-lg" /> : null}
              {priority ? <PriorityBadge priority={priority} /> : null}
              {branch ? <span className="ml-auto hidden min-w-0 items-center justify-end gap-1.5 whitespace-nowrap text-right text-xs text-muted-foreground md:flex"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{branch}</span></span> : null}
              </>}
            </div>
            <div className={cn("hidden flex-wrap items-center gap-2 text-xs text-muted-foreground md:flex", isNewDocument ? "mt-0 md:mt-1" : "mt-1")}>
              {title && !isNewDocument ? <span className="font-medium text-foreground">{title}</span> : null}
            </div>
          </div>
        </div> : null}
        {isNewDocument && hideWorkflow ? <div data-document-status-only className="flex min-h-9 items-center justify-center md:hidden"><StatusBadge status={status} /></div> : null}
        {isNewDocument && !hideWorkflow ? <div className="flex min-h-9 items-center justify-center gap-2 md:hidden"><StatusBadge status={status} /><MobileWorkflowStatus steps={resolvedWorkflowSteps} currentStatus={resolvedCurrentStatus} trailing={mobileWorkflowTrailing} /></div> : null}
        {!hideWorkflow && !hideMobileWorkflow ? <div data-tablet-document-header className={cn("min-w-0", isNewDocument ? "mt-0 md:mt-1" : "mt-1 md:mt-2", isNewDocument && "hidden md:block")}>{!isNewDocument ? <MobileWorkflowStatus steps={resolvedWorkflowSteps} currentStatus={resolvedCurrentStatus} trailing={mobileWorkflowTrailing} /> : null}<div className="hidden md:block"><WorkflowStatusPipeline steps={resolvedWorkflowSteps} currentStatus={resolvedCurrentStatus} compact /></div></div> : null}
        {hideWorkflow && isNewDocument ? <div data-tablet-document-header className="hidden items-center md:flex"><StatusBadge status={status} /></div> : null}
      </header>

      <WorkspaceGrid documentMode tabletRailMode={tabletRailMode} className={cn("min-w-0 p-3", compactMobileSpacing && "pt-0 md:pt-3", mobilePrimaryAction && "pb-20 md:pb-3")} rightRail={sidePanel} hideMobileConsole>
        <div className="min-w-0">
          <div className="min-w-0 space-y-3">
            {children}
            {mobileActivity ? <MobileActivityAndFiles>{mobileActivity}</MobileActivityAndFiles> : null}
          </div>
        </div>
      </WorkspaceGrid>
      {mobilePrimaryAction || mobileMoreOptions ? <div data-mobile-document-action className={cn(
        "sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] grid min-w-0 items-center gap-2 border-x-0 border-b-0 bg-white/95 p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(17,30,22,0.16)] md:hidden [&_button]:h-11 [&_button]:w-full",
        mobilePrimaryAction && mobileMoreOptions ? "grid-cols-[minmax(0,1fr)_minmax(7rem,auto)]" : "grid-cols-1",
      )}>
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
  titleClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <ConsoleSection title={title} titleClassName={titleClassName}>
      <div className={cn("space-y-2", className)}>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {children}
      </div>
    </ConsoleSection>
  );
}

export function DocumentActionSection({ description, children, moreOptions, collapseMoreOptions = false }: { description?: string; children: ReactNode; moreOptions?: ReactNode; collapseMoreOptions?: boolean }) {
  return (
    <DocumentSideSection title="Next action" titleClassName="text-[11px] font-medium tracking-[0.1em]" description={description}>
      <div className="[&_button]:w-full">{children}</div>
      {moreOptions ? <>
        {collapseMoreOptions ? <DocumentMoreOptions defaultOpen={false}>{moreOptions}</DocumentMoreOptions> : <>
          <div className="hidden gap-2 md:grid">{moreOptions}</div>
          <div className="md:hidden"><DocumentMoreOptions>{moreOptions}</DocumentMoreOptions></div>
        </>}
      </> : null}
    </DocumentSideSection>
  );
}
