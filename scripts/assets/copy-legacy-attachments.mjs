import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { reconcileAttachments } from './reconcile-attachments.mjs';
import { assetAttachmentSignature } from '../../src/lib/asset-attachments.ts';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

/** Separately authorized local evidence only: no legacy URL is fetched. */
export async function copyLegacyAttachments(snapshot,payload,evidence,client,readFile=fs.readFile,onVerified=async()=>{}) {
  const plan=await reconcileAttachments(snapshot,payload,evidence,readFile);
  if (!plan.summary.ready_for_storage_copy) throw new Error('Resolve every original file and folder reference before copying.');
  const results=[];
  for (const attachment of plan.attachments) {
    const original=payload.asset_attachments.find(row=>row.id===attachment.attachment_id), file=attachment.file;
    const args={p_company:plan.company_id,p_attachment:attachment.attachment_id,p_source_sha256:plan.source_sha256,p_source_key:attachment.source_key,p_url:original.url,p_asset:attachment.asset_id,p_maintenance:attachment.maintenance_id,p_location:attachment.location_id,p_type:file.mime_type};
    const prepared=await client.rpc('legacy_asset_attachment_target',args);
    if (prepared.error || typeof prepared.data!=='string') throw new Error('Staged legacy attachment no longer matches the reviewed source.');
    const expected=prepared.data;
    if (!expected.startsWith(`${plan.company_id}/${attachment.asset_id}/legacy-${attachment.attachment_id}.`) || expected.includes('..')) throw new Error('Legacy attachment target could not be verified.');
    const bytes=await readFile(file.local_path);
    if (bytes.length!==file.size_bytes || digest(bytes)!==file.sha256 || !assetAttachmentSignature(file.mime_type,bytes)) throw new Error('Local attachment changed after reconciliation.');
    const bucket=client.storage.from('asset-documents');
    await bucket.upload(expected,bytes,{contentType:file.mime_type,upsert:false});
    // A prior attempt can have uploaded successfully before losing its reply.
    // Never overwrite: verify actual stored bytes, including on every retry.
    const stored=await bucket.download(expected);
    if (stored.error || !stored.data) throw new Error('Legacy copy did not finish; retry without replacing files.');
    const downloaded=Buffer.from(await stored.data.arrayBuffer());
    if (downloaded.length!==bytes.length || digest(downloaded)!==file.sha256 || !assetAttachmentSignature(file.mime_type,downloaded)) throw new Error('Stored legacy attachment does not match the reviewed file.');
    const verified=await client.rpc('verify_legacy_asset_attachment',{...args,p_path:expected,p_sha256:file.sha256});
    if (verified.error || verified.data!==true) throw new Error('Legacy attachment verification stopped; no cutover was requested.');
    const receipt={attachment_id:attachment.attachment_id,storage_path:expected,sha256:file.sha256,verified:true};
    await onVerified(receipt);
    results.push(receipt);
  }
  return {company_id:plan.company_id,source_sha256:plan.source_sha256,attachments:results,activated:false};
}
async function main(){
  const args={};
  for(let i=2;i<process.argv.length;i++){
    const key=process.argv[i].replace(/^--/,'');
    if(!process.argv[i].startsWith('--') || !['snapshot','payload','evidence','company','expect-plan-sha256','execute','output'].includes(key) || Object.hasOwn(args,key))throw new Error('Invalid copy argument.');
    if(key==='execute')args[key]=true;else {if(!process.argv[i+1] || process.argv[i+1].startsWith('--'))throw new Error('Missing copy argument.');args[key]=process.argv[++i];}
  }
  if(!args.snapshot||!args.payload||!args.evidence||!args.company)throw new Error('Private source/evidence and explicit company are required.');
  const [snapshot,payload,evidence]=await Promise.all([args.snapshot,args.payload,args.evidence].map(async name=>JSON.parse(await fs.readFile(name,'utf8'))));
  const plan=await reconcileAttachments(snapshot,payload,evidence);
  if(plan.company_id!==args.company)throw new Error('Company does not match the reviewed source.');
  const planHash=digest(JSON.stringify(plan));
  if(!args.execute){console.log(JSON.stringify({plan_sha256:planHash,...plan.summary,writes:false,activated:false}));return;}
  if(!plan.summary.ready_for_storage_copy||args['expect-plan-sha256']!==planHash)throw new Error('Review the complete resolved copy plan first.');
  if(!process.env.OMS_ASSET_SUPABASE_URL||!process.env.OMS_ASSET_SERVICE_ROLE_KEY)throw new Error('Dedicated reviewed Supabase URL and service credential are required.');
  const url=new URL(process.env.OMS_ASSET_SUPABASE_URL);
  if(url.protocol!=='https:'&&!(['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.protocol==='http:'))throw new Error('Remote Storage requires HTTPS.');
  const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),output=path.resolve(args.output??'');
  if(!args.output||output===root||output.startsWith(`${root}/`))throw new Error('Save the private copy receipt outside the repository.');
  // Prove the receipt can be created before any Storage write. Keep partial
  // progress explicit on failure; immutable object paths make retries safe.
  const handle=await fs.open(output,'wx',0o600);
  try{
    await handle.writeFile(JSON.stringify({company_id:plan.company_id,source_sha256:plan.source_sha256,plan_sha256:planHash,state:'started',activated:false})+'\n');await handle.sync();
    const client=createClient(url.href,process.env.OMS_ASSET_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const result=await copyLegacyAttachments(snapshot,payload,evidence,client,fs.readFile,async receipt=>{
      await handle.writeFile(JSON.stringify({state:'attachment_verified',...receipt})+'\n');await handle.sync();
    });
    await handle.writeFile(JSON.stringify({...result,plan_sha256:planHash,state:'verified'})+'\n');await handle.sync();
    console.log(JSON.stringify({copied:result.attachments.length,verified:true,activated:false}));
  }finally{await handle.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{console.error('Legacy attachment copy stopped. Review private evidence and receipt; no source URL was fetched or cutover requested.');process.exitCode=1;});
