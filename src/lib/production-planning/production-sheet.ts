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
  const number=(value:number|null|undefined)=>value==null?"Pending":new Intl.NumberFormat("en-MY",{maximumFractionDigits:2}).format(value);
  const date=data.date.split("-").reverse().join("/");
  const title=productionSheetFilename(data.kitchen,data.date,data.version);doc.setTitle(title.replace(/\.pdf$/,""));doc.setAuthor("Seri Bako");
  const status=data.dirty?"UNSAVED DRAFT":data.status.toUpperCase();
  const rows=[...data.products].sort(compareProductDisplayOrder).flatMap(product=>{const production=data.production.find(l=>l.product_id===product.id);return production?[{product,production}]:[];});
  const wrap=(value:string,width:number,size:number,isBold=false)=>{
    const words=clean(value).split(" "),result:string[]=[];let current="";const face=isBold?bold:font;
    for(const word of words){const candidate=current?`${current} ${word}`:word;if(face.widthOfTextAtSize(candidate,size)<=width){current=candidate;continue;}if(current)result.push(current);current="";for(const char of word){if(face.widthOfTextAtSize(current+char,size)>width&&current){result.push(current);current="";}current+=char;}}
    if(current)result.push(current);return result.length?result:[""];
  };
  type Column={label:string;width:number;numeric?:boolean};
  const table=(subtitle:string,columns:Column[],values:string[][])=>{
    let page=doc.addPage([841.89,595.28]),y=0;
    const start=()=>{
      page.drawText("SERI BAKO",{x:36,y:555,size:9,font:bold,color:green});page.drawText(subtitle,{x:36,y:527,size:23,font:bold,color:ink});
      page.drawText(clean(`${data.kitchen} | Delivery ${date} | Version ${data.version}`),{x:36,y:509,size:10,font,color:muted});
      page.drawText(status,{x:805-bold.widthOfTextAtSize(status,10),y:548,size:10,font:bold,color:green});
      page.drawLine({start:{x:36,y:496},end:{x:805,y:496},thickness:1.5,color:green});
      page.drawText(data.status!=="approved"||data.dirty?"Draft: not released for production. Pending = not entered or not configured.":"Released allocation. Actual dispatch is confirmed separately. Pending = not entered or not configured.",{x:36,y:481,size:8,font,color:muted});
      const headings=columns.map(c=>wrap(c.label,c.width-12,8,true));const height=Math.max(26,...headings.map(h=>h.length*10+12));y=467;
      page.drawRectangle({x:36,y:y-height,width:769,height,color:rgb(.91,.95,.93)});let x=36;
      headings.forEach((text,index)=>{text.forEach((row,i)=>page.drawText(row,{x:x+6,y:y-13-i*10,size:8,font:bold,color:green}));x+=columns[index].width;});y-=height;
    };
    start();values.forEach((value,index)=>{const cells=value.map((text,i)=>wrap(text,columns[i].width-12,9));const height=Math.max(22,...cells.map(c=>c.length*11+10));if(y-height<48){page=doc.addPage([841.89,595.28]);start();}
      if(index%2===1)page.drawRectangle({x:36,y:y-height,width:769,height,color:rgb(.97,.98,.975)});let x=36;
      cells.forEach((text,i)=>{text.forEach((row,n)=>page.drawText(row,{x:columns[i].numeric?x+columns[i].width-6-font.widthOfTextAtSize(row,9):x+6,y:y-14-n*11,size:9,font,color:ink}));x+=columns[i].width;});
      y-=height;page.drawLine({start:{x:36,y},end:{x:805,y},thickness:.4,color:lineColor});
    });
  };
  table("Production sheet",[{label:"Code",width:48},{label:"Product",width:250},{label:"Unit",width:41},{label:"Yield / tray",width:65,numeric:true},{label:"Trays",width:50,numeric:true},{label:"Produce",width:78,numeric:true},{label:"Outlets",width:79,numeric:true},{label:"Events",width:79,numeric:true},{label:"Kitchen",width:79,numeric:true}],rows.map(({product,production:l})=>{const allocations=data.allocations.filter(a=>a.product_id===product.id);return [product.product_code,product.product_name,product.selling_unit,number(l.yield_per_tray),number(l.trays),number(l.trays===null||l.yield_per_tray===null?null:l.trays*l.yield_per_tray),number(allocations.some(a=>a.approved_qty===null)?null:allocations.reduce((sum,a)=>sum+a.approved_qty!,0)),number(l.event_qty),number(l.retained_qty)];}));
  for(let offset=0;offset<data.outlets.length;offset+=6){const outlets=data.outlets.slice(offset,offset+6);table(`Outlet allocation - group ${Math.floor(offset/6)+1} of ${Math.ceil(data.outlets.length/6)}`,[{label:"Code",width:48},{label:"Product",width:221},...outlets.map(o=>({label:o.branch_name,width:500/outlets.length,numeric:true}))],rows.map(({product})=>[product.product_code,product.product_name,...outlets.map(o=>number(data.allocations.find(a=>a.product_id===product.id&&a.branch_id===o.id)?.approved_qty))]));}
  const pages=doc.getPages();pages.forEach((page,index)=>{page.drawLine({start:{x:36,y:36},end:{x:805,y:36},thickness:.5,color:lineColor});page.drawText(clean(`${data.kitchen} | ${date} | v${data.version}`),{x:36,y:23,size:8,font,color:muted});page.drawText(`${index+1} / ${pages.length}`,{x:770,y:23,size:8,font,color:muted});});
  return doc.save();
}
