import type { ReactNode } from "react";
import { DocumentNumber } from "@/components/document-number";
import { PriorityBadge } from "@/components/priority-badge";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { WorkflowStatusPipeline, type WorkflowStep } from "@/components/workflow-status-pipeline";
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
}) {
  void _breadcrumbs;

  return (
    <>
      <span data-document-breadcrumb={documentNo} className="sr-only" aria-hidden="true" />
      <header className="sticky top-0 z-20 border-b border-[var(--border-muted)] bg-[var(--workspace-bg)] px-4 py-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DocumentNumber value={documentNo} size="lg" />
              {priority ? <PriorityBadge priority={priority} /> : null}
              <StatusBadge status={status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {title ? <span className="font-medium text-foreground">{title}</span> : null}
              {branch ? <span>{branch}</span> : null}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <WorkflowStatusPipeline steps={workflowSteps} currentStatus={currentStatus} compact />
        </div>
      </header>

      <WorkspaceGrid className="p-3" rightRail={<div>{sidePanel}</div>}>
        <div className="min-w-0 space-y-3">{children}</div>
      </WorkspaceGrid>
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
