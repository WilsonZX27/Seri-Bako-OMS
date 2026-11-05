# Published schedule initial guidance — 2026-11-05

Base691b13e. Actual existing Owner Production /attendance/schedule,CK @ ALMA,2–8Nov2026. Desktop right rail shows Published with publication history;phone staff controls disabled,while initial helper still instructs Choose an assignment,then select staff days. Actual02-schedule-staff-bottom.png and04-schedule-desktop.png in production-audit-20261105-batch13. This is misleading guidance,not evidence of a permission defect.

Only initial message copy changes:published schedules say read-only until authorised correction is opened;locked schedules say read-only. Other initial states retain existing guidance. Existing correction handlers already replace the message when entered. No access,assignment,data or posting change.11existing workflow action tests and focused lint pass;git diff --check passes. Actual changed-version visual acceptance pending integration;no source-only claim of full workflow acceptance. No shift editing/correction/import/publish performed.

Integration: all 11 workflow action tests, focused ESLint and TypeScript --noEmit --incremental false pass. Correction-entry handlers still set their existing active-mode guidance. Hosted readiness and changed-version screenshots remain unverified.
