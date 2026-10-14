"""Read only: compare the downloaded synthetic PDF/XLSX to the same local database."""
import json, subprocess, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
import fitz
root=Path('outputs/qa/component-states')
f=json.loads(Path('/tmp/oms-people-browser-private.json').read_text())
query=f"select json_agg(row_to_json(r) order by work_date) from (select work_date,worked_seconds,overtime_seconds,late_seconds+early_leave_seconds short_seconds from daily_attendance_results where staff_id='{f['staff']}' and is_current order by work_date)r"
data=json.loads(subprocess.check_output(['docker','exec','supabase_db_oms-integration-20261014','psql','-U','postgres','-d','postgres','-qAt','-c',query],text=True))
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(root/'populated-comparison.xlsx') as z:
 sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
cells={c.attrib['r']:c.findtext('m:v',default='',namespaces=ns) for c in sheet.findall('.//m:c',ns)}
pdf=fitz.open(root/'populated-browser.pdf');text='\n'.join(p.get_text() for p in pdf)
def duration(n):return f'{n//3600:02}:{n//60%60:02}:{n%60:02}'
checks=[]
for i,row in enumerate(data):
 xrow=i+8;block=text.split(row['work_date'])[-1]
 if i+1<len(data):block=block.split(data[i+1]['work_date'])[0]
 if row['worked_seconds'] is None:
  assert all(cells[f'{c}{xrow}']=='' for c in ['I','J','K','L'])
 else:
  for column,field in [('I','worked_seconds'),('J','overtime_seconds'),('K','short_seconds')]:
   assert round(float(cells[f'{column}{xrow}'])*86400)==row[field]
   assert duration(row[field]) in block
 assert cells[f'L{xrow}']==''
 checks.append(row['work_date']+': database hours agree with XLSX cached values and PDF; PPH blank')
assert 'All punches:' in text, 'PDF must preserve the fifth anomalous punch as evidence'
pdf[0].get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(root/'populated-browser-render.png')
(root/'export-comparison.json').write_text(json.dumps({'checks':checks,'pdf_pages':len(pdf),'extra_punch_evidence':True},indent=2))
print('PASS 7 days PDF/XLSX/database comparison, blank PPH and extra punch evidence')
