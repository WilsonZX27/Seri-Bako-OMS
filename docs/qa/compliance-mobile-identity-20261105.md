# Compliance mobile site identity — 2026-11-05

Base d7d6652. Actual Owner Production route /outlet-compliance/5ab5b8e1-b97f-4a32-9573-5ac7b308dac9 selected from Mid Valley register card. At390×900 the shell only says Outlet Compliance and the entire initial checklist has no visible branch name, despite editable site records. Screenshots05-compliance-checklist.png and06-compliance-expanded.png in production-audit-20261105-batch8.

Source confirmation: branch PageHeader receives branch.branch_name but omits showMobileIdentity. Existing design-system-v2.css excludes data-mobile-identity headers from generic phone hiding. Change adds that existing prop to this caller only. No shared CSS, permission, record, upload or form logic change.

Ten existing convergence/attachment/upload-guidance tests pass; focused ESLint and git diff --check pass. No newly invented test for a one-prop presentation change. Actual changed-version screenshot still pending integration; source contract inspection alone is not visual after acceptance. Original annotation screenshots unavailable, so this cannot close all annotations. No data entered or submitted.

Integration on d7d6652: all 10 focused tests, focused ESLint and TypeScript --noEmit --incremental false pass. Existing PageHeader data-mobile-identity and CSS exclusion confirmed. Hosted Preview readiness and changed-version visual verification remain pending.
