export type ForecastImportRow = {outlet:string;product_code:string;weekday_qty:number|null;weekend_qty:number|null};

/** Small RFC4180 reader for the authenticated settings import. Blanks remain unknown. */
export function parseForecastCsv(text:string):ForecastImportRow[] {
  if(text.length>1_000_000)throw new Error("Forecast CSV must be smaller than 1 MB.");
  const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;
  text=text.replace(/^\uFEFF/,"");
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&(c===','||c==='\n'||c==='\r')){
      row.push(cell.trim());cell="";
      if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}
    }else cell+=c;
  }
  if(quoted)throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  const header=rows.shift()??[];
  const columns=["outlet","product_code","weekday_qty","weekend_qty"];
  if(columns.some(c=>header.filter(h=>h===c).length!==1))throw new Error("CSV headers must include outlet, product_code, weekday_qty, weekend_qty exactly once.");
  if(rows.length>10000)throw new Error("Import at most 10,000 forecast rows.");
  const seen=new Set<string>();
  return rows.map((r,i)=>{
    if(r.length!==header.length)throw new Error(`Row ${i+2}: column count does not match the header.`);
    const read=(name:string)=>r[header.indexOf(name)];
    const quantity=(name:string)=>{const value=read(name);if(value==="")return null;const q=Number(value);if(!/^\d+$/.test(value)||!Number.isSafeInteger(q)||q>1_000_000)throw new Error(`Row ${i+2}: ${name} must be a whole nonnegative quantity or blank.`);return q;};
    const outlet=read("outlet"),product_code=read("product_code"),key=`${outlet}:${product_code}`;
    if(!outlet||!product_code)throw new Error(`Row ${i+2}: outlet and product_code are required.`);
    if(seen.has(key))throw new Error(`Row ${i+2}: duplicate outlet and product.`);seen.add(key);
    return {outlet,product_code,weekday_qty:quantity("weekday_qty"),weekend_qty:quantity("weekend_qty")};
  });
}
