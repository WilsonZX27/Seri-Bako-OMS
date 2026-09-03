"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Option = { id: string; full_name?: string; staff_code?: string | null; branch_name?: string };

export function MappingAdmin({ staffs, branches, people, devices }: { staffs: Option[]; branches: Option[]; people: Array<Record<string, unknown>>; devices: Array<Record<string, unknown>> }) {
  const [message, setMessage] = useState("");

  async function submit(kind: "person" | "device", form: HTMLFormElement) {
    const data = new FormData(form);
    const body = kind === "person"
      ? { kind, personId: data.get("personId"), staffId: data.get("staffId"), active: true }
      : { kind, sourceCode: data.get("sourceCode"), branchId: data.get("branchId"), active: true };
    const response = await fetch("/api/attendance/mappings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { ok: boolean; message?: string };
    setMessage(result.ok ? "Mapping saved." : result.message ?? "Mapping failed.");
    if (result.ok) window.location.reload();
  }

  return <section className="grid items-start gap-4 lg:grid-cols-2">
    <div className="sb-work-surface p-4">
      <h2 className="text-sm font-semibold">NGTeco Person ID <ArrowRight className="mx-1 inline h-3.5 w-3.5" aria-hidden="true" /> OMS employee</h2>
      <p className="mt-1 text-xs text-muted-foreground">Link the Person ID printed in the NGTeco export to the staff member who owns those punches.</p>
      <form className="mt-4 grid items-end gap-2 sm:grid-cols-[1fr_1.5fr_auto]" onSubmit={(event) => { event.preventDefault(); void submit("person", event.currentTarget); }}>
        <label className="grid gap-1 text-xs font-medium">NGTeco Person ID<Input name="personId" required maxLength={100} placeholder="e.g. 1024" /></label>
        <label className="grid gap-1 text-xs font-medium">OMS employee<select name="staffId" required className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select employee</option>{staffs.map((staff) => <option key={staff.id} value={staff.id}>{staff.full_name} · {staff.staff_code ?? "no code"}</option>)}</select></label>
        <Button type="submit">Link</Button>
      </form>
      <div className="mt-4 divide-y text-xs">{people.map((row) => { const staff = row.staffs as { full_name?: string } | null; return <div key={String(row.id)} className="flex justify-between gap-3 py-2"><span className="font-mono">{String(row.person_id)}</span><span>{staff?.full_name ?? "Unknown staff"}</span></div>; })}{!people.length ? <p className="py-3 text-muted-foreground">No Person IDs linked yet.</p> : null}</div>
    </div>
    <div className="sb-work-surface p-4">
      <h2 className="text-sm font-semibold">NGTeco Source <ArrowRight className="mx-1 inline h-3.5 w-3.5" aria-hidden="true" /> Outlet</h2>
      <p className="mt-1 text-xs text-muted-foreground">Link the Source value in the export to the outlet where that device is installed.</p>
      <form className="mt-4 grid items-end gap-2 sm:grid-cols-[1fr_1.5fr_auto]" onSubmit={(event) => { event.preventDefault(); void submit("device", event.currentTarget); }}>
        <label className="grid gap-1 text-xs font-medium">NGTeco Source<Input name="sourceCode" required maxLength={100} placeholder="e.g. Main Door" /></label>
        <label className="grid gap-1 text-xs font-medium">Outlet<select name="branchId" required className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select outlet</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</select></label>
        <Button type="submit">Link</Button>
      </form>
      <div className="mt-4 divide-y text-xs">{devices.map((row) => { const branch = row.branches as { branch_name?: string } | null; return <div key={String(row.id)} className="flex justify-between gap-3 py-2"><span className="font-mono">{String(row.source_code)}</span><span>{branch?.branch_name ?? "Unknown outlet"}</span></div>; })}{!devices.length ? <p className="py-3 text-muted-foreground">No device sources linked yet.</p> : null}</div>
    </div>
    {message ? <p className="text-xs text-muted-foreground lg:col-span-2" role="status">{message}</p> : null}
  </section>;
}
