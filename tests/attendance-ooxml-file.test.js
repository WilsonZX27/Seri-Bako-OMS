const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

function generator() {
  const source = fs.readFileSync('src/lib/attendance/people-workbook.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(module, module.exports, require);
  return module.exports.buildPeopleWorkbook;
}

test('saved XLSX has valid ZIP/XML relationships, ordered workbook children and accurate cell bounds', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'oms-ooxml-'));
  try {
    const workbookPath = path.join(directory, 'synthetic.xlsx');
    const input = { name: 'Synthetic & Test', employee: 'Synthetic\u0001 Employee <测试>', outlet: 'Test Outlet', month: '2026-09', days: [] };
    fs.writeFileSync(workbookPath, generator()([input, input]));
    const result = execFileSync('python3', ['-c', `
import sys, zipfile, posixpath, re
import xml.etree.ElementTree as ET
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 roots={n:ET.fromstring(z.read(n)) for n in z.namelist() if n.endswith(('.xml','.rels'))}
 workbook=roots['xl/workbook.xml']
 tags=[e.tag.rsplit('}',1)[-1] for e in workbook]
 assert tags.index('sheets') < tags.index('calcPr'), tags
 names=[e.attrib['name'] for e in workbook.find('s:sheets',ns)]
 assert len(set(n.casefold() for n in names))==2
 assert not any('/theme/' in n for n in z.namelist())
 for name,root in roots.items():
  if name.endswith('.rels'):
   base=posixpath.dirname(posixpath.dirname(name))
   for rel in root:
    if rel.get('TargetMode')!='External':
     target=posixpath.normpath(posixpath.join(base,rel.get('Target'))).lstrip('/')
     assert target in z.namelist(), (name,target)
  if name.startswith('xl/worksheets/'):
   rows=root.findall('s:sheetData/s:row',ns)
   row_numbers=[int(r.get('r')) for r in rows]
   assert row_numbers==sorted(set(row_numbers))
   refs=[]
   for row in rows:
    for cell in row:
     ref=cell.get('r')
     assert ref and int(re.search(r'\\d+$',ref)[0])==int(row.get('r')), ref
     refs.append(ref)
   assert len(refs)==len(set(refs))
   assert root.find('s:dimension',ns).get('ref')=='A1:P'+str(max(row_numbers))
print('Saved package validation passed')
`, workbookPath], { encoding: 'utf8' });
    assert.match(result, /Saved package validation passed/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('empty exports cannot create an invalid zero-sheet workbook', () => {
  assert.throws(() => generator()([]), /At least one employee sheet/);
});
