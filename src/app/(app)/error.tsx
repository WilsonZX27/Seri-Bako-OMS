"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-5">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="text-sm text-muted-foreground">
            This workspace hit a temporary problem. Please try again, or continue from another page in the sidebar.
          </div>
          <Button type="button" onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
