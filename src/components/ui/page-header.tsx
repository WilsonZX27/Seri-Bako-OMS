import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceCanvas, type WorkspaceCanvasMode } from "@/components/layout/workspace-layout";

type PageHeaderProps = {
  title: ReactNode;
  description?: string;
  backHref?: string;
  action?: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
  /** Split tablet workspaces expose the same create action in their right rail. */
  hideTabletCreateFab?: boolean;
  /** Aligns the header content with the workspace canvas used by the route. */
  contentWidth?: WorkspaceCanvasMode;
};

export function PageHeader(props: PageHeaderProps) {
  const isCreateAction = Boolean(props.action && /^(new|create)\b/i.test(props.action.label));
  const createFabVisibility = props.hideTabletCreateFab ? "md:hidden xl:hidden" : "xl:hidden";

  return (
    <>
      <header data-page-header className="block border-b border-[var(--sb-border-soft)] bg-[var(--workspace-bg)]">
        <WorkspaceCanvas mode={props.contentWidth ?? "wide"} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            {props.backHref ? <Link href={props.backHref} className="mb-1 block text-[11px] font-medium text-[var(--sb-text-muted)] hover:text-[var(--sb-text)]">← Back</Link> : null}
            <h1 className="min-w-0 text-balance break-words text-[var(--sb-text-page)] font-semibold leading-6 tracking-[-0.015em] text-[var(--sb-text)]">{props.title}</h1>
            {props.description ? <p className="mt-0.5 hidden max-w-2xl text-xs leading-4 text-[var(--sb-text-muted)] sm:block">{props.description}</p> : null}
          </div>
          {props.secondaryAction || (props.action && !isCreateAction) ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {props.secondaryAction ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={props.secondaryAction.href}><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />{props.secondaryAction.label}</Link>
                </Button>
              ) : null}
              {props.action && !isCreateAction ? (
                <Button asChild size="sm">
                  <Link href={props.action.href}><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />{props.action.label}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </WorkspaceCanvas>
      </header>
      {props.secondaryAction || (props.action && !isCreateAction) ? (
        <div data-tablet-page-actions className="flex min-h-12 items-center justify-end gap-2 border-b border-[var(--sb-border-soft)] bg-white px-3 xl:hidden">
          {props.secondaryAction ? <Button asChild variant="outline" size="sm"><Link href={props.secondaryAction.href}><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />{props.secondaryAction.label}</Link></Button> : null}
          {props.action && !isCreateAction ? <Button asChild size="sm"><Link href={props.action.href}><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />{props.action.label}</Link></Button> : null}
        </div>
      ) : null}
      {props.action && isCreateAction ? (
        <Button asChild size="icon" data-page-create-fab data-mobile-create-fab className={`fixed bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--sb-z-sticky)] inline-flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_24px_rgba(10,58,43,0.30)] ${createFabVisibility}`}>
          <Link href={props.action.href} aria-label={props.action.label} title={props.action.label}>
            <Plus className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">{props.action.label}</span>
          </Link>
        </Button>
      ) : null}
    </>
  );
}
