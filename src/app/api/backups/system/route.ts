import { NextResponse } from "next/server";
import { generateSystemBackupZip } from "@/server/backup/export";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeLogs = url.searchParams.get("logs") !== "0";
    const includeAttachmentMetadata = url.searchParams.get("attachments") !== "0";
    const backup = await generateSystemBackupZip({ includeLogs, includeAttachmentMetadata });

    return new NextResponse(new Uint8Array(backup.buffer), {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${backup.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, message: "Backup could not be generated. Please try again." },
      { status: 403 },
    );
  }
}
