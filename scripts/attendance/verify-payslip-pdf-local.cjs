// Decode this fixture's one embedded ToUnicode font; not a general PDF parser.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PDFDocument,PDFRawStream,decodePDFRawStream}=require('pdf-lib');
const out=path.resolve('handoff/payslip-export-candidate-20261101');
(async()=>{const results=[];
 for(const name of ['synthetic-released.pdf','synthetic-approved.pdf','synthetic-draft.pdf','synthetic-long.pdf','http-draft.pdf']){
  const doc=await PDFDocument.load(fs.readFileSync(path.join(out,name)));
  const streams=doc.context.enumerateIndirectObjects().map(([,obj])=>obj).filter(obj=>obj instanceof PDFRawStream).map(obj=>{try{return Buffer.from(decodePDFRawStream(obj).decode()).toString();}catch{return '';}});
  const maps=streams.filter(s=>s.includes('beginbfchar'));assert.equal(maps.length,1);
  const cmap=new Map([...maps[0].matchAll(/<([0-9A-F]{4})>\s*<([0-9A-F]{4})>/g)].map(([,a,b])=>[a,String.fromCharCode(parseInt(b,16))]));
  const pages=streams.filter(s=>s.includes(' Tj')).map(s=>[...s.matchAll(/BT([\s\S]*?)ET/g)].map(([,block])=>{
   const m=block.match(/<([0-9A-F]+)> Tj/);if(!m)return null;
   const text=m[1].match(/.{4}/g).map(code=>{assert.ok(cmap.has(code));return cmap.get(code);}).join('');
   const pos=block.match(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/);
   return {text,x:pos?Number(pos[1]):null,y:pos?Number(pos[2]):null};
  }).filter(Boolean));
  const text=pages.flat().map(x=>x.text).join('\n');assert.ok(text.includes('988.05'));assert.equal(text.split('Employee signature').length-1,1);assert.equal(pages.length,doc.getPageCount());
  assert.ok(pages.at(-1).some(x=>x.text==='Employee signature'&&x.y===133));
  for(const page of pages){assert.ok(page.some(x=>x.text==='PAYSLIP'));for(const item of page)if(item.y!=null){assert.ok(item.x>=36&&item.x<560);assert.ok(item.y>=27&&item.y<=798);}}
  if(name.includes('draft'))assert.ok(pages.every(page=>page.some(x=>x.text==='DRAFT')));
  else assert.ok(text.includes('Synthetic employee · 合成人员'));
  let dateRowsChecked=0;
  for(const page of pages)for(const date of page.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.text))){assert.equal(date.x,36);assert.ok(page.some(x=>x.x===134&&x.y===date.y));dateRowsChecked++;}
  assert.equal(dateRowsChecked,name.includes('long')?31:2);
  if(name.includes('long')){assert.ok(doc.getPageCount()>2);const last=await PDFDocument.create();const [page]=await last.copyPages(doc,[doc.getPageCount()-1]);last.addPage(page);fs.writeFileSync(out+'/synthetic-long-last-page.pdf',await last.save());}
  fs.writeFileSync(out+'/'+name+'.txt',text);results.push({file:name,pages:doc.getPageCount(),net:'988.05',dateOutstandingSameRow:true,dateRowsChecked,signatureFieldsOnLastPage:true});
 }
 fs.writeFileSync(out+'/pdf-result.json',JSON.stringify({passed:true,results},null,2));console.log('PASS monetary PDF text/amounts, draft watermark, pagination bounds and bottom signature fields');
})().catch(e=>{console.error(e);process.exitCode=1;});
