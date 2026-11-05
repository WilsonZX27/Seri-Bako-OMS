const test=require('node:test'),assert=require('node:assert/strict');
const {PDFPage,PDFDocument}=require('pdf-lib');
const load=require('./helpers/load-source.cjs')({Buffer,process});
const {buildOutletDailyRecordFormPdf}=load('src/server/pdf/outlet-daily-record-form.ts');
test('actual multipage PDF emits historical unit note once on every page and leaves current form unchanged',async()=>{
 const original=PDFPage.prototype.drawText,notes=[];
 PDFPage.prototype.drawText=function(text,options){if(text.includes('historical units are unverified'))notes.push({page:this,options});return original.call(this,text,options);};
 try {for(const historical of [true,false]){notes.length=0;const bytes=await buildOutletDailyRecordFormPdf({companyName:'Fixture',generatedDate:'2026-11-05',...(historical?{recordDate:'2026-11-02'}:{}),groups:[{tracking:'food_daily',label:'Food',products:Array.from({length:45},(_,i)=>({product_code:'P'+i,product_name:'Product '+i,selling_unit:'PCS'}))}]});const doc=await PDFDocument.load(bytes);assert.ok(doc.getPageCount()>1);assert.equal(notes.length,historical?doc.getPageCount():0);assert.equal(new Set(notes.map(n=>n.page)).size,notes.length);assert.ok(notes.every(n=>n.options.y===32&&n.options.size===8));}}
 finally {PDFPage.prototype.drawText=original;}
});
