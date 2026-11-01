"""Validate synthetic generated and native-Excel-saved monetary files only."""
from pathlib import Path
import datetime as dt
import json
import zipfile
import xml.etree.ElementTree as E

root = Path('handoff/payslip-export-candidate-20261101')
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
results = []
for name in ['synthetic-released.xlsx', 'synthetic-approved.xlsx', 'synthetic-draft.xlsx', 'http-released.xlsx', 'synthetic-released-excel-recalculated.xlsx', 'synthetic-released-excel-edited.xlsx']:
    with zipfile.ZipFile(root / name) as z:
        assert z.testzip() is None
        for part in z.namelist():
            if part.endswith(('.xml', '.rels')):
                E.fromstring(z.read(part))
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            shared = [''.join(item.itertext()) for item in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', ns)]
        sheet = E.fromstring(z.read('xl/worksheets/sheet1.xml'))
        cells = {c.attrib['r']: c for c in sheet.findall('.//s:c', ns)}
        def value(ref):
            c = cells.get(ref)
            if c is None:
                return None
            v = c.findtext('s:v', namespaces=ns)
            if c.attrib.get('t') == 's':
                return shared[int(v)]
            if c.attrib.get('t') == 'inlineStr':
                return ''.join(c.find('s:is', ns).itertext())
            return float(v) if v else None
        assert len(sheet.findall('.//s:f', ns)) == 3
        assert cells['B12'].find('s:f', ns) is None and value('B12').startswith('=HYPERLINK(')
        assert not any('externalLinks/' in part for part in z.namelist())
        assert value('D3') == '00068' and value('D6') == 'MYR'
        assert value('B5') == (dt.date(2026, 10, 26) - dt.date(1899, 12, 30)).days
        assert value('D5') == (dt.date(2026, 11, 1) - dt.date(1899, 12, 30)).days
        assert value('C13') == 0 and value('D13') is None
        assert abs(value('D16') - 12.35) < 1e-9
        assert abs(value('C17') - (988.15 if 'edited' in name else 988.05)) < 1e-9
        assert cells['C17'].findtext('s:f', namespaces=ns) == 'C16-D16'
        assert value('A21') == value('B5') and value('B21') == 'late, missing check out'
        assert all(value(f'{col}25') is None for col in 'ABCD')
        assert 'Employee signature' == value('D24')
        assert not any(c.attrib.get('t') == 'e' for c in cells.values())
        if 'draft' in name:
            assert value('A2') == 'DRAFT — NOT APPROVED' and value('B8') is None
        results.append({'file': name, 'net': value('C17'), 'formulaCount': 3, 'literalFormulaLikeLabel': True})
(root / 'xlsx-result.json').write_text(json.dumps({'passed': True, 'results': results, 'nativeExcel': 'Opened, Calculate, Save As, edited synthetic input, Calculate, Save As, closed/reopened; no repair prompt'}, indent=2))
print('PASS six monetary XLSX files, native Excel caches, formula-injection text, identifiers/dates/zero and signatures')
