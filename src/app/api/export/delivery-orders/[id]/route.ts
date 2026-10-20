import { NextResponse } from "next/server";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createFont } from "fonteditor-core";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile, getCompanyBranding } from "@/server/queries/common";
import { loadDeliveryOrders, complete } from "@/server/production-planning/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse("Not found", { status: 404 });
  const profile = await getCurrentProfile();
  if (!profile?.company_id) return new NextResponse("Unauthorized", { status: 401 });
  const db = looseSupabase(await createClient());
  const [orders, branches, branding] = await Promise.all([loadDeliveryOrders(db, { companyId: profile.company_id, id }), complete(() => db.from("branches").select("*", { count: "exact" }).eq("company_id", profile.company_id)), getCompanyBranding()]);
  const order = orders[0];
  if (!order) return new NextResponse("Not found", { status: 404 });
  const event = order.event_id ? await db.from("production_planning_events").select("name").eq("id", order.event_id).maybeSingle() : null;
  const from = String(branches.find(b => b.id === order.kitchen_id)?.branch_name ?? "Central kitchen");
  const to = String(branches.find(b => b.id === order.branch_id)?.branch_name ?? event?.data?.name ?? "Corporate event");
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const text = JSON.stringify({ order, from, to, company: branding.company_name });
  const bytes = await readFile(path.join(process.cwd(), "src/lib/attendance/fonts/NotoSansSC-Regular.ttf"));
  const chars = new Set([...text, ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32))]);
  const subset = createFont(bytes, { type: "ttf", subset: [...chars].map(c => c.codePointAt(0)!), compound2simple: true });
  const font = await doc.embedFont(subset.write({ type: "ttf" }) as Buffer);
  const wrap = (value: string, width: number, size = 8) => {
    const lines: string[] = []; let line = "";
    for (const char of value.replace(/[\r\n\t]/g, " ")) { if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ""; } line += char; }
    lines.push(line); return lines;
  };
  const widths = [24, 60, 65, 125, 35, 40, 40, 40, 65];
  let page = doc.addPage(), y = 0;
  const draw = (value: string, x: number, top: number, width: number, size = 8) => { const lines = wrap(value, width, size); lines.forEach((line, i) => page.drawText(line, { x, y: top - i * (size + 3), size, font })); return lines.length * (size + 3); };
  const start = (continued = false) => {
    if (continued) page = doc.addPage();
    y = 810; y -= draw(branding.company_name, 24, y, 547, 12) + 6;
    y -= draw(`Delivery Order ${order.status === "void" ? "(VOID)" : ""} - ${order.do_no}`, 24, y, 547, 14) + 8;
    for (const label of [`Date: ${order.delivery_date} | Approved plan: v${order.plan_version}`, `From: ${from}`, `To: ${to}`, `Prepared by: ${order.prepared_by}`, `Driver: ${order.driver || "________________"} | Vehicle: ${order.vehicle || "________________"}`, `Yellow trays: ${order.yellow_trays} | Silver trays: ${order.silver_trays}`]) y -= draw(label, 24, y, 547) + 3;
    y -= 10; let x = 24;
    ["No.", "Code", "Category", "Item", "Unit", "Sent", "Received", "Disposal", "Remarks"].forEach((label, i) => { draw(label, x + 3, y, widths[i] - 6, 7); x += widths[i]; }); y -= 22;
  };
  start();
  order.lines.forEach((line, index) => {
    const cells = [String(index + 1), line.product_code, line.category, line.product_name, line.unit, String(line.qty), "", "", ""];
    const height = Math.max(28, ...cells.map((value, i) => wrap(value, widths[i] - 6).length * 11 + 10));
    if (y - height < 125) start(true);
    let x = 24;
    cells.forEach((value, i) => { page.drawRectangle({ x, y: y - height, width: widths[i], height, borderWidth: 0.4, borderColor: rgb(.6, .65, .62) }); draw(value, x + 3, y - 12, widths[i] - 6); x += widths[i]; }); y -= height;
  });
  if (y < 145) start(true);
  draw("Driver signature: ____________________", 24, y - 30, 260);
  draw("Outlet receiver / stamp: ____________________", 300, y - 30, 270);
  draw("Date / time: ____________________", 24, y - 50, 260);
  draw("Date / time: ____________________", 300, y - 50, 270);
  doc.getPages().forEach((p, index) => { p.drawText(`Actual receipt and disposal require outlet confirmation. | Page ${index + 1} / ${doc.getPageCount()}`, { x: 24, y: 30, size: 8, font }); });
  doc.setTitle(`Delivery Order ${order.do_no}`);
  return new NextResponse(Buffer.from(await doc.save()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="delivery-order-${id}.pdf"`, "Cache-Control": "private, no-store" } });
}
