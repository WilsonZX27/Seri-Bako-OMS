# Mobile task label — 2026-11-05

Base fbf74d9. Actual authorized Owner Production PR/NOV26/014, /purchase-requests/5c01e7fb-e9bc-429d-8817-0ccbd3558f56,390×900. Primary Complete Purchasing Review label visibly clipped. Read-only actual DOM:button width152px,scrollWidth181px,nowrap/overflow-hidden inherited. Before screenshots06-pr-review-detail.png and07-pr-stock-details.png in production-audit-20261105-batch9.

Small shared MobileTaskSheet-only fix: label span wraps at words, trigger permits auto height with44px minimum and vertical padding, omit redundant chevron. Existing MobileSheet workflow/files/more callers unchanged. All action handlers, titles, focus management, lock and permission logic untouched.

Five existing mobile-document contract tests pass; focused ESLint and git diff --check pass. This verifies source/contracts only. Changed integrated browser320/390/desktop layout and keyboard checks remain pending; no changed screenshot or no-flicker acceptance claimed. No field edits, review submission, attachment actions or other business writes.

Integration verification: five mobile-document tests, focused ESLint and TypeScript --noEmit --incremental false pass. MobileSheet already accepts ReactNode labels and optional chevrons; accessible title and action handlers remain unchanged. Hosted readiness and rendered after acceptance remain pending.
