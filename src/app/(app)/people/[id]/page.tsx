import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStaff, getStaffs } from "@/server/queries/foundation";
import { getPeopleCompliance } from "@/server/queries/compliance";

export default async function PeopleProfilePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const [staff,compliance]=await Promise.all([getStaff(id),getPeopleCompliance(id)]);
  const staffSummary=(await getStaffs({search:staff.email??staff.full_name})).find((row)=>row.id===id);
  const attention=compliance.filter((record)=>record.state!=="valid").length;
  const rail=<><ConsoleSection title="Profile status"><div className="flex items-center justify-between"><span className="text-muted-foreground">Employment</span><StatusBadge status={staff.status}/></div><div className="flex items-center justify-between border-t pt-2"><span className="text-muted-foreground">Compliance</span><strong>{attention?`${attention} need attention`:"Current"}</strong></div></ConsoleSection><ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href={`/staffs/${staff.id}`}>Manage account & access</Link></Button><Button asChild variant="outline" size="sm" className="w-full"><Link href="/people/calendar">People calendar</Link></Button></ConsoleSection><ConsoleSection title="Privacy"><p className="text-muted-foreground">Managers see compliance status only. Sensitive originals remain restricted to Owner and People Operations.</p></ConsoleSection></>;
  return <><PageHeader title={staff.full_name} description="Employee profile, assignment, compliance and OMS account access." backHref="/people"/><WorkspaceGrid rightRail={rail} documentMode tabletRailBreakpoint="lg">
    <nav className="flex min-h-11 gap-1 overflow-x-auto rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface-raised)] p-1 text-xs" aria-label="Employee profile sections">{[["overview","Overview"],["employment","Employment"],["compliance","Compliance"],["documents","Documents"]].map(([sectionId,label])=><a key={sectionId} href={`#${sectionId}`} className="inline-flex min-h-9 shrink-0 items-center rounded-[2px] px-3 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)]">{label}</a>)}</nav>
    <div className="divide-y overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]">
      <ProfileSection id="overview" title="Overview"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2"><Fact label="Staff code" value={staff.staff_code?.toUpperCase()}/><Fact label="Email" value={staff.email}/><Fact label="Phone" value={staff.phone}/><Fact label="Status" value={staff.status}/></dl></ProfileSection>
      <ProfileSection id="employment" title="Employment & outlet assignments"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2"><Fact label="Role" value={staffSummary?.role_name}/><Fact label="Default outlet" value={staffSummary?.default_branch_name}/></dl><p className="mt-3 text-xs text-muted-foreground">Additional outlet scope follows the existing OMS staff assignment model.</p></ProfileSection>
      <ProfileSection id="compliance" title="Compliance"><div className="divide-y">{compliance.map((record)=><div key={record.id} className="grid min-h-14 gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><span><strong className="block text-sm">{record.type?.type_name??"Employee requirement"}</strong><span className="text-xs text-muted-foreground">{record.expires_on?`Expires ${record.expires_on}`:"No expiry recorded"}</span></span><Badge variant={record.state==="valid"?"success":record.state==="expired"?"danger":"warning"}>{record.state.replace("due_","Expiring ")}</Badge></div>)}{!compliance.length?<EmptyState title="No compliance status" description="Vaccination and working-permit status appears only within the authorised People scope."/>:null}</div></ProfileSection>
      <ProfileSection id="documents" title="Documents"><p className="text-sm text-muted-foreground">Sensitive employee originals are shown only when your server-authorised role permits access. Restricted users receive status without filenames or download links.</p></ProfileSection>
    </div>
  </WorkspaceGrid></>;
}

function ProfileSection({id,title,children}:{id:string;title:string;children:ReactNode}){return <section id={id} className="scroll-mt-16 p-4"><h2 className="mb-3 text-sm font-semibold">{title}</h2>{children}</section>}
function Fact({label,value}:{label:string;value:string|null|undefined}){return <div><dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium capitalize">{value??"Not recorded"}</dd></div>}
