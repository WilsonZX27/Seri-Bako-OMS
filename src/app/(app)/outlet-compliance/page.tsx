import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";
import { createComplianceType } from "@/server/actions/compliance";
import { hasPermission } from "@/server/auth/permissions";

export default async function OutletCompliancePage() {
  const [workspace,canManageTypes] = await Promise.all([getOutletComplianceWorkspace(),hasPermission("compliance.types.manage")]);
  const requirementsByBranch = new Map<string, typeof workspace.requirements>();
  for (const requirement of workspace.requirements) {
    const rows = requirementsByBranch.get(requirement.branch_id) ?? [];
    rows.push(requirement);
    requirementsByBranch.set(requirement.branch_id, rows);
  }
  const summaries = workspace.branches.map((branch) => {
    const rows = requirementsByBranch.get(branch.id) ?? [];
    const valid = rows.filter((row) => row.record?.state === "valid").length;
    const missing = rows.filter((row) => !row.record || row.record.state === "missing").length;
    const urgent = rows.filter((row) => row.record && ["expired", "due_7", "due_30"].includes(row.record.state)).length;
    return { branch, rows, valid, missing, urgent };
  }).sort((a, b) => (b.missing + b.urgent) - (a.missing + a.urgent) || a.branch.branch_name.localeCompare(b.branch.branch_name));
  const totals = summaries.reduce((value, row) => ({ missing: value.missing + row.missing, urgent: value.urgent + row.urgent }), { missing: 0, urgent: 0 });
  const rightRail=<><ConsoleSection title="Actions" kind="action"><Button asChild size="sm" className="w-full"><Link href="/outlet-calendar">Open calendar</Link></Button>{canManageTypes?<Button asChild size="sm" variant="outline" className="w-full"><Link href="#add-requirement-type">Add requirement</Link></Button>:null}</ConsoleSection><ConsoleSection title="Portfolio" kind="status"><dl className="divide-y divide-[var(--sb-border-soft)]"><PortfolioFact label="Sites" value={summaries.length}/><PortfolioFact label="Missing" value={totals.missing}/><PortfolioFact label="Due / expired" value={totals.urgent}/></dl></ConsoleSection></>;
  return <><PageHeader title="Outlet Compliance" description="Required licences and operating documents, prioritised by exception." contentWidth="wide"/><WorkspaceGrid tabletCanvas="wide" hideMobileConsole rightRail={rightRail} tabletRailBreakpoint="lg">
    {!workspace.migrationReady ? <div className="border-l-2 border-[var(--sb-warning)] bg-[var(--sb-surface-muted)] px-3 py-2 text-xs text-muted-foreground"><strong className="text-foreground">Preview compatibility mode.</strong> Apply migration 229 to initialise the seven-item checklist and enable evidence upload.</div> : null}
    <section className="sb-work-surface flex flex-col overflow-hidden sm:flex-row sm:items-stretch" aria-label="Compliance portfolio"><div className="grid flex-1 grid-cols-2 divide-x"><Exception label="Missing" value={totals.missing} tone="danger"/><Exception label="Due / expired" value={totals.urgent} tone="danger"/></div><div className="flex items-center justify-between gap-3 border-t px-3 py-2 sm:min-w-56 sm:border-l sm:border-t-0 xl:min-w-0 xl:border-l-0"><span className="text-xs text-muted-foreground">{summaries.length} active sites</span><Button asChild size="sm" variant="outline" className="xl:hidden"><Link href="/outlet-calendar">Open calendar</Link></Button></div></section>
    <section className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)]" aria-labelledby="outlet-register-title"><div className="border-b px-3 py-3"><h2 id="outlet-register-title" className="text-sm font-semibold">Compliance register</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Exceptions first. Open a site to review its required checklist and evidence.</p></div>
      <Table mobileHidden aria-label="Outlet compliance register"><TableHeader><TableRow><TableHead className="w-16 text-center">Action</TableHead><TableHead>Outlet</TableHead><TableHead className="text-center">Complete</TableHead><TableHead className="text-center">Missing</TableHead><TableHead className="text-center">Due</TableHead></TableRow></TableHeader><TableBody>{summaries.map(({branch,rows,valid,missing,urgent})=><TableRow key={branch.id}><TableCell className="w-16 p-0 text-center"><TableActionLink href={`/outlet-compliance/${branch.id}`} label={`Open ${branch.branch_name}`}><ChevronRight className="h-4 w-4"/></TableActionLink></TableCell><TableCell><strong className="block text-sm">{branch.branch_name}</strong><span className="text-[11px] text-muted-foreground">{branch.branch_code}</span></TableCell><TableCell className="text-center tabular-nums">{valid}/{rows.length}</TableCell><TableCell className="text-center"><Badge variant={missing?"danger":"secondary"}>{missing}</Badge></TableCell><TableCell className="text-center"><Badge variant={urgent?"danger":"secondary"}>{urgent}</Badge></TableCell></TableRow>)}{!summaries.length?<TableRow><TableCell colSpan={5}><EmptyState title="No assigned outlets" description="Outlet checklists appear after requirements are initialised."/></TableCell></TableRow>:null}</TableBody></Table>
      <OperationalList ariaLabel="Outlet compliance register">{summaries.map(({branch,rows,valid,missing,urgent})=><OperationalListRow key={branch.id} href={`/outlet-compliance/${branch.id}`} label={`Open ${branch.branch_name}`} primary={branch.branch_name} status={<Badge variant={missing||urgent?"danger":"success"}>{missing||urgent?"Needs attention":"Current"}</Badge>} secondary={`${valid}/${rows.length} requirements current`} detail={`${missing} missing · ${urgent} due`} meta="Open checklist"/>)}{!summaries.length?<EmptyState title="No assigned outlets" description="Outlet checklists appear after requirements are initialised."/>:null}</OperationalList>
    </section>
    {canManageTypes?<details id="add-requirement-type" className="rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)] p-3"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><Plus className="h-4 w-4" aria-hidden="true"/>New requirement</summary><p className="mb-3 text-xs text-muted-foreground">Create another document or inspection to track across every active site.</p><form action={createComplianceType} className="flex flex-col gap-3 sm:flex-row sm:items-end"><input type="hidden" name="subject_kind" value="outlet"/><label className="grid flex-1 gap-1 text-xs">Requirement name<input name="type_name" required maxLength={100} className="h-10 rounded-md border bg-background px-3" placeholder="e.g. Grease trap service"/></label><Button type="submit" className="min-h-10">Add to all sites</Button></form></details>:null}
  </WorkspaceGrid></>;
}

function Exception({label,value,tone}:{label:string;value:number;tone:"danger"|"warning"}) { return <div className="min-w-0 px-2 py-3 text-center"><strong className={`block text-lg tabular-nums ${value ? tone === "danger" ? "text-[var(--sb-danger)]" : "text-[var(--sb-warning)]" : "text-foreground"}`}>{value}</strong><span className="block truncate text-[10px] text-muted-foreground sm:text-xs">{label}</span></div>; }
function PortfolioFact({label,value}:{label:string;value:number}) { return <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>; }
