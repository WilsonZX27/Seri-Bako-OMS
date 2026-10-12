import { planDelta, fingerprint } from './plan-import-delta.mjs';

export const ledgerTables = ['asset_import_batches','asset_locations','assets','asset_master_updates','asset_holdings','asset_maintenance','asset_maintenance_updates','asset_daily_checks','asset_transfers','asset_transfer_updates','asset_attachments','asset_suppliers','asset_calendar_days'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = /^[0-9a-f]{64}$/;
const identifier = value => { if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid ledger column.'); return `"${value}"`; };

export function validateSnapshot(payload, company) {
  if (!uuid.test(company) || Object.keys(payload).length !== ledgerTables.length || Object.keys(payload).some(table => !ledgerTables.includes(table))) throw new Error('Invalid company or ledger table set.');
  for (const table of ledgerTables) {
    if (!Array.isArray(payload[table])) throw new Error(`Missing ledger table: ${table}`);
    const ids = new Set();
    for (const row of payload[table]) {
      if (!row || !uuid.test(row.id) || row.company_id !== company || ids.has(row.id)) throw new Error(`Invalid identity or company: ${table}`);
      ids.add(row.id);
      for (const column of Object.keys(row)) identifier(column);
    }
  }
  const batch = payload.asset_import_batches;
  if (batch.length !== 1 || batch[0].state !== 'rehearsal' || !sha.test(batch[0].source_sha256)) throw new Error('A single unactivated source batch is required.');
  return company;
}

export async function readLedger(client, company) {
  const result = {};
  for (const table of ledgerTables) {
    const rows = await client.query(`select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb) rows from public.${table} t where company_id=$1`,[company]);
    result[table] = rows.rows[0].rows;
  }
  return result;
}
export const ledgerFingerprint = ledger => fingerprint(Object.fromEntries(ledgerTables.map(table => [table,[...ledger[table]].sort((a,b)=>a.id.localeCompare(b.id))])));

async function columnsFor(client, table) {
  return new Set((await client.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1",[table])).rows.map(row=>row.column_name));
}
async function insertRows(client, table, rows) {
  if (!rows.length) return;
  const allowed = await columnsFor(client, table), columns = Object.keys(rows[0]);
  if (columns.some(column=>!allowed.has(column)) || rows.some(row=>Object.keys(row).length !== columns.length || columns.some(column=>!Object.hasOwn(row,column)))) throw new Error(`Inconsistent or unknown import columns: ${table}`);
  const names = columns.map(identifier).join(',');
  for (let offset=0;offset<rows.length;offset+=500) {
    await client.query(`insert into public.${table} (${names}) select ${names} from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,[JSON.stringify(rows.slice(offset,offset+500))]);
  }
}
function assertInactive(ledger) {
  if (ledger.asset_import_batches.some(batch=>!['rehearsal','superseded'].includes(batch.state))) throw new Error('The ledger is activated or verified. Staging/recovery cannot change it.');
}
function assertMatches(actual, source) {
  for (const table of ledgerTables.filter(table=>table!=='asset_import_batches')) {
    const byId = new Map(actual[table].map(row=>[row.id,row]));
    if (byId.size !== source[table].length) throw new Error(`Ledger row count differs: ${table}`);
    for (const expected of source[table]) {
      const row = byId.get(expected.id);
      const projected = row && Object.fromEntries(Object.keys(expected).map(key=>[key,row[key]]));
      if (!row || fingerprint(projected)!==fingerprint(expected)) throw new Error(`Ledger differs from reviewed snapshot: ${table}`);
      if (table==='assets' && fingerprint(row.current_details)!==fingerprint({})) throw new Error('Native master details already exist. Reconcile before importing.');
    }
  }
  const batch = actual.asset_import_batches.find(row=>row.id===source.asset_import_batches[0].id);
  if (!batch || batch.state!=='rehearsal' || batch.source_sha256!==source.asset_import_batches[0].source_sha256 || fingerprint(batch.reconciliation)!==fingerprint(source.asset_import_batches[0].reconciliation)) throw new Error('Source batch differs from the reviewed snapshot.');
}
async function transaction(client, company, work) {
  if (!uuid.test(company)) throw new Error('Invalid company.');
  await client.query('begin isolation level serializable');
  try {
    await client.query("set local lock_timeout='10s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",[`${company}/asset-import`]);
    await client.query('select id from public.asset_import_batches where company_id=$1 for update',[company]);
    const before = await readLedger(client,company); assertInactive(before);
    const result = await work(before);
    await client.query('commit'); return result;
  } catch (error) { await client.query('rollback'); throw error; }
}
async function recoveryRecord(client, company, before, nextSha, saveRecovery) {
  const after = await readLedger(client,company);
  const backup = { version:2, company_id:company, source_sha256:nextSha, before, after, before_fingerprint:ledgerFingerprint(before), after_fingerprint:ledgerFingerprint(after) };
  // The caller must durably save this private artifact before COMMIT. Failure
  // to write the recovery file rolls back every ledger change.
  await saveRecovery(backup);
  return { counts:Object.fromEntries(ledgerTables.map(table=>[table,after[table].length])), fingerprint:backup.after_fingerprint, activated:false };
}

export async function stageSnapshot(client, payload, company, saveRecovery) {
  validateSnapshot(payload,company);
  if (typeof saveRecovery!=='function') throw new Error('A durable recovery writer is required.');
  return transaction(client,company,async before=>{
    if (ledgerTables.some(table=>before[table].length)) {
      assertMatches(before,payload);
      if (before.asset_import_batches.length!==1) throw new Error('Unexpected staging batches. Use the reviewed delta workflow.');
      return { unchanged:true, activated:false };
    }
    for (const table of ledgerTables) await insertRows(client,table,payload[table]);
    assertMatches(await readLedger(client,company),payload);
    return recoveryRecord(client,company,before,payload.asset_import_batches[0].source_sha256,saveRecovery);
  });
}

export async function applySnapshotDelta(client, previous, next, company, saveRecovery) {
  validateSnapshot(previous,company); validateSnapshot(next,company);
  if (typeof saveRecovery!=='function') throw new Error('A durable recovery writer is required.');
  const plan = planDelta(previous,next);
  if (!plan.ready_for_rehearsal) throw new Error('Source removals or changed historical identities need reconciliation.');
  if (plan.previous_sha256===plan.next_sha256) {
    if (plan.changes.length) throw new Error('The same source hash cannot describe different records.');
    return stageSnapshot(client,next,company,saveRecovery);
  }
  return transaction(client,company,async before=>{
    if (before.asset_import_batches.some(batch=>batch.id===next.asset_import_batches[0].id)) {
      assertMatches(before,next); return { unchanged:true, activated:false };
    }
    assertMatches(before,previous);
    await insertRows(client,'asset_import_batches',next.asset_import_batches);
    for (const table of ledgerTables.filter(table=>table!=='asset_import_batches')) {
      const updates=plan.changes.filter(change=>change.table===table && change.operation==='update');
      if (updates.length) {
        const allowed = await columnsFor(client,table), keys=Object.keys(updates[0].after), columns=keys.filter(key=>key!=='id' && key!=='company_id');
        if (keys.some(column=>!allowed.has(column)) || updates.some(change=>Object.keys(change.after).length!==keys.length || keys.some(key=>!Object.hasOwn(change.after,key)))) throw new Error(`Inconsistent or unknown delta columns: ${table}`);
        const set = columns.map(column=>`${identifier(column)}=incoming.${identifier(column)}`).join(',');
        for (let offset=0;offset<updates.length;offset+=500) {
          const page=updates.slice(offset,offset+500).map(change=>change.after);
          const result = await client.query(`update public.${table} target set ${set} from jsonb_populate_recordset(null::public.${table},$1::jsonb) incoming where target.company_id=$2 and target.id=incoming.id returning target.id`,[JSON.stringify(page),company]);
          if (result.rows.length!==page.length) throw new Error(`Delta targets changed: ${table}`);
        }
      }
      await insertRows(client,table,plan.changes.filter(change=>change.table===table && change.operation==='insert').map(change=>change.after));
    }
    // Every imported master points to the final snapshot, including unchanged
    // masters. Prior import batches remain traceable as superseded records.
    await client.query('update public.assets set import_batch_id=$1 where company_id=$2',[next.asset_import_batches[0].id,company]);
    await client.query("update public.asset_import_batches set state='superseded' where company_id=$1 and id<>$2",[company,next.asset_import_batches[0].id]);
    assertMatches(await readLedger(client,company),next);
    return recoveryRecord(client,company,before,plan.next_sha256,saveRecovery);
  });
}

export function validateRecovery(backup, company) {
  if (!uuid.test(company) || ![1,2].includes(backup.version) || backup.company_id!==company || !sha.test(backup.source_sha256) || !sha.test(backup.after_fingerprint) || Object.keys(backup.before??{}).length!==ledgerTables.length || ledgerTables.some(table=>!Array.isArray(backup.before[table]) || backup.before[table].some(row=>row.company_id!==company || !uuid.test(row.id))) || ledgerFingerprint(backup.before)!==backup.before_fingerprint) throw new Error('Invalid or altered recovery snapshot.');
  assertInactive(backup.before);
  if (backup.version===2 && (Object.keys(backup.after??{}).length!==ledgerTables.length || ledgerTables.some(table=>!Array.isArray(backup.after[table]) || backup.after[table].some(row=>row.company_id!==company || !uuid.test(row.id))) || ledgerFingerprint(backup.after)!==backup.after_fingerprint)) throw new Error('Invalid or altered recovery after-state.');
}
// No data mutation: preserve the original recovery destination while checking
// the entire ledger, allowing only finalized legacy attachment verification.
export async function checkpointAttachmentRecovery(client, backup, company, saveRecovery) {
  validateRecovery(backup,company);
  if (backup.version!==2 || typeof saveRecovery!=='function') throw new Error('A version 2 snapshot and durable recovery writer are required.');
  return transaction(client,company,async current=>{
    const normalized=structuredClone(current), original=new Map(backup.after.asset_attachments.map(row=>[row.id,row]));
    let changed=0;
    for (const row of normalized.asset_attachments) {
      const prior=original.get(row.id);
      if (!prior) throw new Error('Attachment identities changed after import.');
      const fields=['storage_path','content_sha256','verified_at'];
      if (fields.some(key=>row[key]!==prior[key])) {
        if (prior.storage_path!==null || prior.content_sha256!==null || prior.verified_at!==null || row.source_data?.Origin==='OMS upload' || !sha.test(row.content_sha256??'') || !Number.isFinite(Date.parse(row.verified_at??'')) || !new RegExp(`^${company}/${row.asset_id}/legacy-${row.id}\\.(jpg|png|webp|pdf)$`).test(row.storage_path??'')) throw new Error('Unproven or replaced attachment verification.');
        const object=await client.query("select 1 from storage.objects where bucket_id='asset-documents' and name=$1",[row.storage_path]);
        if (!object.rows.length) throw new Error('Verified attachment object is missing.');
        changed++;
      }
      for (const key of fields) row[key]=prior[key];
    }
    if (ledgerFingerprint(normalized)!==backup.after_fingerprint) throw new Error('Unrelated ledger changes prevent a recovery checkpoint.');
    const next={...backup,after:current,after_fingerprint:ledgerFingerprint(current)};
    await saveRecovery(next);
    return {checkpointed:true,attachments_verified:changed,activated:false};
  });
}
export async function restoreStagingLedger(client, backup, company) {
  validateRecovery(backup,company);
  return transaction(client,company,async current=>{
    if (ledgerFingerprint(current)!==backup.after_fingerprint) throw new Error('Ledger changed after this recovery snapshot. No rows were removed.');
    for (const table of [...ledgerTables].reverse()) await client.query(`delete from public.${table} where company_id=$1`,[company]);
    for (const table of ledgerTables) await insertRows(client,table,backup.before[table]);
    if (ledgerFingerprint(await readLedger(client,company))!==backup.before_fingerprint) throw new Error('Restored ledger differs from recovery snapshot.');
    return { restored:true, activated:false };
  });
}
