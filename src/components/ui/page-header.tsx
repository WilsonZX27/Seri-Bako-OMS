import Link from "next/link";
import type { ReactNode } from "react";
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

export function PageHeader({ title, description, action, secondaryAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 border-b bg-card px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[17px] font-semibold tracking-normal">{title}</h1>
        {description ? <p className="mt-0.5 max-w-3xl text-[11px] text-muted-foreground">{description}</p> : null}
      </div>
      {action || secondaryAction ? (
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {secondaryAction ? (
            <Button asChild variant="outline" size="sm">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
          {action ? (
            <Button asChild size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
