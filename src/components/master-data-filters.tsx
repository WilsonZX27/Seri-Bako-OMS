import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";

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
  showStockFilters?: boolean;
  resultCount?: number;
  filtered?: boolean;
  resetHref?: string;
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
  showStockFilters = false,
  resultCount,
  filtered = false,
  resetHref = "?",
}: MasterDataFiltersProps) {
  return (
    <FilterBar resultCount={resultCount} resetHref={resetHref} filtered={filtered}>
      <Input name="search" defaultValue={search ?? ""} placeholder={placeholder} />
        <SelectNative name="status" defaultValue={status} className="min-w-32 md:w-40">
          <option value="all">All status</option>
          {statuses.map((row) => (
            <option key={row.value} value={row.value}>{row.label}</option>
          ))}
        </SelectNative>
        {suppliers.length ? (
          <SelectNative name="supplier" defaultValue={supplier} className="min-w-36">
            <option value="all">All suppliers</option>
            {suppliers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </SelectNative>
        ) : null}
        {categories.length && !showStockFilters ? <SelectNative name="category" defaultValue={category}><option value="all">All categories</option>{categories.map((row) => <option key={row} value={row}>{row}</option>)}</SelectNative> : null}
        {showStockFilters ? <FilterBarMore activeCount={[categories.length && category !== "all", stockControl !== "all", lowStock !== "all"].filter(Boolean).length} resetHref={resetHref}>
          {categories.length ? <SelectNative name="category" defaultValue={category}><option value="all">All categories</option>{categories.map((row) => <option key={row} value={row}>{row}</option>)}</SelectNative> : null}
          <>
          <SelectNative name="stock_control" defaultValue={stockControl}>
            <option value="all">All stock control</option>
            <option value="with_safety_stock">With safety stock</option>
            <option value="without_safety_stock">Without safety stock</option>
          </SelectNative>
          <SelectNative name="low_stock" defaultValue={lowStock}>
            <option value="all">All stock levels</option>
            <option value="yes">Low stock only</option>
            <option value="no">Healthy stock only</option>
          </SelectNative>
          </>
        </FilterBarMore> : null}
        <Button type="submit">
          Search
        </Button>
    </FilterBar>
  );
}
