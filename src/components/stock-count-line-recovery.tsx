"use client";

import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

type ItemOption = { id: string; item_code: string; item_name: string; base_unit: string };

export function StockCountLineRecovery({ action, line, items, reviewMode }: {
  action: (formData: FormData) => void | Promise<void>;
  line: { id: string; item_id: string; physical_qty: number; uom: string };
  items: ItemOption[];
  reviewMode: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"update" | "replace" | "remove">("update");
  const [key] = useState(() => crypto.randomUUID());
  return <>
    <Button type="button" variant="ghost" size="icon" aria-label="Edit this stock count line" onClick={() => dialogRef.current?.showModal()}><Pencil className="h-4 w-4" /></Button>
    <dialog ref={dialogRef} className="m-0 ml-auto h-full max-h-none w-full max-w-md border-l border-[var(--sb-border)] bg-white p-0 backdrop:bg-black/20">
      <form action={action} className="flex h-full flex-col" onSubmit={() => dialogRef.current?.close()}>
        <input type="hidden" name="line_id" value={line.id} /><input type="hidden" name="revision_action" value={mode} /><input type="hidden" name="idempotency_key" value={key} />
        <header className="border-b p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Guided resolution</p><h2 className="mt-1 text-lg font-semibold">{reviewMode ? "Propose a line correction" : "Edit count line"}</h2><p className="mt-1 text-sm text-muted-foreground">The original values remain in revision history. Only posting waits for unresolved proposals.</p></header>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Change type">{(["update","replace","remove"] as const).map((value) => <Button key={value} type="button" variant={mode === value ? "default" : "outline"} onClick={() => setMode(value)}>{value[0].toUpperCase()+value.slice(1)}</Button>)}</div>
          {mode !== "remove" ? <>
            <label className="block text-sm font-medium">Item<select name="item_id" defaultValue={line.item_id} disabled={mode !== "replace"} className="mt-1 h-10 w-full rounded-md border bg-white px-3 disabled:bg-secondary">{items.map((item) => <option key={item.id} value={item.id}>{item.item_code} — {item.item_name}</option>)}</select></label>
            <label className="block text-sm font-medium">Physical quantity<Input name="quantity" type="number" min="0" step="0.0001" defaultValue={line.physical_qty} required className="mt-1" /></label>
            <label className="block text-sm font-medium">UOM<Input name="uom" defaultValue={line.uom} required className="mt-1" /></label>
          </> : <p className="border-l-2 border-[var(--sb-warning)] pl-3 text-sm">This excludes the line from this count only. It does not delete Item Master or inventory history.</p>}
          <label className="block text-sm font-medium">Reason<Input name="reason" minLength={3} required placeholder="What changed and why?" className="mt-1" /></label>
        </div>
        <footer className="grid grid-cols-2 gap-2 border-t p-4"><Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>Cancel</Button><SubmitButton pendingLabel="Saving…">{reviewMode ? "Submit proposal" : "Apply change"}</SubmitButton></footer>
      </form>
    </dialog>
  </>;
}
