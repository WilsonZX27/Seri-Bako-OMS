"""Static ownership inventory, deliberately not a runtime pass claim."""
import json,re
from pathlib import Path
root=Path('src/app/(app)');rows=[]
for page in sorted(root.rglob('page.tsx')):
 route='/'+'/'.join(p for p in page.parent.relative_to(root).parts if not p.startswith('('))
 source=page.read_text()
 direct=re.findall(r'from [\"\'](@/components/[^\"\']+)',source)
 shared=set();todo=list(direct)
 while todo:
  name=todo.pop()
  if name in shared: continue
  shared.add(name)
  path=Path('src')/name[2:]
  for suffix in ['.tsx','.ts','/index.tsx']:
   candidate=Path(str(path)+suffix)
   if candidate.exists():
    todo.extend(re.findall(r'from [\"\'](@/components/[^\"\']+)',candidate.read_text()));break
 rows.append({'route':route,'source':str(page),'components':sorted(shared),'states':dict.fromkeys(['default','expanded','loading','empty','error','long_content','narrow','zoom_200'],'not_yet_verified'),'runtime_evidence':[]})
Path('docs/qa/OMS_INTEGRATION_UI_MATRIX_2026-10-13.json').write_text(json.dumps({'scope':'Static route-to-component inventory; pending means no integration runtime evidence, not passed.','viewports':[1440,1024,768,390,320],'routes':rows},indent=2)+'\n')
print(f'Inventoried {len(rows)} route owners without marking runtime states passed.')
