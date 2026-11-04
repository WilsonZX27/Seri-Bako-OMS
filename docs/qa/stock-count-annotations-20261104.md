# Stock count annotations 2–6 — local candidate, 2026-11-04

Source: parent delegation referencing user message Sentinel_c100ade746488191a1db2721de076306, routes /stock-counts and /stock-counts/3f4c0875-39e0-4b23-bf72-ecaf1bdcb96b. Baseline 0f2db804275304c90eeb63628071a471bf5b7a61. Independent clone /tmp/oms-stock-count-annotations-20261104; integration tree unchanged.

- #2: compact list status contains the canonical badge only. Pending weight-review text moves into wrapping document detail, outside the shared nowrap status column. Desktop pending explanation wraps without one-character compression. Raw statuses remain unchanged.
- #3–4: weight reviews use white divided rows, explicit text hierarchy, block labels, two form columns when space permits and one phone column. Existing evidence, limits, actions, permissions and warnings are preserved.
- #5–6: read-only Count Lines uses 15 rows per page, shared PaginationControls, GET search over the complete already-authorized line collection and original one-based row indices. Search covers item name/code/ID/index, retains other query parameters and clamps invalid pages. Tablet/phone rows remove duplicate enclosure spacing. Draft inputs, posting, data scope and totals are unchanged.

No business-rule change, SQL, real inventory write, login change or deployment. Pagination is presentation-only; all lines are still read under the original query's authorization. Index follows existing source ordering, not a new persistent identifier. Existing historical recovery controls retain their original permission conditions.

## Evidence

- TypeScript and targeted ESLint passed before fixture and after restoration.
- 9 targeted tests passed: page boundaries, original indices and reference preservation, search beyond page one, case-insensitive matching, empty/malformed pages, plus existing KG schema and posting-confirmation tests.
- Actual local IAB pixels inspected at 390×844, 820×900 and 1440×900. Exact current Count Lines JSX was temporarily extracted into /login with synthetic 32-line data; actual shared review/list components rendered. Phone search found Special flour at original #20; desktop Next displayed #16–30. Expanded phone/tablet review inputs were readable. 820×390 DOM had scrollWidth=clientWidth=820; screenshot was scaled by the browser surface and is not a complete landscape acceptance claim.
- Temporary fixture restored; server stopped after verification. No screenshots saved as deliverable files; pixel evidence exists in tool results.

## Pending / limitations

Original annotated screenshots were not available: specified message not returned by thread lookup; Library image inventory contained older uploads, no matching November 4 annotations. Therefore annotation-by-annotation original-image comparison is pending, not claimed passed. Existing IAB showed access-status?reason=idle-timeout with “Session ended”; authenticated read of the target record, its actual role and current status remains pending. No role impersonation or real save was attempted. Whole DocumentWorkspace rail geometry and physical iPad acceptance remain pending; synthetic fragment validation does not establish those. No full build or broad suite rerun for this scoped presentation change. User acceptance and release remain separate.

## Integration on b80e412
Supplied SHA256 matched `8c42dc28431a11ce212e706b6d2a9cc8ae7f20dbe75a904f602e95f6822b343d`. Source/tests applied cleanly. Rules-document append conflicted with the newly integrated Low Stock section; both rules retained. 32 targeted tests passed for line pagination/search, KG schema, primary actions, current items, autosave, prefill and list availability. TypeScript, targeted ESLint and diff check passed. Pagination affects read-only Count Lines only; draft editor and server inventory actions are untouched. This does not establish preservation of an unsaved separate weight-evidence form across GET navigation. Original image comparison, whole authenticated page and release acceptance remain pending. No SQL, inventory mutation or deployment.
