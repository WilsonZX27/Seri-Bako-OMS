# S1 — salary entry / Excel calculation investigation (source evidence only)

Status: **not repaired or activated in this candidate**. This is tracked independently of annotation42. No private salary, passport, payroll run, account change or permission grant was read or performed. The coordinating chat has relayed the user's later correction that salary entry is required (16:52 UTC, `Sentinel_61673c55636c81919eb7249b90f234b3`); this supersedes the earlier product direction in annotation42. Do not ask the user to repeat that choice. This relay is recorded as requirement context, not a new sensitive RPC grant or production installation approval. The claim that closing salary entry caused the Excel issue remains a hypothesis; the affected exported workbook and its intended formula/policy were not supplied in this chat.

## Verified source facts

- Baseline migration316 `supabase/migrations/316_retire_sensitive_payroll_access.sql` explicitly revokes authenticated execution of `save_staff_sensitive_employment` and removes `people.sensitive.read/manage` role grants. It retains the historical table. This repository file is not proof of current live installation or ACLs.
- Migration274 contains the former company-bound sensitive-employment RPC and its permission check. Restoring a frontend field alone could produce a non-working or misleading save; restoring broad authenticated access without inspecting the current role grants would be wrong. This patch does neither.
- Current `PeopleWorkbookDay` and `PeopleWorkbookSheet` are attendance-only inputs. They contain worked/approved OT/short-hour durations and punches; no salary, monetary rate or payroll policy input reaches this workbook builder.
- `src/lib/attendance/people-workbook.ts` writes genuine typed Excel formulas for validated four-punch worked time and weekly totals/minute conversions; the workbook enables automatic recalculation and full recalculation on load. Existing tests deliberately exclude salary/rate/passport fields. The label metadata was made generic in this candidate; calculations were not replaced.
- `/api/people/payslips` is a separate permission-checked, versioned calculation/approval/release workflow, not the attendance export formula chain. No payslip calculation endpoint was invoked.

## Synthetic validation

`tests/attendance-workbook-values.test.js`, `tests/attendance-weekly-workbook.test.js` and `tests/people-workbook-layout.test.js` execute the current builder against synthetic attendance. They check typed duration values, actual formula XML, overnight and incomplete punches, zero versus missing, weekly sums/minutes, and automatic calculation flags. The exported test output is not a proof that a user's existing workbook recalculates in Excel, and it does not test monetary payroll calculations.

## Precise unresolved inputs / activation boundary

1. Identify the affected export endpoint and an affected redacted workbook or its expected columns/formulas. An attendance-only workbook and a salary-calculation workbook are different contracts.
2. Preserve the later salary requirement. Determine whether the affected export calculates money and which existing Owner/People roles already had legitimate access, without expanding staff visibility. Do not re-ask whether salary should be retained.
3. Before any DB restoration, read fresh company-scoped RPC definitions, table/RLS/ACL and relevant role grants and compare against the captured original. No guessed grant or inferred pay formula belongs in this UI refinement patch.
4. Validate any agreed restoration on synthetic rates/attendance with the actual workbook calculation engine, then inspect a saved/reopened artifact; no real salary run.

Until those facts are resolved, S1 must remain **blocked for repair / not production-verified**. “Payroll preserved” under annotation42 must not be reported as salary entry or Excel calculation repaired.
