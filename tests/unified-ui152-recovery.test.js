const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const load=require('./helpers/load-source.cjs')({setTimeout,clearTimeout,AbortController,URLSearchParams});
const {requestDeadline}=load('src/lib/http/request-deadline.ts');
const {readShellBranding}=load('src/lib/shell-branding-read.ts');
const {activeNavigationHref}=load('src/lib/active-navigation.ts');
test('optional branding stalls or errors fall back without resolving required permissions',async()=>{
 assert.equal((await readShellBranding(new Promise(()=>{}),5)).company_name,'Operations');
 assert.equal((await readShellBranding(Promise.reject(Error('synthetic denied')),5)).logo_url,null);
 const branding={company_name:'Synthetic A',logo_url:null};assert.equal(await readShellBranding(Promise.resolve(branding),20),branding);
 const layout=fs.readFileSync('src/app/(app)/layout.tsx','utf8');assert.match(layout,/Promise.all\(\[getPermissionMap\(permissionCodes\), readShellBranding\(getCompanyBranding\(\)\)\]/);
});
test('timed out request aborts once and never replays or treats a late mutation as cancellation',async()=>{
 let calls=0,signal,resolve;const promise=requestDeadline(s=>{calls++;signal=s;return new Promise(r=>{resolve=r;});},5,'Synthetic outcome unconfirmed');
 await assert.rejects(promise,/unconfirmed/);assert.equal(signal.aborted,true);resolve({saved:true});await new Promise(r=>setImmediate(r));assert.equal(calls,1);
});
test('request deadline retains normal response and original error',async()=>{
 const value={synthetic:1};assert.equal(await requestDeadline(async()=>value,20,'timeout'),value);
 const error=Error('synthetic validation');await assert.rejects(requestDeadline(async()=>{throw error;},20,'timeout'),e=>e===error);
});
test('RO child workspace wins while parent profiles and query variants remain navigable',()=>{
 const hrefs=['/people','/people/ro','/purchase-requests','/purchase-requests?status=draft'];
 assert.equal(activeNavigationHref('/people/ro',new URLSearchParams(),hrefs),'/people/ro');
 assert.equal(activeNavigationHref('/people/synthetic/profile',new URLSearchParams(),hrefs),'/people');
 assert.equal(activeNavigationHref('/purchase-requests',new URLSearchParams('status=draft'),hrefs),'/purchase-requests?status=draft');
 assert.equal(activeNavigationHref('/people-other',new URLSearchParams(),hrefs),null);
 assert.equal(activeNavigationHref('/people/ro',new URLSearchParams(),['/people']),'/people');
});
test('import draft identity is separated by user, company and entity, ignoring old global key',()=>{
 const source=fs.readFileSync('src/components/imports/import-workflow.tsx','utf8');
 const fn=source.match(/function draftKey[\s\S]*?\n}/)[0];const context={};vm.runInNewContext(ts.transpile(fn+'\nthis.key=draftKey;'),context);
 const store=new Map();store.set(context.key('items','companyA:userA'),{rows:['synthetic']});store.set('seri-bako-import-draft-items',{rows:['legacy']});
 assert.equal(store.get(context.key('items','companyA:userB')),undefined);assert.equal(store.get(context.key('items','companyB:userA')),undefined);assert.equal(store.get(context.key('suppliers','companyA:userA')),undefined);assert.deepEqual(store.get(context.key('items','companyA:userA')).rows,['synthetic']);
 assert.match(source,/ScopedImportWorkflow key=\{`\$\{props.draftScope}:\$\{props.entity}`}/);
 assert.doesNotMatch(source,/draftKey\(entity\)/);assert.match(source,/Existing saved data was not removed/);
 for(const file of ['imports/[entity]','opening-stock/import']) assert.match(fs.readFileSync(`src/app/(app)/${file}/page.tsx`,'utf8'),/draftScope=\{`\$\{profile.company_id}:\$\{profile.id}/);
});
test('workbook deadlines cover body parsing, block repeated posts and ignore stale reads',()=>{
 const source=fs.readFileSync('src/components/attendance/schedule-workbook-import.tsx','utf8');
 assert.equal((source.match(/await requestDeadline\(/g)||[]).length,4);assert.match(source,/mutationPending.current = true/);assert.match(source,/requestId !== requestVersion.current/);assert.match(source,/requestVersion.current\+\+/);assert.match(source,/60_000, "Import result is unconfirmed/);assert.match(source,/status:"unconfirmed"/);assert.doesNotMatch(source,/Retry the same selection/);
});
test('page jump owns its real input target and focus, and all audited callers reuse pagination',()=>{
 const pagination=fs.readFileSync('src/components/sortable-table.tsx','utf8');assert.match(pagination,/className="h-\[var\(--sb-control-height\)] min-w-\[var\(--sb-control-height\)] w-11/);assert.match(pagination,/focus-visible:outline-2/);
 for(const rel of ['assets/[id]/history','maintenance/[id]','transfers/[id]','locations/[id]']) {const s=fs.readFileSync(`src/app/(app)/asset-management/${rel}/page.tsx`,'utf8');assert.match(s,/<PaginationControls page=\{page} totalPages=\{Math.max\(1, Math.ceil\(data.total \/ 50\)\)}/);assert.doesNotMatch(s,/<nav[^>]*aria-label="[^"]* pages"/);}
 const location=fs.readFileSync('src/app/(app)/asset-management/locations/[id]/page.tsx','utf8');assert.match(location,/searchParams=\{\{ date, check: query.check }}/);
 const review=fs.readFileSync('src/app/(app)/attendance/review/page.tsx','utf8');assert.match(review,/<PaginationControls page=\{page} totalPages=\{totalPages} totalRows=\{review.total} searchParams=\{filterParams}/);assert.doesNotMatch(review,/asChild[\s\S]{0,100}disabled=\{page/);
});
test('same semantic colors resolve through canonical RGB channels and fine-only planning density',()=>{
 const css=fs.readFileSync('src/app/design-system-v2.css','utf8'),tailwind=fs.readFileSync('tailwind.config.ts','utf8');
 for(const token of ['sb-green-900-rgb','sb-text-rgb','sb-text-muted-rgb'])assert.match(tailwind,new RegExp(`rgb\\(var\\(--${token}\\) / <alpha-value>\\)`));
 assert.match(css,/@media \(min-width: 1024px\) and \(pointer: fine\) \{\nhtml\[data-design-layer="v2"\] :is\(\.sb-planning-workspace/);
 assert.match(css,/@media \(max-width: 1023px\), \(pointer: coarse\) \{/);
 assert.match(css,/\.sb-pr-phone-amount \{[^}]*font-weight: 400/);
 const po=fs.readFileSync('src/app/(app)/purchase-orders/page.tsx','utf8');assert.match(po,/secondary=\{[\s\S]*?<Button asChild variant="ghost" size="sm"[\s\S]*?<Link href=\{`\/purchase-requests\//);
});
test('audited mutation handlers cannot add a naked fetch outside the shared deadline',()=>{
 for(const file of ['src/components/attendance/template-admin.tsx','src/components/attendance/schedule-workbook-import.tsx','src/components/imports/import-workflow.tsx']){
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let calls=0;
  function walk(node,guarded=false){const next=guarded||(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='requestDeadline');if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='fetch'){calls++;assert(next,`${file}: every fetch must have bounded recovery semantics`);}ts.forEachChild(node,child=>walk(child,next));}
  walk(source);assert(calls>0,file);
 }
});
test('Button asChild cannot pretend that a link has native disabled semantics',()=>{
 const path=require('node:path');function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(file.endsWith('.tsx')){const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);function walk(node){if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(source)==='Button'){const names=node.attributes.properties.filter(ts.isJsxAttribute).map(p=>p.name.getText(source));assert(!(names.includes('asChild')&&names.includes('disabled')),`${file}: render a real disabled boundary button`);}ts.forEachChild(node,walk);}walk(source);}}}scan('src');
});
