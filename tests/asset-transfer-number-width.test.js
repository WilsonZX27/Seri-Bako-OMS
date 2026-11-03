const test=require('node:test'),assert=require('node:assert/strict');
const {compile,renderToStaticMarkup,React}=require('./helpers/render-workspaces.cjs');
const number=require('./helpers/load-source.cjs')()('src/lib/asset-transfer-number.ts');
const table=compile('src/components/ui/table.tsx');
const row=compile('src/components/ui/data-grid-row.tsx',{'next/navigation':{useRouter:()=>({push(){}})}});
const {AssetTransferRows}=compile('src/components/asset-transfer-rows.tsx',{'@/components/ui/table':table,'@/components/ui/data-grid-row':row,'@/lib/asset-transfer-number':number});
test('missing-number labels wrap in both views while persisted labels and UUID links retain their behavior',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 for(const document_no of [null,'AT-001','AST-12345678901234567890']) {
  const html=renderToStaticMarkup(React.createElement(AssetTransferRows,{records:[{id,document_no,status:'requested'}],assets:new Map(),locations:new Map()}));
  const label=document_no||'Unnumbered';
  const labels=[...html.matchAll(/<span class="([^"]*)" title="([^"]*)">([^<]*)<\/span>/g)].filter(match=>match[2]===label);
  assert.equal(labels.length,2);
  for(const [,classes,,text] of labels){assert.equal(text,label);if(document_no){assert.match(classes,/\btruncate\b/);assert.doesNotMatch(classes,/break-all/);}else{assert.match(classes,/whitespace-normal break-all/);assert.doesNotMatch(classes,/\btruncate\b/);}}
  assert.ok(html.includes('/asset-management/transfers/'+id));
 }
});
