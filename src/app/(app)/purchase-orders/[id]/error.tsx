"use client";

import { ErrorState } from "@/components/ui/system-states";

export default function PurchaseOrderDetailError() {
  return <ErrorState title="Purchase order not available" description="This order may not exist, or you may not have access to it." action={{ href: "/purchase-orders", label: "Back to purchase orders" }} />;
}
