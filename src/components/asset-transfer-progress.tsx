import { WorkflowStatusPipeline } from "@/components/workflow-status-pipeline";
import { StatusBadge } from "@/components/ui/status-badge";

export function AssetTransferProgress({status}:{status:string}) {
  const steps=[{key:"requested",label:"Request"},{key:"approved",label:"Approve"},{key:"dispatched",label:"Dispatch"},{key:"received",label:"Receive"}];
  // A cancelled/rejected document does not imply completion of intermediate stages.
  if(!steps.some(step=>step.key===status))return <div className="sb-work-surface px-4 py-3"><StatusBadge status={status}/></div>;
  return <WorkflowStatusPipeline steps={steps} currentStatus={status} compact stackOnMobile/>;
}
