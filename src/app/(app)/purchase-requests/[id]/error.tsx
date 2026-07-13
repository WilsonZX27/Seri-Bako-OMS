"use client";

import { ErrorState } from "@/components/ui/system-states";

export default function PurchaseRequestDetailError() {
  return <ErrorState title="Purchase request not available" description="This request may not exist, or you may not have access to it." action={{ href: "/purchase-requests", label: "Back to purchase requests" }} />;
}
