"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/system-states";

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

  return <ErrorState title="Workspace could not load" description="Try again, or continue from another page in the sidebar." action={<Button type="button" onClick={reset}>Try again</Button>} />;
}
