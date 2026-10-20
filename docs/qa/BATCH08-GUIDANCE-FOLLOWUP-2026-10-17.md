# Production mobile guidance follow-up

Production creation and job detail now reuse the same next-step text in the desktop rail and shared mobile action hint. Missing actual quantities use an em dash with UOM instead of concatenating Not recorded with the unit. Primary/secondary action structure is unchanged.

Typecheck and 1638 tests passed. Local Playwright at 390x667 and 430x667 scrolled both pages to the bottom: last output quantity remained above the measured fixed footer and passed elementFromPoint hit testing. Evidence: ../audit-evidence/batch-08-guidance/checks.json and PNGs outside the worktree. Real iOS/Android browser chrome and keyboard behavior remain untested. No submission or deployment.
