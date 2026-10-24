"use client";
import {Notice} from "@/components/ui/system-states";
import {useId,useRef,useState} from "react";
import {ModalShell} from "@/components/ui/modal-shell";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {createManagedStockDestination} from "@/server/actions/stock-destinations";
type Destination={id:string;branch_code:string;branch_name:string;status:string};
export function ManagedStockDestinationDialog({name,onClose,onCreated}:{name:string|null;onClose:()=>void;onCreated:(destination:Destination)=>void}){
 const titleId=useId(),nameRef=useRef<HTMLInputElement>(null);const[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError(null);try{const result=await createManagedStockDestination({name:String(data.get("location_name")??""),code:String(data.get("location_code")??"")});if(!result.ok){setError(result.message);return;}onCreated(result.destination);onClose();}catch{setError("Location creation could not be confirmed. Retry with the same name and code.");}finally{setBusy(false)}}
 return <ModalShell open={name!==null} onClose={()=>{if(!busy){setError(null);onClose()}}} titleId={titleId} initialFocusRef={nameRef}><form onSubmit={submit} className="space-y-4 p-4"><header><h2 id={titleId} className="font-semibold">Add managed location</h2></header><Notice>Separate stock location; receipt required.</Notice><label className="grid gap-2 text-sm">Location name<Input key={name} ref={nameRef} name="location_name" defaultValue={name??""} maxLength={160} required disabled={busy}/></label><label className="grid gap-2 text-sm">Location code<Input name="location_code" maxLength={64} required disabled={busy}/></label>{error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}<footer className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy?"Creating…":"Create location"}</Button></footer></form></ModalShell>;
}
