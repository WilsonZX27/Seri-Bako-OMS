# Final visual follow-up — 17 October 2026

Shared mobile list search is now a green primary action. Filter-only rows use the compact two-track arrangement rather than a missing search track. Delivery Orders exposes its date directly, and shared workspace tab labels/icons use 12px/16px sizes with natural horizontal scrolling. Attendance import no longer renders an empty status paragraph. Maintenance Save update is primary green. The owner's explicit solid-red Logout preference is preserved despite Gemini's lower-priority style suggestion.

The redundant /production overview redirects to /production/jobs, which already has a right console, Planning and Variance links. Existing bookmarks continue to work. Navigation contracts and the legacy responsive E2E spec now target the maintained workspace.

Report a problem opens a modal over the maintenance workspace. Legacy /asset-management/maintenance/new links retain location/asset parameters through redirect. Original permission checks and report action remain. The shared modal handles focus, Escape, overlay, and viewport limits. Scrollable form content is separate from the fixed dialog footer. Close invokes a real navigation link to retain the existing unsaved-draft guard. Inline general-repair forms remain available in location checklists.

Validation: 1,637 regression tests passed; TypeScript and production build passed using synthetic local configuration. ESLint has zero errors and the existing sortable-table aria-description warning; build also reports the existing fonteditor-core dynamic dependency warning. Local authenticated synthetic Playwright verified modal at 430×667 and 1440×667, unobscured submit hit target, Stay preserving entered text, Discard closing, and /production redirect. Delivery Orders, Attendance and Jobs had no document overflow at 430px. Screenshots inspected after fixes. No business form submission was performed.

Dashboard computed KPI font is ui-monospace/SFMono-Regular/Menlo fallback, 700 weight, primary values 22px; smaller secondary figures remain 14px. OperationalHub already uses the same sb-kpi-value class; the reported sans-serif mismatch was not reproduced and was not treated as a confirmed bug.

Limitations: real-device soft keyboard/safe-area behavior has not been verified. The updated repository E2E spec was not run with a full role matrix; the scoped local browser check above was run. No deployment or production write.
