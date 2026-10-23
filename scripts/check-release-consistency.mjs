import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const parts = version => {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Unsupported release version: ${version}`);
  return version.split('.').map(Number);
};
export function checkRelease(root, previousVersion) {
  const read = file => readFileSync(path.join(root, file), 'utf8');
  const version = JSON.parse(read('package.json')).version;
  const currentParts = parts(version);
  const lock = JSON.parse(read('package-lock.json'));
  const failures = [];
  if (lock.version !== version || lock.packages?.['']?.version !== version) failures.push('package-lock.json root versions');
  const appVersion = /APP_VERSION\s*=\s*"([^"]+)"/.exec(read('src/lib/app-version.ts'))?.[1];
  if (appVersion !== version) failures.push('displayed APP_VERSION');
  for (const file of ['PRODUCT.md', 'DESIGN.md']) {
    const firstVersion = /^#{1,2}\s+v(\d+\.\d+\.\d+)\b/m.exec(read(file))?.[1];
    if (firstVersion !== version) failures.push(`${file} latest release entry`);
  }
  const notes = readdirSync(path.join(root, 'docs/releases')).filter(file => file.startsWith(`preview-v${version}-`) && file.endsWith('.md'));
  if (notes.length !== 1 || !read(`docs/releases/${notes[0]}`).startsWith(`# v${version} `)) failures.push('one matching Preview release note');
  if (previousVersion) {
    const previousParts = parts(previousVersion);
    const difference = currentParts.map((value, index) => value - previousParts[index]).find(value => value !== 0) ?? 0;
    if (difference <= 0) failures.push(`version must advance beyond deployed ${previousVersion}`);
  }
  if (failures.length) throw new Error(`Release consistency failed: ${failures.join('; ')}`);
  return { version, notes: `docs/releases/${notes[0]}`, previousVersion: previousVersion ?? null };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    let previous;
    const args = process.argv.slice(2);
    if (args.length) {
      if (args.length !== 2 || args[0] !== '--base-ref' || !/^[0-9a-f]{40}$/.test(args[1])) throw new Error('Use --base-ref followed by the verified full deployed commit SHA.');
      previous = JSON.parse(execFileSync('git', ['show', `${args[1]}:package.json`], { encoding: 'utf8' })).version;
    }
    console.log(JSON.stringify(checkRelease(process.cwd(), previous)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
