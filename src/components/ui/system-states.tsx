import type { ReactNode } from "react";
import { AlertTriangle, Ban, CheckCircle2, FileQuestion, LoaderCircle, SearchX, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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

export function PageLoadingState({ label = "Loading workspace..." }: { label?: string }) {
  return (
    <div className="min-h-0 space-y-4 p-3 sm:p-4" aria-live="polite" aria-busy="true">
      <div className="space-y-2 border-b border-[var(--sb-border-soft)] pb-4">
        <div className="h-6 w-48 animate-pulse rounded-[var(--sb-radius-control)] bg-[var(--sb-neutral-bg)]" />
        <div className="h-3 w-72 max-w-[80%] animate-pulse rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)]" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-card" />)}
      </div>
      <div className="grid min-h-[18rem] gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="animate-pulse rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-card p-4">
          <div className="h-4 w-36 rounded-[var(--sb-radius-control)] bg-[var(--sb-neutral-bg)]" />
          <div className="mt-6 grid gap-3">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-12 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)]" />)}
          </div>
        </div>
        <div className="hidden space-y-3 lg:block">
          <div className="h-32 animate-pulse rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-card" />
          <div className="h-40 animate-pulse rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-card" />
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        {label}
      </p>
    </div>
  );
}

export function SectionLoadingState({ label = "Loading..." }: { label?: string }) {
  return <p className="p-3 text-xs text-muted-foreground" aria-live="polite" aria-busy="true">{label}</p>;
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
      <div className="flex flex-col items-start gap-3 rounded-[2px] border border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] p-4 text-[var(--sb-danger)]" role="alert">
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
    <div className={cn("flex items-start gap-2 rounded-[2px] border p-3 text-sm", tones[tone], className)} role={tone === "error" ? "alert" : "status"}>
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
