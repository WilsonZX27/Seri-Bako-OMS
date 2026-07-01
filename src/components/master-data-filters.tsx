import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";

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
}: MasterDataFiltersProps) {
  return (
    <form className="grid gap-3 border-b bg-card p-4 md:grid-cols-2 lg:grid-cols-6">
      <Input name="search" defaultValue={search ?? ""} placeholder={placeholder} className="md:max-w-sm" />
      <SelectNative name="status" defaultValue={status} className="md:w-40">
        <option value="all">All status</option>
        {statuses.map((row) => (
          <option key={row.value} value={row.value}>
            {row.label}
          </option>
        ))}
      </SelectNative>
      {categories.length ? (
        <SelectNative name="category" defaultValue={category}>
          <option value="all">All categories</option>
          {categories.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </SelectNative>
      ) : null}
      {suppliers.length ? (
        <SelectNative name="supplier" defaultValue={supplier}>
          <option value="all">All suppliers</option>
          {suppliers.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </SelectNative>
      ) : null}
      {showStockFilters ? (
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
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Button asChild variant="ghost">
          <a href="?">Reset</a>
        </Button>
      </div>
    </form>
  );
}
