"use client";

import { useMemo, useState } from "react";
import { createComplianceRecord } from "@/server/actions/compliance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";

type TypeOption = {
  id: string;
  type_name: string;
  subject_kind: "outlet" | "staff" | "asset";
};

export function ComplianceCreateForm({
  types,
  branches,
  staffs,
}: {
  types: TypeOption[];
  branches: Array<{ id: string; branch_name: string }>;
  staffs: Array<{ id: string; full_name: string }>;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const kind = useMemo(
    () => types.find((type) => type.id === typeId)?.subject_kind ?? "outlet",
    [typeId, types],
  );
  return (
    <form action={createComplianceRecord} className="grid gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-xs font-medium">
        Record type
        <SelectControl
          name="compliance_type_id"
          value={typeId}
          onValueChange={setTypeId}
          ariaLabel="Record type"
          className="mt-1"
          required
          options={types.map((type) => ({
            value: type.id,
            label: type.type_name,
          }))}
        />
      </label>
      <input type="hidden" name="subject_kind" value={kind} />
      {kind === "outlet" ? (
        <label className="min-w-0 text-xs font-medium">
          Outlet
          <SelectControl
            name="branch_id"
            ariaLabel="Outlet"
            placeholder="Choose outlet"
            startEmpty
            className="mt-1"
            required
            searchable
            options={branches.map((branch) => ({
              value: branch.id,
              label: branch.branch_name,
            }))}
          />
        </label>
      ) : null}
      {kind === "staff" ? (
        <label className="min-w-0 text-xs font-medium">
          Staff
          <SelectControl
            name="staff_id"
            ariaLabel="Staff"
            placeholder="Choose staff"
            startEmpty
            className="mt-1"
            required
            searchable
            options={staffs.map((staff) => ({
              value: staff.id,
              label: staff.full_name,
            }))}
          />
        </label>
      ) : null}
      {kind === "asset" ? (
        <label className="min-w-0 text-xs font-medium">
          AMS asset reference
          <Input
            name="asset_external_ref"
            className="mt-1"
            required
            placeholder="Existing asset ID"
          />
        </label>
      ) : null}
      <label className="min-w-0 text-xs font-medium">
        Display name
        <Input
          name="subject_label"
          className="mt-1"
          required
          placeholder={
            kind === "staff"
              ? "Staff name"
              : kind === "outlet"
                ? "Outlet name"
                : "Asset name"
          }
        />
      </label>
      <label className="min-w-0 text-xs font-medium">
        Reference number
        <Input
          name="reference_no"
          className="mt-1"
          placeholder="License or permit number"
        />
      </label>
      <label className="min-w-0 text-xs font-medium">
        Issued on
        <Input name="issued_on" type="date" className="mt-1" />
      </label>
      <label className="min-w-0 text-xs font-medium">
        Expires on
        <Input name="expires_on" type="date" className="mt-1" />
      </label>
      <label className="min-w-0 text-xs font-medium">
        Responsible owner
        <SelectControl
          name="responsible_staff_id"
          defaultValue="none"
          emptyValue="none"
          ariaLabel="Responsible owner"
          className="mt-1"
          searchable
          options={[
            { value: "none", label: "Unassigned" },
            ...staffs.map((staff) => ({
              value: staff.id,
              label: staff.full_name,
            })),
          ]}
        />
      </label>
      <label className="min-w-0 text-xs font-medium">
        Supporting document
        <Input
          name="file"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="mt-1 file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
        />
      </label>
      <label className="min-w-0 text-xs font-medium sm:col-span-2">
        Operational note
        <Input
          name="notes"
          className="mt-1"
          placeholder="Renewal context only; do not enter medical details."
        />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit">Save draft</Button>
        <label className="flex items-center gap-2 text-xs font-medium">
          <input type="checkbox" name="submit_for_review" value="1" /> Submit
          for review
        </label>
      </div>
    </form>
  );
}
