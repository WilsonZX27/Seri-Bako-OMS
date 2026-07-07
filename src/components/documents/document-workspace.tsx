import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
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
  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-2 shadow-sm backdrop-blur">
        <nav className="mb-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
              {crumb.href ? <a href={crumb.href} className="hover:text-foreground">{crumb.label}</a> : <span>{crumb.label}</span>}
              {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
            </span>
          ))}
        </nav>
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
