// Actual installed SDK, synthetic cookie jar/Auth transport only. No real session.
const test=require('node:test'),assert=require('node:assert/strict');
const {createServerClient}=require('@supabase/ssr');
const {sessionVerificationState}=require('./helpers/load-source.cjs')()('src/lib/http/session-result.ts');
const {readableSessionCookies}=require('./helpers/load-source.cjs')({URL})('src/lib/supabase/session-cookies.ts');
const key='sb-synthetic-auth-token';
const user={id:'00000000-0000-4000-8000-000000000011',aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
const jwt=expired=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+(expired?-3600:3600)})).toString('base64url'),Buffer.alloc(32,1).toString('base64url')].join('.');
function fixture(raw,{refreshError=null}={}){
 const jar=new Map(Array.isArray(raw)?raw:raw==null?[]:[[key,raw]]),changes=[],calls=[];
 const session=()=>({access_token:jwt(false),refresh_token:'synthetic-new-refresh',token_type:'bearer',expires_in:3600,user});
 const client=createServerClient('http://synthetic.invalid','synthetic-key',{global:{fetch:async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,'http://synthetic.invalid');calls.push({path:url.pathname,grant:url.searchParams.get('grant_type')});const headers={'content-type':'application/json','x-supabase-api-version':'2024-01-01'};if(url.pathname.endsWith('/token')){if(url.searchParams.get('grant_type')==='refresh_token'&&refreshError)return new Response(JSON.stringify({code:refreshError,error_code:refreshError,message:'Synthetic refresh rejected'}),{status:400,headers});return new Response(JSON.stringify(session()),{status:200,headers});}if(url.pathname.endsWith('/user'))return new Response(JSON.stringify(user),{status:200,headers});throw Error('Unexpected synthetic Auth request');}},cookies:{getAll:()=>readableSessionCookies([...jar].map(([name,value])=>({name,value})),'http://synthetic.invalid'),setAll:items=>{for(const item of items){changes.push(item);if(item.options?.maxAge===0)jar.delete(item.name);else jar.set(item.name,item.value);}}}});
 return{client,jar,changes,calls};
}
function stored({expired=false,accessToken=jwt(expired)}={}){return JSON.stringify({access_token:accessToken,refresh_token:'synthetic-old-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+(expired?-3600:3600),user});}
async function verify(client){try{return await client.auth.getClaims();}catch(error){return{data:null,error};}}
test('real SDK rejected expired refresh token becomes expired and emits only its own cookie cleanup',async()=>{
 for(const refreshError of ['refresh_token_not_found','refresh_token_already_used']){const f=fixture(stored({expired:true}),{refreshError}),r=await verify(f.client);assert.equal(sessionVerificationState(r.data?.claims,r.error),'expired');assert.ok(f.calls.some(c=>c.grant==='refresh_token'));assert.ok(f.changes.some(c=>c.options?.maxAge===0));assert.ok(f.changes.every(c=>c.name.startsWith(key)));}
});
test('only undecodable current-project chunks are ignored in-memory; browser inputs and other cookies are unchanged',async()=>{
 const raw=[{name:key+'.0',value:'base64-abc'},{name:key+'.1',value:'!!!'},{name:'sb-other-auth-token',value:'base64-!!!'},{name:key+'-code-verifier',value:'keep-code'},{name:'preference',value:'keep-pref'}],before=JSON.stringify(raw),safe=await readableSessionCookies(raw,'http://synthetic.invalid');assert.equal(JSON.stringify(raw),before);assert.equal(safe[0].value,'');assert.equal(safe[1].value,'');assert.equal(safe[2].value,'base64-!!!');assert.equal(safe[3].value,'keep-code');assert.equal(safe[4].value,'keep-pref');const encoded='base64-'+Buffer.from(stored()).toString('base64url'),good=[{name:key,value:encoded},{name:key+'.0',value:'base64-!!!'}];assert.equal(await readableSessionCookies(good,'http://synthetic.invalid'),good);const chunks=[{name:key+'.0',value:encoded.slice(0,25)},{name:key+'.1',value:encoded.slice(25)}];assert.equal(await readableSessionCookies(chunks,'http://synthetic.invalid'),chunks);
});
test('real SDK valid cookie and usable refresh remain verified; no valid session is manually cleared',async()=>{
 for(const expired of [false,true]){const f=fixture(stored({expired})),r=await verify(f.client);assert.equal(r.error,null);assert.equal(r.data.claims.sub,user.id);assert.ok(!f.changes.some(c=>c.options?.maxAge===0&&c.value===''));if(expired)assert.ok(f.calls.some(c=>c.grant==='refresh_token'));}
});
test('real SDK malformed stored JSON or JWT cannot become active and explicit password login replaces old state',async()=>{
 for(const raw of ['not-json',stored({accessToken:'invalid-jwt'}),'base64-!!!',[[key+'.0','base64-abc'],[key+'.1','!!!']]]){const f=fixture(raw),before=await verify(f.client);assert.notEqual(sessionVerificationState(before.data?.claims,before.error),'active');const login=await f.client.auth.signInWithPassword({email:user.email,password:'synthetic-password'});assert.equal(login.error,null);const after=await verify(f.client);assert.equal(after.error,null);assert.equal(after.data.claims.sub,user.id);assert.ok(f.calls.some(c=>c.grant==='password'));}
});
