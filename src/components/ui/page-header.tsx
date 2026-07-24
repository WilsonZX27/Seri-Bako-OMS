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
    <header className="border-b border-[var(--sb-border-soft)] bg-[var(--workspace-bg)] px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-5 text-[var(--sb-text)] sm:text-lg">{props.title}</h1>
          {props.description ? <p className="mt-0.5 max-w-2xl text-xs leading-4 text-[var(--sb-text-muted)]">{props.description}</p> : null}
        </div>
        {props.action || props.secondaryAction ? (
          <div className="grid shrink-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap">
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
  );
}
