import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RecordWorkspaceProps = {
  children: ReactNode;
  actionPanel: ReactNode;
  className?: string;
};

export function RecordWorkspace({ children, actionPanel, className }: RecordWorkspaceProps) {
  return (
    <WorkspaceGrid className={cn("p-4", className)} rightRail={<div className="space-y-3">{actionPanel}</div>}>
      <main className="min-w-0 space-y-4">{children}</main>
    </WorkspaceGrid>
  );
}

export function RecordMain({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function RecordActionPanel({ title = "Actions", description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-[14px]">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 p-3">{children}</CardContent>
    </Card>
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
    <Card className={cn("shadow-sm", className)}>
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-red-700" />
        <div>
          <p className="font-semibold text-red-800">{title}</p>
          {description ? <p className="mt-1 text-sm text-red-700">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
