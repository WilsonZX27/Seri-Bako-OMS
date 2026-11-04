"""Emit fictional fixture SQL from the same sources as full-chain tests. Never run on a shared DB."""
from pathlib import Path
import re
import sys
root=Path(__file__).resolve().parents[2]
source=(root/'tests/fixtures/odr-carryover-full-chain.cjs').read_text()
sql=re.search(r'await db.exec\(`(.*?)`\);',source,re.S)[1]
def function(path,name):
    text=(root/path).read_text()
    start=re.search(r'create (?:or replace )?function public\.'+name+r'\(',text,re.I).start()
    return text[start:text.index('end $$;',start)+7]
for name in ['save_outlet_daily_record_before_planning','validate_outlet_daily_wastage_reason']:
    sql+='\n'+function('supabase/migrations/321_outlet_daily_prior_stock_wastage.sql',name)
sql+='\ncreate trigger validate_waste before insert or update of wastage_qty,wastage_reason on outlet_daily_record_lines for each row execute function validate_outlet_daily_wastage_reason();\n'
sql+=function('supabase/migrations/363_daily_product_tracking.sql','save_outlet_daily_record').replace('function public.save_outlet_daily_record(', 'function public.save_outlet_daily_record_before_saleable_stock(')
sql+='\nrevoke all on function save_outlet_daily_record_before_saleable_stock(uuid,uuid,date,text,jsonb,text) from public;grant execute on function save_outlet_daily_record_before_saleable_stock(uuid,uuid,date,text,jsonb,text) to service_role;\n'
sql+=function('supabase/migrations/370_production_saleable_carryover.sql','save_outlet_daily_record')+'\n'+function('supabase/migrations/362_daily_payment_channels.sql','save_outlet_daily_record_v92')
for path in ['sql-candidates/odr-annotations/atomic-save.sql','sql-candidates/odr-sales-settings/wiring.sql','sql-candidates/outlet_daily_carryover_wastage.REVIEW.sql']:
    sql+='\n'+(root/path).read_text()
Path(sys.argv[1]).write_text(sql)
