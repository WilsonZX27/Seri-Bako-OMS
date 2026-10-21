# v9.2.126 — local UI review candidate

This local candidate continues the v9.2.125 responsive annotation batch. No Vercel deployment, Production change, permission change, schema change, or business-data mutation was made.

## Stock Count phone filters

- Keep Search, Branch, Status, From date and To date visible inline at phone widths where they fit; filter fields remain grouped in two columns below the search/action row.
- Correct the 360px search/count wrapping while keeping the query card within its available width.
- Remount controls when applied filter parameters change so Reset clears stale query text.
- Align the annotation-derived rules with the current design authority: 36px desktop visual controls, 44px touch targets, and a filter sheet only when inline fields do not remain readable.

## Verification

- Browser widths: 360×800, 393×852, 768×1024, 820×1180, 1180×820, 1280×900 and 1440×900; no document-level horizontal overflow.
- Search produced the expected no-match empty state; Reset returned to the unfiltered route and cleared Search.
- All four Stock Count filters were visible inline through 1180px; the 1280px and 1440px desktop toolbar remained compact.
- `npm run typecheck`, `npm run lint`, and `git diff --check` passed.
- Local Mock contains no Stock Count records. Populated-record behavior, live permissions, all-role behavior and transaction flows remain unverified.

This is a local review candidate, not a full annotation close-out or release sign-off. Remaining inventory is tracked in `docs/qa/HISTORICAL_ANNOTATION_CLOSURE_INDEX.md` and `docs/qa/2026-10-21-closure.md`.
