import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const tables = ['asset_locations', 'assets', 'asset_master_updates', 'asset_holdings', 'asset_maintenance',
  'asset_maintenance_updates', 'asset_daily_checks', 'asset_transfers',
  'asset_transfer_updates', 'asset_attachments', 'asset_suppliers', 'asset_calendar_days'];
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const fingerprint = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const businessRow = row => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'import_batch_id'));

// A private review manifest, never a database writer. No removed row is silently deleted.
export function planDelta(previous, next) {
  const batches = [previous, next].map(payload => payload.asset_import_batches);
  if (batches.some(rows => !Array.isArray(rows) || rows.length !== 1)) throw new Error('Exactly one source batch is required.');
  const company = batches[0][0].company_id;
  if (!company || batches[1][0].company_id !== company) throw new Error('Source companies differ.');
  if (batches.some(rows => rows[0].state !== 'rehearsal')) throw new Error('Only unactivated source snapshots can be compared.');
  const changes = [], issues = [], counts = {};
  for (const table of tables) {
    const rows = [previous, next].map(payload => payload[table]);
    if (rows.some(value => !Array.isArray(value))) throw new Error(`Missing table: ${table}`);
    const indexes = rows.map(list => {
      const index = new Map();
      for (const row of list) {
        if (!row.id || index.has(row.id) || row.company_id !== company) throw new Error(`Invalid identity or company in ${table}`);
        index.set(row.id, row);
      }
      return index;
    });
    const [before, after] = indexes;
    counts[table] = { added: 0, changed: 0, removed: 0, unchanged: 0 };
    for (const [id, oldRow] of before) {
      const newRow = after.get(id);
      if (!newRow) {
        counts[table].removed++;
        issues.push({ table, id, reason: 'Source row removed: explicit reconciliation required; no automatic deletion.' });
        continue;
      }
      const oldValue = businessRow(oldRow), newValue = businessRow(newRow);
      if (fingerprint(oldValue) === fingerprint(newValue)) { counts[table].unchanged++; continue; }
      // Spreadsheet row numbers are not immutable identities. Reject a reused key that
      // would overwrite a different historical event after insertion or reordering.
      const eventFields = table === 'asset_daily_checks' ? ['asset_id', 'location_id', 'submission_id', 'check_date'] :
        table === 'asset_attachments' ? ['asset_id', 'maintenance_id', 'location_id', 'url'] : [];
      if (eventFields.some(field => oldRow[field] !== newRow[field])) {
        issues.push({ table, id, reason: 'Historical row key changed identity: review source row insertion/reordering.' });
      }
      counts[table].changed++;
      changes.push({ table, id, operation: 'update', expected: fingerprint(oldValue), before: oldRow, after: newRow });
    }
    for (const [id, row] of after) if (!before.has(id)) {
      counts[table].added++;
      changes.push({ table, id, operation: 'insert', expected: null, after: row });
    }
  }
  return { version: 1, company_id: company, previous_sha256: batches[0][0].source_sha256,
    next_sha256: batches[1][0].source_sha256, counts, issues, changes,
    ready_for_rehearsal: issues.length === 0, ready_for_cutover: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , oldPath, newPath, output] = process.argv;
  if (!oldPath || !newPath || !output) throw new Error('Usage: plan-import-delta.mjs previous.json final.json private-output.json');
  const plan = planDelta(JSON.parse(await fs.readFile(oldPath, 'utf8')), JSON.parse(await fs.readFile(newPath, 'utf8')));
  await fs.writeFile(output, JSON.stringify(plan, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ counts: plan.counts, issues: plan.issues.length, ready_for_rehearsal: plan.ready_for_rehearsal, ready_for_cutover: false }));
  if (plan.issues.length) process.exitCode = 1;
}
