# Asset and recipe comment follow-up — 2026-10-17

Based on the user's nine annotations on B13R/B14R evidence. Base: 8cbbfeab.

- Inspection choices: five equal columns on desktop; retain two on narrow screens. Remove nested workspace padding; general-repair and checklist surfaces share the same canvas edges.
- Maintenance: preserve approved identity/status summary. Indent update entries with a timeline rule, retain expandable raw audit details, and collapse attachment upload until requested.
- Recipe: mobile summary has Version/Yield in two columns followed by three cost columns. Status and approval badges sit in the details heading; underlying states remain distinct.
- Recipe Costing: one short read-only caveat, with detailed costing/confidence rules behind a disclosure. Missing-cost and UOM assumptions remain available.
- Asset mobile actions: explicitly declare one action column so the full-width info banner stacks above the full-width submit button.
- Asset form: two columns on mobile, top-aligned fields including validation messages. Department and category are selectors with Add new; existing imported/current/history values are deduplicated and paginated. Responsible person selects active OMS account users accessible through existing tenant/RLS scope; historical free-text names remain selectable. Storage retains the existing name field, not a new account foreign-key relationship.

## Validation

TypeScript and changed-file ESLint pass. Existing 1,638 tests pass; two additional option-query tests pass (historical pagination/deduplication and query failure). No permission rules or schema changed.

Browser evidence: `../feedback-nine-recheck/` relative to repository parent, 20 PNGs plus evidence.json. Five routes at 1440, 390 and 320: all 15 main views have no document horizontal overflow. Five 390px bottom viewport captures. Browser asserts desktop inspection choices share a row, native blank-name validation, OMS user options, add-new department interaction, and mobile hint placement/width.

Synthetic local data only. No submit/post/asset-save operation performed. Historical option aggregation is covered by mocked query tests; real-device keyboard/safe area and backend transaction/permission lifecycle testing remain separate work. Full-page images can show fixed bars mid-image; use bottom viewport PNGs for positioning review.
