"use client";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

export function ComplianceRequirementEditor({name,action}:{name:string;action:(formData:FormData)=>Promise<void>}) {
  const [open,setOpen]=useState(false),titleId=useId();
  const trigger=useRef<HTMLButtonElement>(null),input=useRef<HTMLInputElement>(null);
  return <><Button ref={trigger} type="button" variant="outline" size="sm" onClick={()=>setOpen(true)} aria-label={`Edit ${name}`}>Edit</Button><ModalShell open={open} onClose={()=>setOpen(false)} titleId={titleId} triggerRef={trigger} initialFocusRef={input} className="max-w-md"><h2 id={titleId} className="text-base font-semibold">Edit requirement</h2><p className="mt-2 text-sm text-muted-foreground">Rename this requirement across its sites. Existing evidence and history stay linked.</p><form action={action} className="mt-4 space-y-4"><input type="hidden" name="original_name" value={name}/><label className="grid gap-2 text-sm">Requirement name<Input ref={input} name="type_name" defaultValue={name} required minLength={2} maxLength={100}/></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><SubmitButton pendingLabel="Saving…">Save name</SubmitButton></div></form></ModalShell></>;
}
