import { compareProductDisplayOrder } from "@/lib/product-order";
import type { Allocation, PlanningBranch, PlanningProduct, ProductionLine } from "./types";
export function productionSheetFilename(kitchen: string, date: string, version: number) {
  return `Production Sheet - ${kitchen.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim()} - ${date} - v${version}.pdf`;
}
export type ProductionSheetData={kitchen:string;date:string;version:number;status:string;dirty:boolean;products:PlanningProduct[];outlets:PlanningBranch[];allocations:Allocation[];production:ProductionLine[]};
/** Runs only on export; names and quantities stay local to the browser. */
export async function buildProductionSheetPdf(data:ProductionSheetData) {
  const {PDFDocument,StandardFonts,rgb}=await import("pdf-lib");
  const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(.09,.18,.14),muted=rgb(.32,.4,.36),green=rgb(.07,.3,.22),lineColor=rgb(.83,.88,.85);
  const clean=(value:string)=>value.replace(/[\r\n\t]+/g," ").replace(/[\u2010-\u2015]/g,"-").replace(/\s+/g," ").trim();
  const number=(value:number|null|undefined)=>value==null?"—":new Intl.NumberFormat("en-MY",{maximumFractionDigits:2}).format(value);
  const date=data.date.split("-").reverse().join("/");
  const title=productionSheetFilename(data.kitchen,data.date,data.version);doc.setTitle(title.replace(/\.pdf$/,""));doc.setAuthor("Seri Bako");
  const status=data.dirty?"UNSAVED DRAFT":data.status.toUpperCase();
  const rows=[...data.products].sort(compareProductDisplayOrder).flatMap(product=>{const production=data.production.find(l=>l.product_id===product.id);return production?[{product,production}]:[];});
  const wrap=(value:string,width:number,size:number,isBold=false)=>{
    const words=clean(value).split(" "),result:string[]=[];let current="";const face=isBold?bold:font;
    for(const word of words){const candidate=current?`${current} ${word}`:word;if(face.widthOfTextAtSize(candidate,size)<=width){current=candidate;continue;}if(current)result.push(current);current="";for(const char of word){if(face.widthOfTextAtSize(current+char,size)>width&&current){result.push(current);current="";}current+=char;}}
    if(current)result.push(current);return result.length?result:[""];
  };
  const left=24,right=571.28,tableWidth=right-left;
  type Column={label:string;width:number;numeric?:boolean};
  const table=(subtitle:string,columns:Column[],values:string[][])=>{
    columns=columns.map(column=>({...column,width:column.width*tableWidth/columns.reduce((sum,c)=>sum+c.width,0)}));
    let page=doc.addPage([595.28,841.89]),y=0;
    const start=()=>{
      page.drawText("SERI BAKO",{x:left,y:810,size:9,font:bold,color:green});page.drawText(subtitle,{x:left,y:790,size:16,font:bold,color:ink});
      page.drawText(clean(`${data.kitchen} | Delivery ${date} | Version ${data.version}`),{x:left,y:775,size:10,font,color:muted});
      page.drawText(status,{x:right-bold.widthOfTextAtSize(status,10),y:808,size:10,font:bold,color:green});
      page.drawLine({start:{x:left,y:765},end:{x:right,y:765},thickness:1.5,color:green});
      page.drawText(data.status!=="approved"||data.dirty?"Draft: not released for production. Dash = pending; yield 1 = by piece; trays n/a = not applicable.":"Released allocation. Actual dispatch is confirmed separately. Dash = pending; yield 1 = by piece; trays n/a = not applicable.",{x:left,y:752,size:8,font,color:muted});
      const headings=columns.map(c=>wrap(c.label,c.width-12,8,true));const height=Math.max(26,...headings.map(h=>h.length*10+12));y=740;
      page.drawRectangle({x:left,y:y-height,width:tableWidth,height,color:rgb(.91,.95,.93)});let x=left;
      headings.forEach((text,index)=>{text.forEach((row,i)=>page.drawText(row,{x:x+6,y:y-13-i*10,size:8,font:bold,color:green}));x+=columns[index].width;});y-=height;
    };
    start();values.forEach((value,index)=>{const cells=value.map((text,i)=>wrap(text,columns[i].width-10,8));const height=Math.max(16,...cells.map(c=>c.length*10+6));if(y-height<48){page=doc.addPage([595.28,841.89]);start();}
      if(index%2===1)page.drawRectangle({x:left,y:y-height,width:tableWidth,height,color:rgb(.97,.98,.975)});let x=left;
      cells.forEach((text,i)=>{text.forEach((row,n)=>page.drawText(row,{x:columns[i].numeric?x+columns[i].width-6-font.widthOfTextAtSize(row,8):x+6,y:y-11-n*10,size:8,font,color:ink}));x+=columns[i].width;});
      y-=height;page.drawLine({start:{x:left,y},end:{x:right,y},thickness:.4,color:lineColor});
    });
  };
  const outlets=data.outlets;
  table("Production sheet · PCS",[{label:"Code",width:45},{label:"Product / unit",width:230},{label:"Yield",width:40,numeric:true},{label:"Trays",width:40,numeric:true},{label:"Produce",width:52,numeric:true},...outlets.map(o=>({label:o.branch_name,width:Math.max(45,140/Math.max(1,outlets.length)),numeric:true})),{label:"Event",width:40,numeric:true},{label:"Keep",width:40,numeric:true}],rows.map(({product,production:l})=>[product.product_code,`${product.product_name}${product.selling_unit === "PCS" ? "" : ` (${product.selling_unit})`}`,number(l.yield_per_tray),l.yield_per_tray===1?"n/a":number(l.trays),number(l.trays===null||l.yield_per_tray===null?null:l.trays*l.yield_per_tray),...outlets.map(o=>number(data.allocations.find(a=>a.product_id===product.id&&a.branch_id===o.id)?.approved_qty)),number(l.event_qty),number(l.retained_qty)]));
  const pages=doc.getPages();pages.forEach((page,index)=>{page.drawLine({start:{x:left,y:36},end:{x:right,y:36},thickness:.5,color:lineColor});page.drawText(clean(`${data.kitchen} | ${date} | v${data.version}`),{x:left,y:23,size:8,font,color:muted});page.drawText(`${index+1} / ${pages.length}`,{x:right-35,y:23,size:8,font,color:muted});});
  return doc.save();
}
