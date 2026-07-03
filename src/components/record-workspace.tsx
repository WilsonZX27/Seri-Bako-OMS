import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RecordWorkspaceProps = {
  children: ReactNode;
  actionPanel: ReactNode;
  className?: string;
};

export function RecordWorkspace({ children, actionPanel, className }: RecordWorkspaceProps) {
  return (
    <div className={cn("grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_380px]", className)}>
      <main className="min-w-0 space-y-5">{children}</main>
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">{actionPanel}</aside>
    </div>
  );
}

export function RecordMain({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function RecordActionPanel({ title = "Actions", description, children }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
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
