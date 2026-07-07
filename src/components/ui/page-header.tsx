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

export function PageHeader({ action, secondaryAction }: PageHeaderProps) {
  if (!action && !secondaryAction) return null;

  return (
    <div className="flex justify-end gap-2 border-b bg-card px-4 py-1.5">
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
  );
}
