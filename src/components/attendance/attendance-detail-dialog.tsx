"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";

/** The existing scoped server detail read is retained; only its presentation moves. */
export function AttendanceDetailDialog({children,closeHref}:{children:ReactNode;closeHref:string}) {
  const titleId=useId();
  const [open,setOpen]=useState(true);
  const router=useRouter();
  const close=()=>{setOpen(false);router.replace(closeHref,{scroll:false});};
  return <ModalShell open={open} titleId={titleId} onClose={close} className="max-w-lg">
    <h2 id={titleId} className="mb-4 text-base font-semibold">Attendance details</h2>
    {children}
    <footer className="mt-4 flex justify-end"><Button type="button" variant="outline" onClick={close}>Close</Button></footer>
  </ModalShell>;
}
