"use client";
import { useActionState } from "react";
import { registerAssetOtherLocation } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AssetOtherLocationForm() {
  const [state,action,pending]=useActionState(registerAssetOtherLocation,{ok:false,message:""});
  return <details><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium">Add another destination</summary><form action={action} className="grid gap-2"><label className="grid gap-1 text-xs">Location name<Input name="name" placeholder="e.g. Hostel" required minLength={2} maxLength={120}/></label><p className="text-xs text-muted-foreground">Owner manages dispatch and receipt for this location.</p><Button disabled={pending}>{pending?"Adding…":"Add location"}</Button>{state.message?<p role={state.ok?"status":"alert"} className="text-xs">{state.message}</p>:null}</form></details>;
}
