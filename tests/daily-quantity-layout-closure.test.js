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
test('Daily four quantity tracks stay 72px and touch height remains 44px',()=>{
 let four=false,width=false,height=false;
 css.walkRules(r=>r.walkDecls(d=>{
 if(r.selector==='.sb-daily-line-head.sb-daily-line-four,\n.sb-daily-product-line.sb-daily-line-four'&&r.parent.type==='root'&&d.prop==='grid-template-columns')four=d.value==='repeat(4, 72px)';
 if(r.selector==='.sb-daily-product-line input[type="number"]'){if(d.prop==='width')width=d.value==='72px';if(d.prop==='min-height')height=d.value==='44px';}
 }));assert.ok(four);assert.ok(width);assert.ok(height);
 assert.match(form,/packaging \|\| sold \? "sb-daily-line-four"/);
 assert.match(form,/sb-daily-balance min-w-0/);
 assert.doesNotMatch(form,/col-span-full grid min-w-0 grid-cols-2 items-center gap-3 xl:col-span-1 xl:col-start-5 xl:block/);
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
