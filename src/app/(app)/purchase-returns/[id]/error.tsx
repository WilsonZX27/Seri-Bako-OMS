"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PurchaseReturnError() {
  return (
    <Card className="m-4">
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
          <div>
            <p className="font-semibold">Purchase return not available</p>
            <p className="text-sm text-muted-foreground">The record may not exist or you may not have access.</p>
          </div>
        </div>
        <Button asChild variant="outline"><Link href="/purchase-returns">Back to returns</Link></Button>
      </CardContent>
    </Card>
  );
}
