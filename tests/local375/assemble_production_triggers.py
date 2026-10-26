"""Replay legally exported function/trigger definitions into a NEW synthetic DB only."""
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[2]
meta=json.loads(Path(sys.argv[1]).read_text());deps=json.loads(Path(sys.argv[2]).read_text())
sql=(root/'tests/local375/bootstrap.sql').read_text()+"\nalter default privileges in schema public grant execute on functions to anon,authenticated,service_role;\n"
dependency_order=['current_staff_id()','current_staff_has_company_role(text[])','can_access_company_branch(uuid,uuid)','can_access_inventory_branch(uuid,uuid)']
ordered=sorted(deps['functions'],key=lambda f:dependency_order.index(f['signature']) if f['signature'] in dependency_order else 99)
for f in meta['functions']+ordered:
 sql+='\n'+f['definition']+';\n'
for table in ['purchase_requests','purchase_request_lines','purchase_request_unresolved_lines']:
 for trigger in next(r for r in meta['relations'] if r['name']==table)['triggers'] or []:
  sql+='\n'+trigger+';\n'
sql+='\n'+(root/'supabase/maintenance/375_supplier_recovery.PROPOSED.sql').read_text()
Path(sys.argv[3]).write_text(sql)
