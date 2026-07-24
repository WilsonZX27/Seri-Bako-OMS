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
  breadcrumbs: _breadcrumbs,
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
}) {
  void _breadcrumbs;

  return (
    <>
      <span data-document-breadcrumb={documentNo} className="sr-only" aria-hidden="true" />
      <header className="sticky top-0 z-20 min-w-0 border-b border-[var(--border-muted)] bg-[var(--workspace-bg)] px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DocumentNumber value={documentNo} size="lg" className="max-w-full break-all text-[16px] sm:text-lg" />
              {priority ? <PriorityBadge priority={priority} /> : null}
              <StatusBadge status={status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {title ? <span className="font-medium text-foreground">{title}</span> : null}
              {branch ? <span>{branch}</span> : null}
            </div>
          </div>
        </div>
        <div className="mt-2 min-w-0">
          <MobileWorkflowStatus steps={workflowSteps} currentStatus={currentStatus} />
          <div className="hidden md:block"><WorkflowStatusPipeline steps={workflowSteps} currentStatus={currentStatus} compact /></div>
        </div>
      </header>

      <WorkspaceGrid className={cn("min-w-0 p-3", mobilePrimaryAction && "pb-20 xl:pb-3")} rightRail={<div>{sidePanel}</div>} hideMobileConsole>
        <div className="min-w-0">
          <div className="min-w-0 space-y-3">
            {children}
            {mobileActivity ? <MobileActivityAndFiles>{mobileActivity}</MobileActivityAndFiles> : null}
            {mobileMoreOptions ? <div className="md:hidden">{mobileMoreOptions}</div> : null}
          </div>
        </div>
      </WorkspaceGrid>
      {mobilePrimaryAction ? <div data-mobile-document-action className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] min-w-0 p-2 xl:hidden [&>*]:w-full">{mobilePrimaryAction}</div> : null}
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

export function DocumentActionSection({ description, children, moreOptions }: { description?: string; children: ReactNode; moreOptions?: ReactNode }) {
  return (
    <DocumentSideSection title="Primary Action" description={description}>
      {children}
      {moreOptions ? <DocumentMoreOptions>{moreOptions}</DocumentMoreOptions> : null}
    </DocumentSideSection>
  );
}
