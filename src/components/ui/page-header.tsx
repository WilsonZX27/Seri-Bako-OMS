import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: ReactNode;
  description?: string;
  action?: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

export function PageHeader(props: PageHeaderProps) {
  const isCreateAction = Boolean(props.action && /^(new|create)\b/i.test(props.action.label));

  return (
    <>
      <header className="hidden border-b border-[var(--sb-border-soft)] bg-[var(--workspace-bg)] px-4 py-3 xl:block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold leading-5 text-[var(--sb-text)]">{props.title}</h1>
            {props.description ? <p className="mt-0.5 max-w-2xl text-xs leading-4 text-[var(--sb-text-muted)]">{props.description}</p> : null}
          </div>
          {props.secondaryAction || (props.action && !isCreateAction) ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {props.secondaryAction ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={props.secondaryAction.href}>{props.secondaryAction.label}</Link>
                </Button>
              ) : null}
              {props.action && !isCreateAction ? (
                <Button asChild size="sm">
                  <Link href={props.action.href}>{props.action.label}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      {props.secondaryAction || (props.action && !isCreateAction) ? (
        <div data-tablet-page-actions className="flex min-h-12 items-center justify-end gap-2 border-b border-[var(--sb-border-soft)] bg-white px-3 xl:hidden">
          {props.secondaryAction ? <Button asChild variant="outline" size="sm"><Link href={props.secondaryAction.href}>{props.secondaryAction.label}</Link></Button> : null}
          {props.action && !isCreateAction ? <Button asChild size="sm"><Link href={props.action.href}>{props.action.label}</Link></Button> : null}
        </div>
      ) : null}
      {props.action && isCreateAction ? (
        <Button asChild size="icon" data-page-create-fab data-mobile-create-fab className="fixed bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--sb-z-sticky)] h-14 w-14 rounded-full shadow-[0_3px_8px_rgb(6_44_31_/_0.22)] xl:hidden">
          <Link href={props.action.href} aria-label={props.action.label} title={props.action.label}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{props.action.label}</span>
          </Link>
        </Button>
      ) : null}
    </>
  );
}
