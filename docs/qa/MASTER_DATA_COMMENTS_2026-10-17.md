# Master data visual feedback — 2026-10-17

Addresses the eight user comments on batch 16 (baseline 8cbbfeab), on top of 02220aeb.

- Branch mobile populated and no-match lists now use the existing white card surface. Existing Clear filters is retained and interaction-tested.
- Primary Central Kitchen required marker stays inline with its label. Branch type guidance spans the desktop form width.
- Company mobile actions use the previously unified compact ellipsis control.
- UOM From/To remain dropdowns and share a mobile row. Options combine standard units with units from the active company's RLS-visible item, supplier-item and conversion records, paginated at 500 rows. No privileged read is introduced.
- Conversion preview now reacts to both selected units and factor; empty/non-positive factor shows guidance.
- Supplier-item short fields use two mobile columns: purchase UOM/conversion, unit cost/MOQ and valid dates. Identity and context fields retain sufficient width.
- Operational hub metrics use the pale green semantic surface, distinct from the page canvas.

## Verification

- TypeScript check passed; changed-file ESLint passed; full test suite: 1,640 passed, 0 failed.
- 18 primary screenshots at 1440/390px, plus 4 mobile bottom viewport screenshots (22 PNGs).
- All 18 primary captures have no document horizontal overflow.
- Eight additional 320/390px checks cover UOM, supplier item, branch no-match and company pages; all have no document horizontal overflow.
- Browser interactions verify AUDIT_BOX is present, live preview changes to 1 AUDIT_BOX = 24 PCS, clearing factor shows guidance, and Clear filters restores the branch list.

Local isolated fixtures only. No save, posting, production or deployment action was performed. Real-device keyboard behavior, persistence and authorization-role E2E are not certified by these checks. Full-page screenshots can show fixed navigation mid-image; bottom viewport images provide the actual action-bar placement.
