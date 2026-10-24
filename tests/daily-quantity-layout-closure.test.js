const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),postcss=require('postcss');
const form=fs.readFileSync('src/components/outlet-daily-record-form.tsx','utf8');
const page=fs.readFileSync('src/app/(app)/outlet-daily-records/page.tsx','utf8');
const css=postcss.parse(fs.readFileSync('src/app/design-system-v2.css','utf8'));
test('Daily carryover guidance belongs once to its group and each input references it',()=>{
 assert.match(form,/group\.some\(product => product\.daily_tracking === "food_carryover"\)/);
 assert.equal((form.match(/count only stock fit to sell/g)||[]).length,1);
 assert.match(form,/aria-describedby=\{`saleable-help-\$\{tracking\}`\}/);
 assert.doesNotMatch(form,/Count only stock still fit to sell tomorrow/);
 for(const field of ['saleable_next_day_qty','line_product_id','daily_tracking','morning_received_qty','qty_sent'])assert.ok(form.includes(`name="${field}"`));
 assert.match(form,/max="1000000" step="0.01" value=\{saleable\}/);
 assert.match(form,/disabled=\{locked \|\| !canEditOutletValues\}/);
});
test('Daily quantities share fluid four tracks and carryover does not wrap its fourth input',()=>{
 let tracks=false,width=false,height=false;
 css.walkRules(r=>r.walkDecls(d=>{
 if(r.selector==='.sb-daily-line-head,\n.sb-daily-product-line'&&r.parent.type==='root'&&d.prop==='grid-template-columns')tracks=d.value==='repeat(4, minmax(0, 1fr))';
 if(r.selector==='.sb-daily-product-line input[type="number"]'){if(d.prop==='width')width=d.value==='100%';if(d.prop==='min-height')height=d.value==='var(--sb-control-height)';}
 }));assert.ok(tracks);assert.ok(width);assert.ok(height);
 assert.match(form,/tracking === "food_carryover" \? <label className="min-w-0"/);
 assert.match(form,/tracking !== "food_daily" \? <span>/);
 assert.doesNotMatch(form,/· Not counted/);
 assert.match(form,/sb-daily-balance min-w-0/);
});
test('Daily table and compact rows share one 1280 switch with accessible scrolling',()=>{
 assert.match(page,/compactUntil="xl" scrollbar="auto" aria-label="Outlet daily records"/);
 assert.match(page,/showUntil="xl"/);assert.doesNotMatch(page,/compactUntil="2xl"|showUntil="2xl"/);
 let track=false;css.walkRules(r=>{if(r.selector.includes('form.sb-outlet-daily-filters .unified-list-result')&&r.parent.params==='(max-width: 639px)')r.walkDecls('grid-row',d=>{assert.equal(d.value,'1');track=true;});});assert.ok(track);
});

test('Daily absent submitter stays absent rather than being inferred as System',()=>{
 const query=fs.readFileSync('src/server/queries/outlet-daily-records.ts','utf8');
 const expression=query.match(/submitted_by_name: ([^\n]+),/)[1];
 const evaluate=new Function('record','actorDisplayMap','actorDisplayName',`return (${expression});`);
 const lookup=(_map,id)=>id==='actual'?'Actual submitter':'Unknown user';
 for(const id of [null,undefined,''])assert.equal(evaluate({submitted_by:id},new Map(),lookup),null);
 assert.equal(evaluate({submitted_by:'actual'},new Map(),lookup),'Actual submitter');
 assert.equal(evaluate({submitted_by:'unresolved'},new Map(),lookup),'Unknown user');
});

test('phone date styles target the visible DateInput wrapper rather than transparent native input',()=>{
 let wrapper=false;css.walkRules(r=>{if(r.selector.includes('form.sb-outlet-daily-filters .unified-list-date-control')&&r.parent.params==='(max-width: 639px)'){let padding,font;r.walkDecls(d=>{if(d.prop==='padding-inline')padding=d.value;if(d.prop==='font-size')font=d.value;});wrapper=padding==='6px'&&font==='12px';}});assert.ok(wrapper);
});

test('Daily list uses actual last updater and bounded centered table content',()=>{
 assert.match(page,/<dt>Last updated by<\/dt>/);
 assert.match(page,/title=\{row.updated_by_name \?\? "Not recorded"\}/);
 assert.match(page,/line-clamp-2 break-words/);
 assert.match(page,/flex justify-center text-center/);
});

test('Last updated by never infers a missing updater from submission or creation',()=>{
 const query=fs.readFileSync('src/server/queries/outlet-daily-records.ts','utf8');
 assert.match(query,/updated_by_name: record.updated_by \? actorDisplayName\(actorDisplayMap, record.updated_by\) : null/);
 assert.doesNotMatch(query,/updated_by_name: [^\n]*updated_by \?\? record.submitted_by/);
});
