import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { FilterBarMore } from "@/components/ui/filter-bar";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";

type MasterDataFiltersProps = {
  search?: string;
  status?: string;
  category?: string;
  supplier?: string;
  stockControl?: string;
  lowStock?: string;
  placeholder: string;
  categories?: string[];
  suppliers?: { id: string; name: string }[];
  statuses?: { value: string; label: string }[];
  showStatus?: boolean;
  showStockFilters?: boolean;
  resultCount?: number;
  filtered?: boolean;
  resetHref?: string;
  leadingFilter?: ReactNode;
};

export function MasterDataFilters({
  search,
  status = "all",
  category = "all",
  supplier = "all",
  stockControl = "all",
  lowStock = "all",
  placeholder,
  categories = [],
  suppliers = [],
  statuses = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
  showStatus = true,
  showStockFilters = false,
  resultCount,
  filtered = false,
  resetHref = "?",
  leadingFilter,
}: MasterDataFiltersProps) {
  const compactMobile = Boolean(
    leadingFilter
    && !showStatus
    && !suppliers.length
    && !categories.length
    && !showStockFilters,
  );

  const activeFilterCount = [
    showStatus && status !== "all",
    supplier !== "all",
    category !== "all",
    stockControl !== "all",
    lowStock !== "all",
  ].filter(Boolean).length;

  const controls = (
    <>
      <Input name="search" defaultValue={search ?? ""} placeholder={placeholder} aria-label={placeholder} />
      {leadingFilter}
      {showStatus ? <SelectControl name="status" defaultValue={status} options={[{ value: "all", label: "All statuses" }, ...statuses]} ariaLabel="Status" className="min-w-32 md:w-40" /> : null}
      {suppliers.length ? (
        <SelectControl name="supplier" defaultValue={supplier} options={[{ value: "all", label: "All suppliers" }, ...suppliers.map((row) => ({ value: row.id, label: row.name }))]} ariaLabel="Supplier" className="min-w-36" />
      ) : null}
      {categories.length && !showStockFilters ? <SelectControl name="category" defaultValue={category} options={[{ value: "all", label: "All categories" }, ...categories.map((row) => ({ value: row, label: row }))]} ariaLabel="Category" /> : null}
      {showStockFilters ? <FilterBarMore activeCount={[categories.length && category !== "all", stockControl !== "all", lowStock !== "all"].filter(Boolean).length} resetHref={resetHref}>
        {categories.length ? <SelectControl name="category" defaultValue={category} options={[{ value: "all", label: "All categories" }, ...categories.map((row) => ({ value: row, label: row }))]} ariaLabel="Category" /> : null}
        <SelectControl name="stock_control" defaultValue={stockControl} options={[{ value: "all", label: "All stock control" }, { value: "with_safety_stock", label: "With safety stock" }, { value: "without_safety_stock", label: "Without safety stock" }]} ariaLabel="Stock control" />
        <SelectControl name="low_stock" defaultValue={lowStock} options={[{ value: "all", label: "All stock levels" }, { value: "yes", label: "Low stock only" }, { value: "no", label: "Healthy stock only" }]} ariaLabel="Stock level" />
      </FilterBarMore> : null}
    </>
  );

  return (
    <UnifiedListHeader
      resultCount={resultCount}
      resetHref={resetHref}
      filtered={filtered}
      activeCount={activeFilterCount}
      className={`sb-list-filters--equal-controls${compactMobile ? " sb-list-filters--compact-mobile" : ""}`}
    >
      {controls}

      {filtered ? <Button asChild variant="secondary" className="w-full" data-list-action="secondary"><Link href={resetHref}>Reset</Link></Button> : null}
    </UnifiedListHeader>
  );
}
