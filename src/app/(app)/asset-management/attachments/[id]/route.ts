import { NextResponse } from "next/server";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { requirePermission } from "@/server/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("assets.view");
  const actor = await requireActiveTenantActor(), { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return new NextResponse("Attachment unavailable", { status: 404 });
  const client = await createClient(), db = looseSupabase(client);
  const result = await db.from("asset_attachments").select("asset_id,storage_path,verified_at,content_sha256").eq("company_id", actor.companyId).eq("id", id).maybeSingle();
  if (result.error) return new NextResponse("Attachment could not be verified", { status: 503 });
  const attachment = result.data;
  if (!attachment || typeof attachment.storage_path !== "string" || typeof attachment.asset_id !== "string" || typeof attachment.verified_at !== "string" || !Number.isFinite(Date.parse(attachment.verified_at)) || typeof attachment.content_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(attachment.content_sha256) || !attachment.storage_path.startsWith(`${actor.companyId}/${attachment.asset_id}/`)) return new NextResponse("Attachment awaiting verification", { status: 404 });
  const signed = await client.storage.from("asset-documents").createSignedUrl(attachment.storage_path, 60);
  if (signed.error || !signed.data?.signedUrl) return new NextResponse("Attachment unavailable", { status: 503 });
  const response = NextResponse.redirect(signed.data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
