"use client";

import { Columns3, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function TableToolbar({ tableKey, columns }: { tableKey: string; columns: string[] }) {
  const storageKey = `seri-bako-table-${tableKey}`;
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    setHidden(JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]);
  }, [storageKey]);

  function toggle(column: string) {
    const next = hidden.includes(column) ? hidden.filter((item) => item !== column) : [...hidden, column];
    setHidden(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function reset() {
    setHidden([]);
    window.localStorage.removeItem(storageKey);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Columns3 className="h-4 w-4" />
        Columns
      </div>
      {columns.map((column) => (
        <Button key={column} type="button" variant={hidden.includes(column) ? "outline" : "secondary"} size="sm" onClick={() => toggle(column)}>
          {column}
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
    </div>
  );
}
