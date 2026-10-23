const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
async function fixture(run) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'oms-release-check-'));
 try {
  for(const p of ['src/lib','docs/releases'])fs.mkdirSync(path.join(dir,p),{recursive:true});
  fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({version:'9.2.129'}));
  fs.writeFileSync(path.join(dir,'package-lock.json'),JSON.stringify({version:'9.2.129',packages:{'':{version:'9.2.129'}}}));
  fs.writeFileSync(path.join(dir,'src/lib/app-version.ts'),'export const APP_VERSION = "9.2.129";');
  for(const p of ['PRODUCT.md','DESIGN.md'])fs.writeFileSync(path.join(dir,p),'## v9.2.129 (Preview candidate)\n');
  fs.writeFileSync(path.join(dir,'docs/releases/preview-v9.2.129-readiness.md'),'# v9.2.129 (Preview candidate)\n');
  await run(dir,(await import('../scripts/check-release-consistency.mjs')).checkRelease);
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
test('a coherent Preview release advances beyond the verified deployed version',()=>fixture((dir,check)=>assert.equal(check(dir,'9.2.128').version,'9.2.129')));
test('footer, lockfile and current product/design release drift each block publication',()=>fixture((dir,check)=>{
 for(const file of ['package-lock.json','src/lib/app-version.ts','PRODUCT.md','DESIGN.md']){
  const p=path.join(dir,file), before=fs.readFileSync(p,'utf8');fs.writeFileSync(p,before.replaceAll('9.2.129','9.2.128'));
  assert.throws(()=>check(dir,'9.2.128'),/Release consistency failed/);fs.writeFileSync(p,before);
 }
}));
test('a reused or older version fails even when every release file agrees',()=>fixture((dir,check)=>{
 assert.throws(()=>check(dir,'9.2.129'),/must advance/);assert.throws(()=>check(dir,'10.0.0'),/must advance/);
}));
test('missing release notes cannot be mistaken for a complete release record',()=>fixture((dir,check)=>{
 fs.unlinkSync(path.join(dir,'docs/releases/preview-v9.2.129-readiness.md'));assert.throws(()=>check(dir),/matching Preview release note/);
}));
