# Alignment and concentric surfaces — local verification

Based on user annotations and impeccable layout skill. Two independent agents performed visual/source assessment and mechanical scanning. No deployment, permission, financial or production data changes.

## Findings and disposition

- PR item/supplier and quantity now share the content edge after the number gutter. 390px: x=53 for both; 320px: x=49 for both. Compact row and touch height retained.
- PR editable details use ordinary layout wrappers, not transparent Cards that the canonical CSS re-styled. Current rendered submit label is Submit to Manager Review at 1440/390/320; no label change was needed.
- Return form uses grid gaps; hidden fields do not create sibling margins. Notes cell exists only for Other. First visible offset equals padding + border: 17px desktop, 13px mobile. No empty row remains.
- Return desktop data tracks are proportional rather than five fixed 112px fields. PO context uses the existing neutral muted surface.
- Whole src JSX surface inventory: 347 declared surfaces, 23 explicit nested pairs. Expanded rounded-region inventory: 466 declarations, 94 candidates (includes controls). These are static candidates, not confirmed defects or runtime route coverage.
- Of 23 explicit pairs: 19 inset regions now use data-inset-surface; People duplicate list surface removed; two zero-padding dialog shells and one independent logo image remain deliberate geometric exceptions. Supplier-invoice groups additionally use the inset contract. PR wrapper removed separately because imported components hide lexical nesting.
- Inner radius = max(0, outer radius - inset). Current panel radius is12px, reviewed insets >=12px yield0px inner corners. Independent panels, controls, pills, circles and edge-attached sheets retain original geometry. No broad descendant CSS override.

## Evidence and limits

24 procurement main views at1440/390/320 plus5 mobile-bottom captures; 16 shared-surface main views at1440/390. All40 measured main views have no document horizontal overflow. Representative recipe, import dropzone and sequence preview inset radii measure0px. Other-notes show/hide verified without submit. Geometry and screenshots in gemini-alignment-radius-recheck at workspace root.

Mechanical layout detector pre/post returned[]. TypeScript and unit-contract suite recorded separately. Source expectations updated for the intended mobile grid and removal of the People duplicate surface; business assertions preserved. React review: only structural markup/CSS changes, no hooks/data fetching/workflow mutations introduced.

Layout checklist: spacing uses12px gaps and12/16px padding; hierarchy uses peer14px headings and primary-action placement; grid aligns identity and controls; distinct sections retain12px gaps and tighter metadata spacing; density preserves44px phone controls and compact width. Rounded nested surfaces are explicit rather than globally inferred.

Limits: this is whole-source inspection plus representative browser verification, not every route/state rendered. Import result/error branches, logo errors and other conditional states were inspected in source only. True-device keyboards/safe areas and business E2E remain pending. Full-page fixed-bar artifacts remain possible; use bottom captures.
