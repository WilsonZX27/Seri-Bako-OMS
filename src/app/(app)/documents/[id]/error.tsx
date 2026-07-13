"use client";

import { ErrorState } from "@/components/ui/system-states";

export default function DocumentDetailError() {
  return <ErrorState title="Document not available" description="This document may not exist, or you may not have access to it." action={{ href: "/documents", label: "Back to documents" }} />;
}
