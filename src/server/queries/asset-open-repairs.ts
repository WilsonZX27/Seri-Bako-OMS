/** Restricted repairs reveal only that a held asset needs attention, never another site's ticket. */
export type OpenAssetRepair =
  | { id:string; asset_id:string; status:string; description:string|null; open_count:number; restricted?:false }
  | { id:null; asset_id:string; status:"Open"; description:null; open_count:null; restricted:true };
