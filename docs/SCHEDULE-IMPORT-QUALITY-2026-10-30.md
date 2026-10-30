# Schedule import safeguards

The October monthly workbook exposed two coupled failures: numeric day 1 after October 31 was treated as October 1, and rejecting dates skipped the location match. The UI consequently asked users to change a correct week and remap known outlets.

Required regression coverage before changing workbook recognition:
- Source-anchored month/year rollover, December/January, leap day, weekday contradiction, and actual wrong week rejection. Never substitute the selected week for conflicting source evidence.
- Each sheet independently located, including preceding stale date blocks and blank days before a new outlet opens.
- Location recognition returned independently of date validation. Unique exact names work without adding a new outlet to a hardcoded alias list. Duplicate names and inaccessible saved IDs require review.
- Errors name the sheet and conflicting source date range or weekday. Location errors distinguish ambiguity from an unavailable authorised location.
- Original workbook local parser preview and anonymous browser preview are different evidence. Synthetic employee directories do not prove live staff or role matching.
- An import preview never establishes successful persistence. Keep published/submitted schedules protected and require explicit review before draft writes.

2026-10-30 local evidence lives in /tmp/oms-feedback9-evidence. No real schedule was submitted during verification. Production acceptance remains pending release approval.
