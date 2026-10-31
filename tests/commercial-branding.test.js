const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')();
const {parseCompanyTheme,companyThemeTokens,contrastRatio}=load('src/lib/branding/company-theme.ts');
test('theme parser refuses CSS injection and old schemas preserve default colours',()=>{
 for(const value of [null,{},'red',{version:2,primary:'#ffffff'},{version:1,primary:'red'},{version:1,primary:'#fff;url(https://invalid.test)'}])assert.equal(parseCompanyTheme(value),null);
 assert.deepEqual(JSON.parse(JSON.stringify(companyThemeTokens(null))),{});
 assert.equal(parseCompanyTheme({version:1,primary:'#AABBCC'}).primary,'#aabbcc');
});
test('generated action and highlight text pass contrast for extreme company colours',()=>{
 for(const primary of ['#ffffff','#000000','#ffff00','#00ff00','#ff0000','#0000ff','#ffaaee','#074b37']){
  const tokens=companyThemeTokens({version:1,primary});assert(contrastRatio(tokens['--sb-primary'],'#ffffff')>=4.5,primary);
  assert(contrastRatio(tokens['--sb-highlight-text'],tokens['--sb-highlight'])>=4.5,primary);
  assert(contrastRatio(tokens['--sb-disabled-text'],tokens['--sb-disabled-bg'])>=4.5);
  assert(!('--sb-danger' in tokens));assert(!('--sb-success' in tokens));assert(!('--sb-warning' in tokens));
 }
});
test('theme generation has no cross-company mutable state',()=>{
 const one=companyThemeTokens({version:1,primary:'#254b91'}),two=companyThemeTokens({version:1,primary:'#624399'});
 assert.notEqual(one['--sb-primary'],two['--sb-primary']);assert.deepEqual(JSON.parse(JSON.stringify(companyThemeTokens(null))),{});
});
test('repair grouping retains every status under its asset and keeps general issues separate',()=>{
 const {groupMaintenanceRequests}=load('src/lib/asset-maintenance-groups.ts');
 const rows=[{id:'new',asset_id:'one',status:'Open'},{id:'old',asset_id:'one',status:'Assigned'},{id:'closed',asset_id:'one',status:'Closed'},{id:'other',asset_id:'two',status:'Open'},{id:'site',asset_id:null,status:'Open'}];
 const grouped=groupMaintenanceRequests(rows);assert.equal(grouped.length,3);assert.equal(grouped[0].length,3);assert.equal(grouped.flat().length,rows.length);assert.equal(rows[0].status,'Open');
});

test('direct outline link styles remove transparent border just like the shared Button',()=>{
 const {buttonVariants}=load('src/components/ui/button.tsx');
 const outline=buttonVariants({variant:'outline'}).split(/\s+/);
 assert(outline.includes('border-[var(--sb-border)]'));assert(!outline.includes('border-transparent'));
 const explicit=buttonVariants({variant:'outline',className:'w-full border-[var(--sb-text-muted)]'}).split(/\s+/);
 assert(explicit.includes('border-[var(--sb-text-muted)]'));assert(!explicit.includes('border-transparent'));assert(!explicit.includes('border-[var(--sb-border)]'));
 assert(buttonVariants({variant:'default'}).includes('bg-[var(--sb-green-900)]'));
});
