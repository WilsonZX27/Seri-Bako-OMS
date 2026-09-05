"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type SupplierOption = {
  id: string;
  name: string;
  supplier_code: string | null;
  supplier_group?: string | null;
};

function optionLabel(supplier: SupplierOption) {
  const displayGroup = supplier.supplier_group ?? supplier.supplier_code;
  return displayGroup ? `${displayGroup} - ${supplier.name}` : supplier.name;
}

export function SupplierCombobox({ suppliers, initialSupplierId }: { suppliers: SupplierOption[]; initialSupplierId?: string | null }) {
  const initialSupplier = suppliers.find((supplier) => supplier.id === initialSupplierId);
  const [query, setQuery] = useState(initialSupplier ? optionLabel(initialSupplier) : "");
  const [supplierId, setSupplierId] = useState(initialSupplierId ?? "");
  const labels = useMemo(() => new Map(suppliers.map((supplier) => [optionLabel(supplier), supplier.id])), [suppliers]);
  const hasExactMatch = !query || labels.has(query);

  return (
    <div className="min-w-0">
      <input type="hidden" name="supplier_id" value={supplierId} />
      <Input
        list="item-supplier-options"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          setQuery(value);
          setSupplierId(labels.get(value) ?? "");
        }}
        placeholder="Search supplier code or name"
        autoComplete="off"
        aria-describedby={query && !hasExactMatch ? "supplier-selection-help" : undefined}
      />
      <datalist id="item-supplier-options">
        {suppliers.map((supplier) => <option key={supplier.id} value={optionLabel(supplier)} />)}
      </datalist>
      {query && !hasExactMatch ? <p id="supplier-selection-help" className="mt-1 text-xs text-muted-foreground">No matching active supplier. Choose a listed result or clear the field.</p> : null}
    </div>
  );
}
