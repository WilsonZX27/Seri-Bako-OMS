import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PageSizes, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createFont } from "fonteditor-core";
import type { SalesChannel } from "@/lib/outlet-sales-channels";
import type { DailyTracking } from "@/lib/daily-product-tracking";
import { defaultSalesChannelSettings, visibleSalesChannels, type SalesChannelSettings } from "@/lib/outlet-sales-channel-settings";

type ProductGroup = {
  tracking: DailyTracking;
  label: string;
  products: { product_code: string; product_name: string; selling_unit: string }[];
};

export async function buildOutletDailyRecordFormPdf({ groups, companyName, generatedDate, salesSettings = defaultSalesChannelSettings(), salesAmounts = {}, recordDate }: {
  groups: ProductGroup[];
  companyName: string;
  generatedDate: string;
  salesSettings?: SalesChannelSettings;
  salesAmounts?: Partial<Record<SalesChannel, number>>;
  recordDate?: string;
}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bytes = await readFile(path.join(process.cwd(), "src/lib/attendance/fonts/NotoSansSC-Regular.ttf"));
  const chars = new Set([...JSON.stringify({ groups, companyName, salesSettings }), ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32))]);
  const subset = createFont(bytes, { type: "ttf", subset: [...chars].map((char) => char.codePointAt(0)!), compound2simple: true });
  const font = await doc.embedFont(subset.write({ type: "ttf" }) as Buffer);
  const widths = [24, 44, 170, 30, 44, 50, 56, 129];
  const margin = 24;
  const bottom = 42;
  const border = rgb(.65, .68, .66);
  const muted = rgb(.92, .94, .93);
  let page = doc.addPage(PageSizes.A4);
  let y = 0;

  function wrap(value: string, width: number, size = 9) {
    const lines: string[] = [];
    let line = "";
    for (const word of value.replace(/\s+/g, " ").trim().split(" ")) {
      if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) { lines.push(line); line = ""; }
      if (font.widthOfTextAtSize(word, size) <= width) { line = line ? `${line} ${word}` : word; continue; }
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
    return lines;
  }

  function text(value: string, x: number, top: number, width: number, size = 9) {
    const lines = wrap(value, width, size);
    lines.forEach((line, index) => page.drawText(line, { x, y: top - index * 12, size, font }));
    return lines.length * 12;
  }

  function startPage(continued = false) {
    if (continued) page = doc.addPage(PageSizes.A4);
    y = 812;
    y -= text(companyName, margin, y, 547, 12) + 8;
    y -= text("Outlet Daily Record Form", margin, y, 547, 15) + 10;
    text("Outlet: __________________________", margin, y, 285);
    text(`Record date: ${recordDate ?? "____________________"}`, 320, y, 250);
    y -= 24;
  }

  function tableRow(cells: string[], header = false) {
    const size = header ? 8 : 9;
    const height = Math.max(header ? 28 : 30, ...cells.map((value, index) => wrap(value, widths[index] - 8, size).length * 12 + 12));
    let x = margin;
    cells.forEach((value, index) => {
      page.drawRectangle({ x, y: y - height, width: widths[index], height, borderWidth: .4, borderColor: border, ...(header ? { color: muted } : {}) });
      text(value, x + 4, y - 13, widths[index] - 8, size);
      x += widths[index];
    });
    y -= height;
  }

  function groupHeader(group: ProductGroup, continued = false) {
    y -= text(`${group.label}${continued ? " (continued)" : ""}`, margin, y, 547, 11) + 8;
    const consumption = group.tracking === "food_daily" ? "Wastage" : group.tracking === "beverage" ? "Qty Sold" : "Usage";
    const last = group.tracking === "food_daily" ? "Wastage details" : ["packaging", "beverage"].includes(group.tracking) ? "Balance" : "Notes";
    tableRow(["No.", "Code", "Product", "Unit", "Qty Sent", "Received", consumption, last], true);
  }

  startPage();
  let number = 0;
  for (const group of groups) {
    const first = group.products[0];
    const firstHeight = first ? Math.max(30, wrap(first.product_name, widths[2] - 8).length * 12 + 12) : 30;
    if (y - firstHeight - 60 < bottom) startPage(true);
    groupHeader(group);
    for (const product of group.products) {
      const cells = [String(++number), product.product_code, product.product_name, product.selling_unit, "", "", "", ""];
      const height = Math.max(30, ...cells.map((value, index) => wrap(value, widths[index] - 8).length * 12 + 12));
      if (y - height < bottom) { startPage(true); groupHeader(group, true); }
      tableRow(cells);
    }
    y -= 20;
  }
  if (!groups.length) y -= text("No active products available for this date.", margin, y, 547) + 12;

  const visible = visibleSalesChannels(salesSettings, salesAmounts);
  const channels = visible.filter(channel => channel.key !== "voucher");
  const voucher = visible.find(channel => channel.key === "voucher");
  const topHeight = Math.max(28, voucher ? wrap(`${voucher.label}: ____________________`, 266).length * 12 + 12 : 28);
  const rowHeights = Array.from({ length: Math.ceil(channels.length / 2) }, (_, index) => Math.max(28, ...channels.slice(index * 2, index * 2 + 2).map(channel => wrap(`${channel.label}: __________________`, 266).length * 12 + 12)));
  const salesHeight = 48 + topHeight + rowHeights.reduce((sum, height) => sum + height, 0);
  if (y - salesHeight < bottom) startPage(true);
  y -= text("Sales reconciliation (RM)", margin, y, 547, 11) + 12;
  text("POS Total Sales: ______________", margin, y, 270);
  if (voucher) text(`${voucher.label}: ____________________`, 305, y, 266);
  y -= topHeight;
  channels.forEach((channel, index) => {
    text(`${channel.label}: __________________`, index % 2 ? 305 : margin, y, 266);
    if (index % 2 || index === channels.length - 1) y -= rowHeights[Math.floor(index / 2)];
  });
  text("Channel total: _________________", margin, y, 270);
  text("Difference: __________________", 305, y, 266);

  doc.getPages().forEach(sheet => {
    if (recordDate) sheet.drawText("Units shown are current catalogue units; historical units are unverified.", { x: margin, y: 32, font, size: 8 });
  });
  doc.getPages().forEach((sheet, index) => sheet.drawText(`${recordDate ? `Record form for ${recordDate}` : `Current product form as of ${generatedDate}`} | Page ${index + 1} / ${doc.getPageCount()}`, { x: margin, y: 22, font, size: 8 }));
  doc.setTitle(`Outlet Daily Record Form - ${recordDate ?? "Latest"}`);
  return doc.save();
}
