"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export function AttachmentRemoveAction({
  action,
  fileName,
}: {
  action: () => Promise<void>;
  fileName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" className="w-full justify-center" onClick={() => setConfirming(true)}>
        Remove
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-2" role="group" aria-label={`Remove ${fileName}`}>
      <p className="text-xs text-destructive">Remove this mistaken upload?</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>Keep file</Button>
        <form action={action}>
          <SubmitButton variant="destructive" size="sm" pendingLabel="Removing..." className="w-full justify-center">Remove</SubmitButton>
        </form>
      </div>
    </div>
  );
}
