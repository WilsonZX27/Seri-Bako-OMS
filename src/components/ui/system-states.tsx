import type { ReactNode } from "react";
import { AlertTriangle, Ban, CheckCircle2, FileQuestion, SearchX, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { cn } from "@/lib/utils";

type StateAction = { href: string; label: string } | ReactNode;

function renderAction(action?: StateAction) {
  if (!action) return null;
  if (typeof action === "object" && "href" in action) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return action;
}

type PageLoadingVariant = "list" | "detail" | "form";

function LoadingCanvas({ variant }: { variant: PageLoadingVariant }) {
  if (variant === "detail") return <div className="space-y-3" data-loading-variant="detail">
    <div className="sb-work-surface p-3"><div className="sb-skeleton h-9 w-full" /></div>
    <div className="sb-work-surface divide-y divide-[var(--sb-border-soft)]">{[0, 1, 2].map((row) => <div key={row} className="grid gap-3 p-3 sm:grid-cols-3"><div className="sb-skeleton h-12 sm:col-span-2" /><div className="sb-skeleton h-12" /></div>)}</div>
  </div>;
  if (variant === "form") return <div className="space-y-3" data-loading-variant="form">
    <div className="sb-work-surface grid gap-3 p-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, field) => <div key={field} className="space-y-2"><div className="sb-skeleton h-3 w-24" /><div className="sb-skeleton h-9 w-full" /></div>)}</div>
    <div className="sb-work-surface h-40" />
  </div>;
  return <div className="space-y-3" data-loading-variant="list">
    <div className="sb-work-surface flex gap-3 p-3" data-loading-query-surface><div className="sb-skeleton h-9 min-w-0 flex-1" /><div className="sb-skeleton h-9 w-28" /></div>
    <div className="sb-work-surface overflow-hidden">
    <div className="divide-y divide-[var(--sb-border-soft)]">{[0, 1, 2, 3, 4].map((row) => <div key={row} className="flex items-center gap-3 p-3"><div className="sb-skeleton h-8 w-8 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><div className="sb-skeleton h-3 w-2/5" /><div className="sb-skeleton h-3 w-3/5" /></div><div className="sb-skeleton h-7 w-20" /></div>)}</div>
    </div>
  </div>;
}

export function PageLoadingState({ label = "Loading workspace...", variant = "list" }: { label?: string; variant?: PageLoadingVariant }) {
  const rightRail = <>
    <section className="sb-work-surface space-y-2 p-3" aria-label="Loading page actions"><div className="sb-skeleton h-9 w-full" /><div className="sb-skeleton h-9 w-full" /></section>
    <section className="sb-work-surface space-y-2 p-3" aria-label="Loading page summary"><div className="sb-skeleton h-3 w-full" /><div className="sb-skeleton h-3 w-4/5" /><div className="sb-skeleton h-3 w-2/3" /></section>
  </>;
  return (
    <div aria-live="polite" aria-busy="true" data-page-loading-state>
      <span className="sr-only" role="status">{label}</span>
      <div className="border-b border-[var(--sb-border-soft)] bg-[var(--workspace-bg)]" aria-hidden="true">
        <div className="sb-workspace-canvas space-y-2 py-3" data-workspace-canvas data-canvas-mode="wide">
          <div className="sb-skeleton h-5 w-44" />
          <div className="sb-skeleton h-3 w-72 max-w-full" />
        </div>
      </div>
      <WorkspaceGrid tabletCanvas="wide" tabletRailBreakpoint="lg" hideMobileConsole rightRail={rightRail}>
      <div className="relative min-h-72" aria-hidden="true"><LoadingCanvas variant={variant} /></div>
      </WorkspaceGrid>
    </div>
  );
}

export function SectionLoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="space-y-2 p-3" aria-live="polite" aria-busy="true"><span className="sr-only">{label}</span><div className="sb-skeleton h-3 w-2/5" /><div className="sb-skeleton h-3 w-4/5" /><div className="sb-skeleton h-3 w-3/5" /></div>;
}

export function ErrorState({
  title = "This page could not load",
  description = "Try again. If the problem continues, contact the Super Admin / Owner.",
  action,
}: {
  title?: string;
  description?: string;
  action?: StateAction;
}) {
  return (
    <div className="p-4">
      <div className="flex flex-col items-start gap-3 rounded-[var(--sb-radius-control)] border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] p-4 text-[var(--sb-danger)]" role="alert">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 max-w-prose text-sm">{description}</p>
        </div>
        {renderAction(action)}
      </div>
    </div>
  );
}

export function NotFoundState({ title, description, action }: { title: string; description: string; action: StateAction }) {
  return (
    <div className="p-4">
      <div className="flex flex-col items-center justify-center gap-3 border bg-card px-4 py-10 text-center">
        <FileQuestion className="h-8 w-8 text-[var(--sb-neutral-text)]" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {renderAction(action)}
      </div>
    </div>
  );
}

export function PermissionDeniedState({ action }: { action?: StateAction }) {
  return (
    <ErrorState
      title="Permission required"
      description="You do not have access to this page or action. Return to a page you can use, or contact the Super Admin / Owner."
      action={action ?? { href: "/dashboard", label: "Back to dashboard" }}
    />
  );
}

export function NoResultsState({ action }: { action?: StateAction }) {
  return (
    <NotFoundState
      title="No records match these filters"
      description="Clear filters or widen the search to see more records."
      action={action ?? { href: "?", label: "Clear filters" }}
    />
  );
}

export function Notice({ tone = "info", title, children, className }: { tone?: "success" | "warning" | "error" | "info"; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    success: "border-[var(--sb-success)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]",
    warning: "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]",
    error: "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]",
    info: "border-[var(--sb-info)] bg-[var(--sb-info-bg)] text-[var(--sb-info)]",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? Ban : tone === "warning" ? ShieldAlert : AlertTriangle;
  return (
    <div className={cn("flex items-start gap-2 rounded-[var(--sb-radius-control)] border p-3 text-sm", tones[tone], className)} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function FormErrorSummary({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <Notice tone="error" title="Review these fields">
      <ul className="list-disc space-y-1 pl-4">
        {errors.map((error) => <li key={error}>{error}</li>)}
      </ul>
    </Notice>
  );
}

export function InlineFieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return <p id={id} className="text-xs text-[var(--sb-danger)]" role="alert">{children}</p>;
}

export function EmptyTimelineState({ children = "No activity recorded yet." }: { children?: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

export function EmptyAttachmentState({ children = "No attachments added." }: { children?: ReactNode }) {
  return <p className="p-3 text-center text-xs text-muted-foreground">{children}</p>;
}

export function EmptySearchState() {
  return (
    <div className="flex items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
      <SearchX className="h-4 w-4" />
      No results match this search.
    </div>
  );
}
