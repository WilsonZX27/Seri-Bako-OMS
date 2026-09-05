"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; branch_name?: string };

export function MappingAdmin({ branches, devices }: { branches: Option[]; devices: Array<Record<string, unknown>> }) {
  const [message, setMessage] = useState("");

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = { kind: "device", sourceCode: data.get("sourceCode"), branchId: data.get("branchId"), active: true };
    const response = await fetch("/api/attendance/mappings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { ok: boolean; message?: string };
    setMessage(result.ok ? "Mapping saved." : result.message ?? "Mapping failed.");
    if (result.ok) window.location.reload();
  }

  return <section className="min-w-0">
    <div className="sb-work-surface p-4">
      <h2 className="text-sm font-semibold">NGTeco Source <ArrowRight className="mx-1 inline h-3.5 w-3.5" aria-hidden="true" /> Outlet</h2>
      <p className="mt-1 text-xs text-muted-foreground">Link the Source value in the export to the outlet where that device is installed.</p>
      <form className="mt-4 grid min-w-0 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
        <label className="grid gap-1 text-xs font-medium">NGTeco Source<Input name="sourceCode" required maxLength={100} /></label>
        <label className="grid gap-1 text-xs font-medium">Outlet<select name="branchId" required className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select outlet</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</select></label>
        <Button type="submit" className="h-10 min-w-20 px-4">Link</Button>
      </form>
      <div className="mt-4 divide-y text-xs">{devices.map((row) => { const branch = row.branches as { branch_name?: string } | null; return <div key={String(row.id)} className="flex justify-between gap-3 py-2"><span className="font-mono">{String(row.source_code)}</span><span>{branch?.branch_name ?? "Unknown outlet"}</span></div>; })}{!devices.length ? <p className="py-3 text-muted-foreground">No device sources linked yet.</p> : null}</div>
    </div>
    {message ? <p className="mt-3 text-xs text-muted-foreground" role="status">{message}</p> : null}
  </section>;
}
