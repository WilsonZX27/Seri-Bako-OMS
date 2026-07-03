"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PurchaseOrderDetailError() {
  return (
    <div className="p-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="text-sm font-medium">Document could not be found or you do not have permission to view it.</p>
          <Button asChild variant="outline">
            <Link href="/purchase-orders">Back to Purchase Orders</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
