const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset-attachments.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { assetAttachmentSignature: valid } = context.exports;

test('asset photos and PDFs require matching bytes, never a filename or claimed MIME alone', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7\n');
  const png = Uint8Array.from([137,80,78,71,13,10,26,10]);
  assert.equal(valid('application/pdf', pdf), true);
  assert.equal(valid('image/png', png), true);
  assert.equal(valid('image/jpeg', Uint8Array.from([255,216,255,224])), true);
  assert.equal(valid('image/webp', new TextEncoder().encode('RIFFxxxxWEBP')), true);
  for (const type of ['image/jpeg','image/png','image/webp','application/pdf']) {
    assert.equal(valid(type, new TextEncoder().encode('<svg onload="alert(1)">')), false);
    assert.equal(valid(type, new Uint8Array()), false);
  }
  assert.equal(valid('image/png', pdf), false);
  assert.equal(valid('application/pdf', png), false);
  assert.equal(valid('image/svg+xml', png), false);
  assert.equal(valid('image/webp', new TextEncoder().encode('RIFFxxxxWAVE')), false);
});
