const assert=require('node:assert/strict');
module.exports=()=>{
 const {listenForFormPendingRecovery}=require('./load-source.cjs')()('src/lib/form-pending-recovery.ts');
 const doc=new EventTarget(),win=new EventTarget();let releases=0,submits=0;const form=new EventTarget();
 doc.addEventListener('submit',()=>submits++);
 const stop=listenForFormPendingRecovery(doc,win,target=>target===form,()=>releases++);
 doc.dispatchEvent(new Event('reset'));assert.equal(releases,0,'unrelated form reset ignored');
 // EventTarget cannot bubble; use a deterministic document adapter for exact target.
 let onReset;const adapter={addEventListener:(name,fn)=>{if(name==='reset')onReset=fn;},removeEventListener:()=>{onReset=null;}};
 const stopForm=listenForFormPendingRecovery(adapter,new EventTarget(),target=>target===form,()=>releases++);
 onReset({target:form});assert.equal(releases,1);onReset({target:new EventTarget()});assert.equal(releases,1);
 win.dispatchEvent(new Event('pageshow'));win.dispatchEvent(new Event('popstate'));assert.equal(releases,3);
 stop();win.dispatchEvent(new Event('pageshow'));assert.equal(releases,3,'unmount removes listeners');stopForm();assert.equal(onReset,null);
 assert.equal(submits,0,'recovery never replays submissions');
};
