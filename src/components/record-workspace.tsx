import type { ReactNode } from "react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/system-states";
import { cn } from "@/lib/utils";

type RecordWorkspaceProps = {
  children: ReactNode;
  actionPanel: ReactNode;
  className?: string;
  tabletRailBreakpoint?: "md" | "lg";
};

export function RecordWorkspace({ children, actionPanel, className, tabletRailBreakpoint = "md" }: RecordWorkspaceProps) {
  return (
    <WorkspaceGrid documentMode tabletRailMode="split" tabletRailBreakpoint={tabletRailBreakpoint} className={cn("p-4", className)} rightRail={<div className="min-w-0">{actionPanel}</div>}>
      <main className="min-w-0 space-y-4">{children}</main>
    </WorkspaceGrid>
  );
}

export function RecordActionPanel({ title = "Actions", description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <ConsoleSection title={title}>
      <div className="space-y-3">
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        {children}
      </div>
    </ConsoleSection>
  );
}

export function RecordSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-[14px]">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="p-3 pt-2">{children}</CardContent>
    </Card>
  );
}

export function DangerActionSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Notice tone="error" title={title}>
      {description ? <p className="text-sm">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </Notice>
  );
}
