import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { DocumentNumber } from "@/components/document-number";
import { PriorityBadge } from "@/components/priority-badge";
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
      <header className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 shadow-sm backdrop-blur">
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
              {crumb.href ? <a href={crumb.href} className="hover:text-foreground">{crumb.label}</a> : <span>{crumb.label}</span>}
              {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
            </span>
          ))}
        </nav>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <DocumentNumber value={documentNo} size="lg" />
              {priority ? <PriorityBadge priority={priority} /> : null}
              <StatusBadge status={status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {title ? <span className="font-medium text-foreground">{title}</span> : null}
              {branch ? <span>{branch}</span> : null}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <WorkflowStatusPipeline steps={workflowSteps} currentStatus={currentStatus} compact />
        </div>
      </header>

      <main className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1120px)_400px]">
        <div className="min-w-0 space-y-5">{children}</div>
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-40 xl:max-h-[calc(100vh-11rem)] xl:overflow-y-auto xl:pr-1">
          {sidePanel}
        </aside>
      </main>
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
    <section className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
