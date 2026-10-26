import { StatusBadge } from "@/components/ui/status-badge";
export function StaffIdentityFacts({staff, locations, status}:{staff:{staff_code?:string|null;username?:string|null;email?:string|null;phone?:string|null};locations?:string|null;status:string}) {
 const fields=[["Staff code",staff.staff_code?.toUpperCase()],["Username",staff.username],["Accessible locations",locations],["Email",staff.email?.endsWith("@accounts.seribako.invalid")?null:staff.email?.toLowerCase()],["Phone",staff.phone]];
 return <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{fields.map(([label,value])=><div key={label}><dt className="text-xs font-semibold text-[var(--sb-text-muted)]">{label}</dt><dd className="mt-1 break-words text-sm font-normal">{value||"—"}</dd></div>)}<div><dt className="text-xs font-semibold text-[var(--sb-text-muted)]">Status</dt><dd className="mt-1"><StatusBadge status={status}/></dd></div></dl>;
}
