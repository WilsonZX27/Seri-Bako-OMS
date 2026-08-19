import { AutoCountImportWorkflow } from "@/components/imports/autocount-import-workflow";
import { PageHeader } from "@/components/ui/page-header";
import { PermissionDeniedState } from "@/components/ui/system-states";
import { hasPermission } from "@/server/auth/permissions";

export default async function AutoCountImportPage() {
  const allowed = await hasPermission("imports.create");
  return (
    <>
      <PageHeader title="AutoCount Direct Import" description="Upload the original exports once. OMS identifies, validates, and links the master data before a single confirmation." />
      {allowed ? <AutoCountImportWorkflow /> : <PermissionDeniedState />}
    </>
  );
}
