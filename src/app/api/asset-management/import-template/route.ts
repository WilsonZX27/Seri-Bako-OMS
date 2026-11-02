import { NextResponse } from 'next/server';
import { requireActiveTenantActor } from '@/server/auth/tenant-actor';
import { requirePermission } from '@/server/auth/permissions';
import { getAssetRegistration } from '@/server/queries/assets';
import { buildAssetImportWorkbook } from '@/lib/imports/asset-workbook';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    await requireActiveTenantActor({owner:true});
    await requirePermission('assets.manage');
    const data = await getAssetRegistration();
    if (!data.active) return NextResponse.json({error:'Asset registration is not active.'},{status:403});
    return new NextResponse(new Uint8Array(buildAssetImportWorkbook(data)),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="asset-import.xlsx"','Cache-Control':'private, no-store'}});
  } catch { return NextResponse.json({error:'The template could not be downloaded. Sign in with an authorised asset import account and try again.'},{status:403}); }
}
