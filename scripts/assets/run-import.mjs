import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { stageSnapshot, applySnapshotDelta, restoreStagingLedger, checkpointAttachmentRecovery, validateSnapshot, validateRecovery, ledgerTables } from './import-ledger.mjs';
import { planDelta } from './plan-import-delta.mjs';

// There is deliberately no activation command. Source freeze, verified legacy
// attachments and authenticated operational acceptance are separate gates.
async function main() {
const allowed = new Set(['action','company','payload','previous','recovery','recovery-output','expect-file-sha256','execute']);
const args = {};
for (let i=2;i<process.argv.length;i++) {
  const key=process.argv[i].replace(/^--/,'');
  if (!process.argv[i].startsWith('--') || !allowed.has(key) || Object.hasOwn(args,key)) throw new Error('Invalid import argument. See scripts/assets/README.md.');
  if (key==='execute') args[key]=true;
  else { if (!process.argv[i+1] || process.argv[i+1].startsWith('--')) throw new Error('Missing import argument.'); args[key]=process.argv[++i]; }
}
if (!['stage','delta','restore','checkpoint'].includes(args.action)) throw new Error('Choose stage, delta, restore or checkpoint.');
const inputPath = ['restore','checkpoint'].includes(args.action) ? args.recovery : args.payload;
if (!inputPath || !args.company) throw new Error('A private input file and explicit company are required.');
const bytes=await fs.readFile(inputPath), fileHash=createHash('sha256').update(bytes).digest('hex'), payload=JSON.parse(bytes.toString('utf8'));
let previous;
if (!['restore','checkpoint'].includes(args.action)) validateSnapshot(payload,args.company);
else validateRecovery(payload,args.company);
if (args.action==='delta') {
  if (!args.previous) throw new Error('The reviewed previous snapshot is required.');
  previous=JSON.parse(await fs.readFile(args.previous,'utf8'));validateSnapshot(previous,args.company);
  const plan=planDelta(previous,payload);
  if (!plan.ready_for_rehearsal) throw new Error('Delta contains unresolved source removals or historical identities.');
}
if (!args.execute) {
  console.log(JSON.stringify({action:args.action,company_id:args.company,file_sha256:fileHash,counts:['restore','checkpoint'].includes(args.action)?undefined:Object.fromEntries(ledgerTables.map(table=>[table,payload[table].length])),changes:previous?planDelta(previous,payload).counts:undefined,writes:false,activated:false}));
} else {
  if (args['expect-file-sha256']!==fileHash) throw new Error('The input file differs from the explicitly reviewed SHA256.');
  if (!process.env.OMS_ASSET_DATABASE_URL || !process.env.PG_MODULE) throw new Error('Set the dedicated database URL and official pg runtime module. No existing environment URL is reused.');
  const target=new URL(process.env.OMS_ASSET_DATABASE_URL);
  if (!['postgres:','postgresql:'].includes(target.protocol) || ['sslmode','sslcert','sslkey','sslrootcert'].some(key=>target.searchParams.has(key))) throw new Error('Use a PostgreSQL URL without TLS overrides; remote connections require certificate verification.');
  const module=await import(pathToFileURL(process.env.PG_MODULE)), Client=module.Client??module.default?.Client;
  const client=new Client({connectionString:target.toString(),ssl:['127.0.0.1','localhost','[::1]'].includes(target.hostname)?false:{rejectUnauthorized:true}});
  try {
    await client.connect();
    const saveRecovery=async record=>{
      const output=args['recovery-output'], root=fileURLToPath(new URL('../../',import.meta.url));
      if (!output || path.resolve(output).startsWith(root)) throw new Error('Save the private recovery snapshot outside the repository.');
      const handle=await fs.open(output,'wx',0o600);
      try { await handle.writeFile(JSON.stringify(record)); await handle.sync(); } finally { await handle.close(); }
    };
    const result=args.action==='checkpoint'?await checkpointAttachmentRecovery(client,payload,args.company,saveRecovery):args.action==='restore'?await restoreStagingLedger(client,payload,args.company):args.action==='delta'?await applySnapshotDelta(client,previous,payload,args.company,saveRecovery):await stageSnapshot(client,payload,args.company,saveRecovery);
    console.log(JSON.stringify({action:args.action,...result}));
  } finally { await client.end(); }
}
}
try { await main(); }
catch (error) {
  // Database errors can contain original source IDs or field values. Keep
  // diagnostics private instead of printing their raw contents to shared logs.
  const directory=await fs.mkdtemp(path.join(tmpdir(),'oms-asset-import-error-'));
  const diagnostic=path.join(directory,'error.txt');
  await fs.writeFile(diagnostic,error instanceof Error?error.stack??error.message:'Import stopped.',{mode:0o600});
  console.error(`Asset import stopped. No activation was requested. Private diagnostic: ${diagnostic}`);
  process.exitCode=1;
}
