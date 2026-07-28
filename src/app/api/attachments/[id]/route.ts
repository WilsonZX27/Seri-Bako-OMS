import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectivePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }
  const supabase = await createClient();
  if (!(await resolveEffectivePermission(supabase, "documents.read").catch(() => false))) {
    return NextResponse.json({ error: "You do not have permission to open this attachment." }, { status: 403 });
  }
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
      if (legacyUrl.protocol === "https:") return NextResponse.redirect(legacyUrl);
    } catch {
      return NextResponse.json({ error: "The stored file is unavailable." }, { status: 404 });
    }
  }
  return NextResponse.json({ error: "The stored file is unavailable." }, { status: 404 });
}
