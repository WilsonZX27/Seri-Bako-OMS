import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { resolveEffectivePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }
  const supabase = await createClient();
  const actor = await requireActiveTenantActor().catch(() => null);
  if (!actor) {
    return NextResponse.json({ error: "You do not have permission to open this attachment." }, { status: 403 });
  }

  const { data: attachment, error } = await supabase
    .from("attachments")
    .select("file_name, storage_path, file_url")
    .eq("id", id)
    .eq("company_id", actor.companyId)
    .eq("status", "active")
    .is("deleted_at", null)
    .single();
  if (error || !attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });

  const { data: complianceRecord } = await supabase
    .from("compliance_records")
    .select("id, company_id, compliance_type_id, subject_kind")
    .eq("attachment_id", id)
    .eq("company_id", actor.companyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (complianceRecord) {
    const permission = complianceRecord.subject_kind === "outlet" ? "outlet_compliance.document.read" : complianceRecord.subject_kind === "staff" ? "people.compliance.document.read" : "compliance.sensitive.read";
    if (!(await resolveEffectivePermission(supabase, permission).catch(() => false))) {
      return NextResponse.json({ error: "This compliance file is restricted. Status access never grants access to the original document." }, { status: 403 });
    }
    await supabase.from("compliance_record_history").insert({
      company_id: actor.companyId,
      compliance_record_id: complianceRecord.id,
      event_type: request.nextUrl.searchParams.get("download") === "1" ? "attachment_downloaded" : "attachment_opened",
      safe_summary: request.nextUrl.searchParams.get("download") === "1" ? "Restricted file downloaded." : "Restricted file opened.",
      actor_staff_id: actor.staffId,
    });
  } else if (!(await resolveEffectivePermission(supabase, "documents.read").catch(() => false))) {
    return NextResponse.json({ error: "You do not have permission to open this attachment." }, { status: 403 });
  }

  if (attachment.storage_path) {
    const download = request.nextUrl.searchParams.get("download") === "1";
    const { data, error: signedUrlError } = await supabase.storage
      .from("document-attachments")
      .createSignedUrl(attachment.storage_path, 60, download ? { download: attachment.file_name } : undefined);
    if (signedUrlError || !data?.signedUrl) return NextResponse.json({ error: "Attachment could not be opened." }, { status: 500 });
    return NextResponse.redirect(data.signedUrl);
  }

  if (attachment.file_url) {
    try {
      const legacyUrl = new URL(attachment.file_url);
      const storageOrigin = new URL(requireSupabaseEnv().url).origin;
      if (
        legacyUrl.protocol === "https:" &&
        legacyUrl.origin === storageOrigin &&
        legacyUrl.pathname.startsWith("/storage/v1/object/")
      ) {
        return NextResponse.redirect(legacyUrl);
      }
    } catch {
      return NextResponse.json({ error: "The stored file is unavailable." }, { status: 404 });
    }
  }
  return NextResponse.json({ error: "The stored file is unavailable." }, { status: 404 });
}
