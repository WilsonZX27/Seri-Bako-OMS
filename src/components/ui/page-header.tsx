import type { ReactNode } from "react";
import Link from "next/link";
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
  return (
    <>
      <header className="hidden border-b border-[var(--sb-border-soft)] bg-[var(--workspace-bg)] px-4 py-3 xl:block">
        <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-5 text-[var(--sb-text)]">{props.title}</h1>
          {props.description ? <p className="mt-0.5 max-w-2xl text-xs leading-4 text-[var(--sb-text-muted)]">{props.description}</p> : null}
        </div>
        {props.action || props.secondaryAction ? (
          <div className="hidden shrink-0 flex-wrap gap-2">
            {props.secondaryAction ? (
              <Button asChild variant="outline" size="sm">
                <Link href={props.secondaryAction.href}>{props.secondaryAction.label}</Link>
              </Button>
            ) : null}
            {props.action ? (
              <Button asChild size="sm">
                <Link href={props.action.href}>{props.action.label}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        </div>
      </header>
      {props.action || props.secondaryAction ? (
        <div className="flex min-h-12 items-center justify-end gap-2 border-b border-[var(--sb-border-soft)] bg-white px-3 xl:hidden">
          {props.secondaryAction ? <Button asChild variant="ghost" size="sm"><Link href={props.secondaryAction.href}>{props.secondaryAction.label}</Link></Button> : null}
          {props.action ? <Button asChild size="sm"><Link href={props.action.href}>{props.action.label}</Link></Button> : null}
        </div>
      ) : null}
    </>
  );
}
