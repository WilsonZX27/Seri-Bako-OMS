import { Lightbulb } from "lucide-react";

export function DataGridHint({ text = "Pro-tip: Double-click any row to open the record." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 border-b bg-white px-4 py-2 text-xs text-muted-foreground">
      <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
      <span>{text}</span>
    </div>
  );
}
