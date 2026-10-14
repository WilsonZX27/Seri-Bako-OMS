import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createFont } from "fonteditor-core";
import { reviewedFourPunchSeconds, type PeopleWorkbookSheet } from "./people-workbook";

const headings = ["Date", "Day", "Scheduled", "In", "Break out", "Break in", "Out", "Net work", "Approved OT", "Pending OT", "Short hours", "PPH", "Exceptions / event"];
const widths = [54,26,70,36,42,42,36,53,57,55,55,30,238];
export function attendancePdfDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const value = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(value/3600)).padStart(2,"0")}:${String(Math.floor(value%3600/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
}
/** PDF and XLSX receive the same permission-scoped sheets; this renderer adds no pay rules. */
export async function buildPeoplePdf(sheets: PeopleWorkbookSheet[]) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const bytes = await readFile(path.join(process.cwd(), "src/lib/attendance/fonts/NotoSansSC-Regular.ttf"));
  // Subset before embedding: pdf-lib/fontkit subsetting loses glyphs in this CJK font.
  // Include report labels (ASCII), punctuation and all permission-scoped sheet text.
  const characters = new Set([...JSON.stringify(sheets), ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32)), "·", "–"]);
  const compactFont = createFont(bytes, { type: "ttf", subset: [...characters].map(char => char.codePointAt(0)!), compound2simple: true });
  const font = await doc.embedFont(compactFont.write({ type: "ttf" }) as Buffer, { subset: false });
  doc.setTitle("People attendance report");doc.setSubject("Attendance evidence; not a payslip");
  const ink=rgb(.08,.16,.13), muted=rgb(.35,.4,.38), green=rgb(.9,.95,.92), warning=rgb(1,.95,.79);
  function wrap(value:string,max:number,size:number) {
    const lines:string[]=[];let line="";
    for(const char of value.replace(/[\r\n\t]+/g," ")) {if(line && font.widthOfTextAtSize(line+char,size)>max){lines.push(line);line="";}line+=char;}
    if(line)lines.push(line);return lines.length?lines:[""];
  }
  for(const sheet of sheets){
    let page=doc.addPage([841.89,595.28]),y=0;
    const newPage=(continued=false)=>{
      if(continued)page=doc.addPage([841.89,595.28]);
      page.drawRectangle({x:0,y:0,width:841.89,height:595.28,color:rgb(1,1,1)});
      let top=570;
      for(const line of wrap(`${sheet.employee} · ${sheet.staffCode??""}`,790,12)){page.drawText(line,{x:24,y:top,size:12,font,color:ink});top-=16;}
      for(const line of wrap(sheet.outlet,790,9)){page.drawText(line,{x:24,y:top,size:9,font,color:ink});top-=13;}
      page.drawText(`${sheet.period?.start??sheet.days[0]?.date??""} to ${sheet.period?.end??sheet.days.at(-1)?.date??""} · ${sheet.period?.draft===false?"FINAL":"DRAFT"}${continued?" · continued":""}`,{x:24,y:top,size:9,font,color:ink});top-=14;
      page.drawText(`Generated: ${sheet.period?.generatedAt??""}`,{x:24,y:top,size:7,font,color:muted});top-=23;
      let x=24;headings.forEach((label,i)=>{page.drawRectangle({x,y:top-7,width:widths[i],height:25,color:green});for(const [n,line] of wrap(label,widths[i]-6,7).entries())page.drawText(line,{x:x+3,y:top+7-n*9,size:7,font,color:ink});x+=widths[i];});y=top-7;
    };
    newPage();
    const seen=new Set<string>();
    for(const day of [...sheet.days].sort((a,b)=>a.date.localeCompare(b.date))){
      if(seen.has(day.date))throw Error("Duplicate attendance date in PDF");seen.add(day.date);
      const worked=reviewedFourPunchSeconds(day), valid=worked!=null;
      const pending=valid?day.pendingOvertimeSeconds:null;
      const remarks=[day.exceptions,day.event,pending?"OT awaits People approval":null].filter(Boolean).join("; ");
      const values=[day.date,day.day,day.off?"OFF":`${day.scheduleStart??""}–${day.scheduleEnd??""}`,...Array.from({length:4},(_,i)=>day.punches?.[i]??""),attendancePdfDuration(worked),attendancePdfDuration(valid?day.overtimeSeconds:null),attendancePdfDuration(pending),attendancePdfDuration(valid?day.shortHoursSeconds:null),"",remarks];
      const lines=values.map((value,i)=>wrap(value,widths[i]-6,7)),height=Math.max(29,...lines.map(ls=>ls.length*10+10));
      if(height>340)throw Error("Attendance note is too long for PDF; shorten the note or use XLSX.");
      if(y-height<75)newPage(true);
      let x=24;values.forEach((_,i)=>{if(i===9 && pending)page.drawRectangle({x,y:y-height,width:widths[i],height,color:warning});for(const [n,line] of lines[i].entries())page.drawText(line,{x:x+3,y:y-12-n*10,size:7,font,color:ink});page.drawLine({start:{x,y:y-height},end:{x:x+widths[i],y:y-height},thickness:.4,color:rgb(.8,.84,.82)});x+=widths[i];});y-=height;
    }
  }
  doc.getPages().forEach((page,i)=>{
    page.drawText("Net work excludes breaks. Short hours = late + early leave. Pending OT is not approved.",{x:24,y:41,size:7,font,color:muted});
    page.drawText("PPH is intentionally blank; no pay multiplier or monetary calculation is applied.",{x:24,y:29,size:7,font,color:muted});
    page.drawText(`${i+1} / ${doc.getPageCount()}`,{x:780,y:17,size:7,font,color:muted});
  });
  return Buffer.from(await doc.save());
}
