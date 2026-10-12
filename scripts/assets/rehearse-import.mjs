import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageSnapshot, restoreStagingLedger, ledgerFingerprint } from './import-ledger.mjs';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE));
const payload = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const branches = JSON.parse(await fs.readFile(process.argv[3], 'utf8')).rows;
const db = new PGlite();
const recoveryDir=await fs.mkdtemp(join(tmpdir(),'oms-asset-rehearsal-'));
try {
// Only an ephemeral local database is used. This script has no production connection.
const fixture = await fs.readFile('scripts/assets/test-asset-db.mjs', 'utf8');
await db.exec(fixture.split('await db.exec(`')[1].split('`);')[0]);
await db.exec(await fs.readFile('supabase/migrations/337_asset_management_foundation.sql', 'utf8'));
await db.query('insert into companies values($1)', [branches[0].company_id]);
for (const b of branches) await db.query('insert into branches values($1,$2)', [b.id, b.company_id]);
let recovery;
await stageSnapshot(db,payload,branches[0].company_id,async record=>{
  const handle=await fs.open(join(recoveryDir,'recovery.json'),'wx',0o600);
  try {await handle.writeFile(JSON.stringify(record));await handle.sync();} finally {await handle.close();}
  recovery=record;
});
assert.equal((await stageSnapshot(db,payload,branches[0].company_id,async()=>assert.fail('A replay must not overwrite the recovery file'))).unchanged,true);
for (const [table,rows] of Object.entries(payload)) assert.equal((await db.query(`select count(*)::int n from public.${table} where company_id=$1`,[branches[0].company_id])).rows[0].n,rows.length);
const holdings = (await db.query('select asset_id,location_id,quantity from asset_holdings')).rows;
for (const h of payload.asset_holdings) assert.equal(holdings.find(row => row.asset_id === h.asset_id && row.location_id === h.location_id)?.quantity, h.quantity);
assert.equal(holdings.filter(row => row.quantity === null).length, 31);
assert.equal(holdings.reduce((sum, row) => sum + (row.quantity ?? 0), 0), 2080);

if (process.argv[4]) {
  const columns = (await db.query("select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and (table_name like 'asset_%' or table_name='assets') order by table_name,ordinal_position")).rows;
  let definitions = '';
  for (const table of Object.keys(payload).sort()) {
    const fields = columns.filter(column => column.table_name === table).map(column => {
      const type = column.data_type === 'jsonb' ? 'Json' : column.data_type === 'boolean' ? 'boolean' : ['integer', 'bigint', 'numeric'].includes(column.data_type) ? 'number' : 'string';
      return `${column.column_name}: ${type}${column.is_nullable === 'YES' ? ' | null' : ''};`;
    });
    definitions += `      ${table}: TableDefinition<{ ${fields.join(' ')} }>;\n`;
  }
  await fs.writeFile(process.argv[4], definitions);
}
// Restore from bytes actually persisted to disk, not the in-memory callback.
const persistedRecovery=JSON.parse(await fs.readFile(join(recoveryDir,'recovery.json'),'utf8'));
assert.equal(persistedRecovery.version,2);
assert.equal(ledgerFingerprint(persistedRecovery.after),recovery.after_fingerprint);
assert.equal(ledgerFingerprint(persistedRecovery.before),recovery.before_fingerprint);
await restoreStagingLedger(db,persistedRecovery,branches[0].company_id);
assert.equal((await db.query('select count(*)::int n from assets')).rows[0].n,0);
console.log('Local rehearsal passed: exact fields, IDs, relationships, quantities, repeat import and complete staging recovery. Attachments remain unverified; no production writes.');
} finally { await db.close(); await fs.rm(recoveryDir,{recursive:true,force:true}); }
