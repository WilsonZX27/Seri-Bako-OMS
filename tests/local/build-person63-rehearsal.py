"""Generate a rolled-back local fixture; never connect to production."""
from pathlib import Path
root = Path(__file__).resolve().parents[2]
sql = (root / 'sql-candidates/attendance-person63-recovery.sql').read_text()
sql = sql.replace('begin;', '', 1).rsplit('commit;', 1)[0]
# Existing isolated QA company/employee; not production identities.
sql = sql.replace('3b104582-f8cb-4a4d-867f-b99e5ffc6486', '0d92a9e0-8e71-4769-9260-89cddc3dc78d')
sql = sql.replace('3e248456-89e6-4849-a53d-cf344e6bd587', '6bc2265b-4a61-474c-b70f-b46b2a3aab89')
source = (root / 'supabase/migrations/371_attendance_one_minute_deduplication.sql').read_text()
helper = source[:source.index('create or replace function public.recalculate_attendance_week_pay_v1')]
base = source[source.index('create or replace function public.calculate_schedule_day_base'):]
fingerprint = (root / 'supabase/migrations/359_staff_fingerprint_exemptions.sql').read_text()
fingerprint = fingerprint[fingerprint.index('create table public.staff_fingerprint_policies'):fingerprint.index('create function public.get_staff_fingerprint_exemptions')] + fingerprint[fingerprint.index('create function public.apply_staff_fingerprint_policy'):fingerprint.index('-- The immutable import receipt')]
fixture = (root / 'tests/local/attendance-person63-recovery.sql').read_text()
print('\\set ON_ERROR_STOP on\nbegin;\n' + fingerprint + sql + helper + base + fixture)
