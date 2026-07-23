import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, icon: Icon, tone = "primary" }: { label: string; value: string | number; icon: LucideIcon; tone?: "primary" | "accent" | "warning" }) {
  const color = tone === "accent" ? "text-accent" : tone === "warning" ? "text-[var(--sb-warning)]" : "text-primary";
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </CardContent>
    </Card>
  );
}
