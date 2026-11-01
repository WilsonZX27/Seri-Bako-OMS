import {requireActiveTenantActor} from '@/server/auth/tenant-actor';
import {requirePermission} from '@/server/auth/permissions';
import {getAssetRegistration} from '@/server/queries/assets';
import {AssetImportWorkflow} from '@/components/asset-import-workflow';
import {PageHeader} from '@/components/ui/page-header';
export default async function AssetImportPage(){const actor=await requireActiveTenantActor({owner:true});await requirePermission('assets.manage');const data=await getAssetRegistration();return <><PageHeader title="Import assets" description="Prepare, review and register new assets."/>{data.active?<AssetImportWorkflow draftScope={`${actor.companyId}:${actor.staffId}`} locations={data.locations} automaticId={data.automaticId}/>:<p>Asset registration is not active.</p>}</>}
