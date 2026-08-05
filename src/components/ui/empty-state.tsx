import type { LucideIcon } from "lucide-react";
import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    href: string;
    label: string;
  };
};

export function EmptyState({ icon: Icon = FolderOpen, title, description, action }: EmptyStateProps) {
  return (
    <div data-empty-state className="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center sm:gap-3 sm:py-10">
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--sb-control-radius)] bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)] sm:h-11 sm:w-11">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-4 text-muted-foreground sm:text-sm">{description}</p>
      </div>
      {action ? (
        <Button asChild size="sm" variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
