from pathlib import Path
import re
root=Path(__file__).resolve().parents[2]
def read(pattern):return next((root/'supabase/migrations').glob(pattern)).read_text()
def function(source,name):
    return re.search(r'create or replace function public\.'+name+r'\([\s\S]*?\$\$;',source,re.I).group()
sql=(root/'tests/local375/bootstrap.sql').read_text()
for pattern,name in [('005_*','current_staff_role_codes'),('090_*','has_any_permission'),('052_*','has_permission'),('304_*','current_staff_company_id'),('075_*','can_access_purchase_request')]:sql+='\n'+function(read(pattern),name)
sql+='\n'+read('236_*')
s292=read('292_*');body=s292[s292.index("  target := 'public.resolve_purchase_request_unresolved_line"):s292.index('end;\n$migration$;')]
sql+='\ndo $migration$ declare target regprocedure; definition text; old_guard text; new_guard text; begin\n'+body+'\nend; $migration$;\n'+read('293_*')
sql+='\n'+(root/'supabase/maintenance/375_supplier_recovery.PROPOSED.sql').read_text()
(root/'tests/local375/assembled.sql').write_text(sql)
