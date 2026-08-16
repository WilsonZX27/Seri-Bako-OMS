import Link from "next/link";
import { ArrowRight, Download, Link2, Plus, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const icons = {
  create: Plus,
  import: Upload,
  export: Download,
  assign: Link2,
  open: ArrowRight,
} as const;

export function ConsoleActionLink({
  href,
  kind,
  children,
  primary = false,
}: {
  href: string;
  kind: keyof typeof icons;
  children: ReactNode;
  primary?: boolean;
}) {
  const Icon = icons[kind];
  return (
    <Button
      asChild
      variant={primary ? "default" : "outline"}
      size="sm"
      className="w-full"
      data-mobile-primary-action={primary || undefined}
    >
      <Link href={href}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {children}
      </Link>
    </Button>
  );
}
