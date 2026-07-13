"use client";

import { ErrorState } from "@/components/ui/system-states";

export default function PurchaseReturnError() {
  return <ErrorState title="Purchase return not available" description="This return may not exist, or you may not have access to it." action={{ href: "/purchase-returns", label: "Back to returns" }} />;
}
