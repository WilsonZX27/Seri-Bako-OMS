"use client";
import { useRef } from "react";
import { X } from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { GeneralMaintenanceForm } from "@/components/general-maintenance-form";
import type { ComponentProps } from "react";

export function MaintenanceReportModal(props: ComponentProps<typeof GeneralMaintenanceForm>) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeLink = useRef<HTMLAnchorElement>(null);
  // A real navigation click preserves the existing unsaved asset draft guard.
  const close = () => closeLink.current?.click();
  return <><a ref={closeLink} href="/asset-management?view=maintenance" hidden>Close report</a><ModalShell open initialFocusRef={titleRef} onClose={close} titleId="maintenance-report-title" className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0"><header className="flex shrink-0 items-center justify-between border-b px-4 py-2"><h2 ref={titleRef} tabIndex={-1} id="maintenance-report-title" className="text-base font-semibold">Report a problem</h2><Button type="button" variant="ghost" size="icon" aria-label="Close report" onClick={close}><X className="size-4"/></Button></header><GeneralMaintenanceForm {...props} dialogMode onClose={close}/></ModalShell></>;
}
