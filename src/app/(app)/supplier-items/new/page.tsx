import { SupplierItemForm } from "@/components/master-data-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createSupplierItem } from "@/server/actions/master-data";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";

export default async function NewSupplierItemPage() {
  const [suppliers, items] = await Promise.all([getSuppliersForSelect(), getItemsForSelect()]);
  return (
    <>
      <PageHeader title="New Supplier Item" description="Map supplier product codes and purchasing UOM to Seri Bako Item Master." />
      <div className="p-5">
        <SupplierItemForm suppliers={suppliers} items={items} action={createSupplierItem} />
      </div>
    </>
  );
}
