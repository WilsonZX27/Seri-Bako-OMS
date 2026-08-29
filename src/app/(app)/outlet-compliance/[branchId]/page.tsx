import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getOutletComplianceWorkspace } from "@/server/queries/compliance";
import { createComplianceRecord } from "@/server/actions/compliance";
import { reviewComplianceRecord } from "@/server/actions/compliance";
import { getPermissionMap } from "@/server/auth/permissions";

const meta: Record<string,{label:string;variant:"success"|"warning"|"danger"|"secondary"}>={missing:{label:"Missing",variant:"danger"},pending_review:{label:"Pending review",variant:"warning"},valid:{label:"Valid",variant:"success"},due_7:{label:"Expiring",variant:"danger"},due_30:{label:"Expiring",variant:"warning"},due_60:{label:"Expiring",variant:"warning"},due_90:{label:"Expiring",variant:"secondary"},expired:{label:"Expired",variant:"danger"}};

export default async function OutletChecklistPage({params}:{params:Promise<{branchId:string}>}) {
  const {branchId}=await params;
  const [workspace,permissions]=await Promise.all([getOutletComplianceWorkspace(),getPermissionMap(["outlet_compliance.upload","outlet_compliance.review"])]);
  const branch=workspace.branches.find((row)=>row.id===branchId);
  if(!branch) notFound();
  const rows=workspace.requirements.filter((row)=>row.branch_id===branchId);
  return <><PageHeader title={branch.branch_name} description="Outlet compliance checklist · evidence, review, renewal and history." backHref="/outlet-compliance" action={{href:"/outlet-calendar",label:"Calendar"}}/><div className="erp-surface divide-y">{rows.map((row)=>{const state=row.record?.state??"missing";const display=meta[state]??meta.missing;return <article key={row.id} className="grid gap-3 p-4 md:grid-cols-[minmax(10rem,1fr)_minmax(15rem,auto)] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium">{row.type?.type_name??"Required document"}</h2><Badge variant={display.variant}>{display.label}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{row.record?.expires_on?`Expires ${row.record.expires_on}`:"Expiry not recorded"} · {row.waiver_reason?`Waived: ${row.waiver_reason}`:"Evidence required"}</p></div>{row.record?.review_status==="pending_review"&&permissions["outlet_compliance.review"]?<form action={reviewComplianceRecord} className="flex justify-end gap-2"><input type="hidden" name="id" value={row.record.id}/><input type="hidden" name="review_note" value=""/><Button size="sm" name="decision" value="approved">Approve</Button><Button size="sm" variant="outline" name="decision" value="rejected">Return</Button></form>:permissions["outlet_compliance.upload"]?<form action={createComplianceRecord} className="flex min-w-0 flex-wrap items-center justify-end gap-2"><input type="hidden" name="compliance_type_id" value={row.compliance_type_id}/><input type="hidden" name="subject_kind" value="outlet"/><input type="hidden" name="branch_id" value={branch.id}/><input type="hidden" name="staff_id" value=""/><input type="hidden" name="responsible_staff_id" value=""/><input type="hidden" name="subject_label" value={branch.branch_name}/><input type="hidden" name="submit_for_review" value="1"/><label className="min-w-0 max-w-48 text-xs"><span className="sr-only">Upload {row.type?.type_name}</span><input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="block w-full text-[11px] file:mr-2 file:rounded file:border-0 file:px-2 file:py-1"/></label><Button size="sm" type="submit">Upload evidence</Button></form>:null}</article>})}{!rows.length?<EmptyState title="Checklist not initialised" description="Apply Preview migration 229 to create the seven required outlet items."/>:null}</div></>;
}
