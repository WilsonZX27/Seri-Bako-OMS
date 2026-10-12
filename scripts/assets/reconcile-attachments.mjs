import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assetAttachmentLimit, assetAttachmentSignature } from '../../src/lib/asset-attachments.ts';
import { validateSnapshot } from './import-ledger.mjs';

// This tool never fetches a URL. Evidence consists only of separately authorized,
// locally supplied files and a reviewed folder inventory bound to the export.
export function sourceFileIdentity(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Attachment references must use HTTPS.');
  if (url.hostname === 'drive.google.com') {
    const file = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1] ?? (['/open','/uc'].includes(url.pathname) ? url.searchParams.get('id') : null);
    if (file && /^[A-Za-z0-9_-]+$/.test(file)) return `drive-file:${file}`;
    const folder = url.pathname.match(/^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1];
    if (folder) return `drive-folder:${folder}`;
  }
  return url.href;
}
export async function reconcileAttachments(snapshot, payload, evidence, readFile = fs.readFile) {
  const company = payload.asset_import_batches?.[0]?.company_id;
  validateSnapshot(payload, company);
  if (snapshot.source_sha256 !== payload.asset_import_batches[0].source_sha256 || evidence.source_sha256 !== snapshot.source_sha256) throw new Error('Attachment evidence belongs to a different source snapshot.');
  if (!Array.isArray(snapshot.attachments) || !Array.isArray(evidence.files) || !Array.isArray(evidence.folders)) throw new Error('Missing attachment references or evidence lists.');
  const references = snapshot.attachments.map(r => ({ ...r, identity: sourceFileIdentity(r.url) }));
  const wanted = new Set(references.map(r => r.identity));
  const issues = [], files = new Map(), folders = new Map();
  for (const file of evidence.files) {
    const identity = sourceFileIdentity(file.source_url);
    if (!wanted.has(identity) || identity.startsWith('drive-folder:') || files.has(identity)) throw new Error('Unknown or duplicate file evidence.');
    if (!path.isAbsolute(file.local_path ?? '') || !/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) throw new Error('File evidence requires an absolute path and reviewed SHA256.');
    const bytes = await readFile(file.local_path);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (!bytes.length || bytes.length > assetAttachmentLimit || !assetAttachmentSignature(file.mime_type, bytes) || hash !== file.sha256) throw new Error('Supplied file content, size, type or hash does not match reviewed evidence.');
    files.set(identity, { identity, local_path: file.local_path, sha256: hash, mime_type: file.mime_type, size_bytes: bytes.length });
  }
  for (const folder of evidence.folders) {
    const identity = sourceFileIdentity(folder.source_url);
    if (!wanted.has(identity) || !identity.startsWith('drive-folder:') || folders.has(identity)) throw new Error('Unknown or duplicate folder evidence.');
    if (!folder.reviewed_by?.trim() || !/^\d{4}-\d{2}-\d{2}T/.test(folder.reviewed_at ?? '') || !Number.isFinite(Date.parse(folder.reviewed_at)) || !Array.isArray(folder.file_urls)) throw new Error('Folder evidence requires a dated reviewer and complete file inventory.');
    const members = folder.file_urls.map(sourceFileIdentity);
    if (new Set(members).size !== members.length) throw new Error('Folder inventory repeats a file.');
    for (const member of members) if (!files.has(member)) issues.push({ reason: 'Folder file has no reconciled source attachment', identity: member });
    folders.set(identity, { identity, reviewed_by: folder.reviewed_by, reviewed_at: folder.reviewed_at, files: members });
  }
  const rows = payload.asset_attachments.map(row => {
    const identity = sourceFileIdentity(row.url), file = files.get(identity);
    if (!wanted.has(identity)) throw new Error('Imported attachment has no original URL reference.');
    return { attachment_id: row.id, asset_id: row.asset_id, maintenance_id: row.maintenance_id ?? null, location_id: row.location_id ?? null, source_key: row.source_key, identity, file: file ?? null };
  });
  for (const row of payload.asset_attachments) {
    const sourceFolder = row.source_data?.['Drive Folder URL'];
    if (sourceFolder) {
      const inventory = folders.get(sourceFileIdentity(sourceFolder));
      if (inventory && !inventory.files.includes(sourceFileIdentity(row.url))) issues.push({ reason: 'Folder inventory omits an attachment linked to that folder', source_key: row.source_key });
    }
  }
  for (const ref of references) {
    if (ref.identity.startsWith('drive-folder:')) {
      if (!folders.has(ref.identity)) issues.push({ reason: 'Folder inventory not reviewed', table: ref.table, row: ref.row, field: ref.field });
    } else {
      if (!files.has(ref.identity)) issues.push({ reason: 'Original file not verified locally', table: ref.table, row: ref.row, field: ref.field });
      if (!rows.some(row => row.identity === ref.identity)) issues.push({ reason: 'Original file has no imported attachment row', table: ref.table, row: ref.row, field: ref.field });
    }
  }
  return {
    version: 1, company_id: company, source_sha256: snapshot.source_sha256,
    references: references.map(({ url, verified, ...r }) => ({ ...r, resolved_locally: r.identity.startsWith('drive-folder:')
      ? folders.has(r.identity) && folders.get(r.identity).files.every(member => files.has(member)) && payload.asset_attachments.filter(row => row.source_data?.['Drive Folder URL'] && sourceFileIdentity(row.source_data['Drive Folder URL']) === r.identity).every(row => folders.get(r.identity).files.includes(sourceFileIdentity(row.url)))
      : files.has(r.identity) && rows.some(row => row.identity === r.identity) })),
    attachments: rows, folder_inventories: [...folders.values()], issues,
    summary: { original_references: references.length, attachment_rows: rows.length, verified_local_files: files.size, reviewed_folders: folders.size, unresolved: issues.length, ready_for_storage_copy: issues.length === 0, ready_for_cutover: false },
  };
}

async function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i]?.replace(/^--/, '');
    if (!['snapshot','payload','evidence','output'].includes(key) || Object.hasOwn(args,key) || !process.argv[i + 1]) throw new Error('Provide --snapshot --payload --evidence --output.');
    args[key] = process.argv[i + 1];
  }
  if (!args.snapshot || !args.payload || !args.evidence || !args.output) throw new Error('Missing private reconciliation inputs.');
  const root = fileURLToPath(new URL('../../', import.meta.url));
  if (path.resolve(args.output).startsWith(root)) throw new Error('Keep operational evidence outside Git.');
  const [snapshot,payload,evidence] = await Promise.all([args.snapshot,args.payload,args.evidence].map(async name => JSON.parse(await fs.readFile(name,'utf8'))));
  const result = await reconcileAttachments(snapshot,payload,evidence);
  await fs.writeFile(args.output,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify(result.summary));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Attachment reconciliation stopped. Check the private inputs; no URL was fetched and no database or storage writes occurred.'); process.exitCode = 1; });
}
