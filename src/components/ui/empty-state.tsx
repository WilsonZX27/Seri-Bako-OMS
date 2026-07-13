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
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-[2px] bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <Button asChild size="sm" variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
