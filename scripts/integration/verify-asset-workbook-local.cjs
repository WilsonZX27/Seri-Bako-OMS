// Browser parser checks use generated synthetic workbooks; no service or database is contacted.
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const {chromium}=require('@playwright/test');
const load=require('../../tests/helpers/load-source.cjs')({Buffer});
const {buildAssetImportWorkbook}=load('src/lib/imports/asset-workbook.ts');
const {buildZipArchive}=load('src/lib/attendance/people-workbook.ts');
const out=process.env.ASSET_QA_OUTPUT||'handoff/asset-import';fs.mkdirSync(out,{recursive:true});
const location='00000000-0000-4000-8000-000000000010';
const bytes=buildAssetImportWorkbook({automaticId:false,locations:[{id:location,source_name:'QA Kitchen & Storage'}]});fs.writeFileSync(out+'/asset-import-synthetic.xlsx',bytes);
const source=fs.readFileSync('src/components/imports/import-workflow.tsx','utf8');
const parser=ts.transpileModule(source.slice(source.indexOf('function csvEscape'),source.indexOf('function validateRows')), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const worksheet='<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Asset ID</t></is></c><c r="B1" t="inlineStr"><is><t>Item Name</t></is></c><c r="C1" t="inlineStr"><is><t>Location ID</t></is></c><c r="D1" t="inlineStr"><is><t>Qty</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>QA-001</t></is></c><c r="B2" t="inlineStr"><is><t>测试 mixer</t></is></c><c r="C2" t="inlineStr"><is><t>'+location+'</t></is></c><c r="D2"><v>0</v></c></row></sheetData></worksheet>';
const fixture=(names=['Assets'],target='worksheets/data.xml',sheet=worksheet)=>buildZipArchive([{name:'xl/workbook.xml',content:'<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+names.map((name,i)=>`<sheet name="${name}" r:id="r${i}"/>`).join('')+'</sheets></workbook>'},{name:'xl/_rels/workbook.xml.rels',content:'<Relationships>'+names.map((_,i)=>`<Relationship Id="r${i}" Target="${i===names.length-1?target:'worksheets/reference.xml'}"/>`).join('')+'</Relationships>'},{name:'xl/worksheets/data.xml',content:sheet},{name:'xl/worksheets/reference.xml',content:worksheet.replace('QA-001','REFERENCE-DO-NOT-IMPORT')}]);
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage();await page.goto('about:blank');await page.addScriptTag({content:'var exports={};'+parser+';window.assetParser=exports;'});
async function parse(buffer,options={worksheetName:'Assets',rejectFormulas:true,maxExpandedBytes:20*1024*1024}){return page.evaluate(async({bytes,options})=>{try{return {value:await window.assetParser.parseXlsx(new File([new Uint8Array(bytes)],'fixture.xlsx'),options)}}catch(e){return {error:e.message}}},{bytes:[...buffer],options});}
let result=await parse(bytes);assert.equal(result.value.dataRows.length,0);assert.ok(result.value.headers.includes('Asset ID'));
result=await parse(fixture(['Instructions','Assets']));assert.equal(result.value.dataRows[0]['Asset ID'],'QA-001');assert.equal(result.value.dataRows[0].Qty,'0');assert.equal(result.value.dataRows[0]['Item Name'],'测试 mixer');
assert.equal((await parse(fixture(['Sheet1']))).value.dataRows[0]['Asset ID'],'QA-001');
assert.match((await parse(fixture(['Example']))).error,/one Assets tab/);
assert.match((await parse(fixture(['Instructions','Locations']))).error,/one Assets tab/);
assert.match((await parse(fixture(['Assets','Assets']))).error,/one Assets tab/);
assert.match((await parse(fixture(['Assets'],'../outside.xml'))).error,/could not be read/);
assert.match((await parse(fixture(['Assets'],'worksheets/data.xml',worksheet.replace('<v>0</v>','<f>1+1</f><v>2</v>')))).error,/Replace formulas/);
assert.match((await parse(bytes,{worksheetName:'Assets',maxExpandedBytes:10})).error,/size limit/);
assert.match((await parse(Buffer.from('invalid'))).error,/Invalid XLSX/);
const defaultBytes=buildZipArchive([{name:'xl/worksheets/sheet1.xml',content:worksheet}]);assert.equal((await parse(defaultBytes,{})).value.dataRows[0]['Asset ID'],'QA-001');
if(process.env.ASSET_NATIVE_XLSX){const native=await parse(fs.readFileSync(process.env.ASSET_NATIVE_XLSX));assert.equal(native.value.dataRows.length,1);assert.equal(native.value.dataRows[0]['Asset ID'],'QA-NATIVE-001');assert.equal(native.value.dataRows[0].Qty,'0');console.log('PASS: native Excel saved XLSX roundtrip, one row and explicit zero preserved.');}
console.log('PASS: 11 browser XLSX checks (blank template, reordered named sheet, legacy, references, duplicates, path, formulas, expansion, corrupt, default caller, Unicode/zero).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
