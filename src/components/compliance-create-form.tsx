"use client";

import { useMemo, useState } from "react";
import { createComplianceRecord } from "@/server/actions/compliance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TypeOption = { id: string; type_name: string; subject_kind: "outlet" | "staff" | "asset" };

export function ComplianceCreateForm({ types, branches, staffs }: { types: TypeOption[]; branches: Array<{ id: string; branch_name: string }>; staffs: Array<{ id: string; full_name: string }> }) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const kind = useMemo(() => types.find((type) => type.id === typeId)?.subject_kind ?? "outlet", [typeId, types]);
  const control = "h-[var(--sb-control-height)] w-full min-w-0 rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white px-2.5 text-sm";
  return <form action={createComplianceRecord} className="grid gap-3 sm:grid-cols-2">
    <label className="min-w-0 text-xs font-medium">Record type<select name="compliance_type_id" value={typeId} onChange={(event) => setTypeId(event.target.value)} className={`${control} mt-1`} required>{types.map((type) => <option key={type.id} value={type.id}>{type.type_name}</option>)}</select></label>
    <input type="hidden" name="subject_kind" value={kind} />
    {kind === "outlet" ? <label className="min-w-0 text-xs font-medium">Outlet<select name="branch_id" className={`${control} mt-1`} required><option value="">Choose outlet</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</select></label> : null}
    {kind === "staff" ? <label className="min-w-0 text-xs font-medium">Staff<select name="staff_id" className={`${control} mt-1`} required><option value="">Choose staff</option>{staffs.map((staff) => <option key={staff.id} value={staff.id}>{staff.full_name}</option>)}</select></label> : null}
    {kind === "asset" ? <label className="min-w-0 text-xs font-medium">AMS asset reference<Input name="asset_external_ref" className="mt-1" required placeholder="Existing asset ID" /></label> : null}
    <label className="min-w-0 text-xs font-medium">Display name<Input name="subject_label" className="mt-1" required placeholder={kind === "staff" ? "Staff name" : kind === "outlet" ? "Outlet name" : "Asset name"} /></label>
    <label className="min-w-0 text-xs font-medium">Reference number<Input name="reference_no" className="mt-1" placeholder="License or permit number" /></label>
    <label className="min-w-0 text-xs font-medium">Issued on<Input name="issued_on" type="date" className="mt-1" /></label>
    <label className="min-w-0 text-xs font-medium">Expires on<Input name="expires_on" type="date" className="mt-1" /></label>
    <label className="min-w-0 text-xs font-medium">Responsible owner<select name="responsible_staff_id" className={`${control} mt-1`}><option value="">Unassigned</option>{staffs.map((staff) => <option key={staff.id} value={staff.id}>{staff.full_name}</option>)}</select></label>
    <label className="min-w-0 text-xs font-medium">Supporting document<Input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="mt-1 file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold" /></label>
    <label className="min-w-0 text-xs font-medium sm:col-span-2">Operational note<Input name="notes" className="mt-1" placeholder="Renewal context only; do not enter medical details." /></label>
    <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Button type="submit">Save draft</Button><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" name="submit_for_review" value="1" /> Submit for review</label></div>
  </form>;
}
