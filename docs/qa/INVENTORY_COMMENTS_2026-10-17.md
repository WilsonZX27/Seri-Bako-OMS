# Inventory annotation follow-up — 2026-10-17

Base 20099159. Implements the fourteen B15 annotations, using the supplied original Stock Count reference.

- Movement, transfer and wastage metadata use mobile label/value rows with wrapping (40/60 tracks); desktop grids remain. Muted read-only notes and numeric context use a consistent borderless grey fill.
- Movement form pairs type/direction and quantity/cost. Item/date/branch and remarks retain full width. Quantity label includes the selected base UOM, cost includes RM.
- Shared console overflow triggers use an accessible ellipsis; primary action gets remaining width and the overflow slot is 44px. Creation FAB's neighbouring overflow trigger also uses ellipsis.
- Editable Stock Count restores two-column mobile tiles and original count-progress + Save draft bottom bar, with no extra mobile document header. Posting, secondary actions, attachments and history remain in a mobile disclosure. Backend save/post permissions and arithmetic are unchanged.
- “Edited this session” describes changes relative to loaded physical quantities. Row variance still compares physical to theoretical quantities. Thus 0 edited and +12 variance can coexist correctly.
- Transfer/wastage actions have semantic icons. Attachment recommendation uses normal-weight muted 12px text.
- Transfer and wastage mobile list/empty-state surfaces have explicit white backgrounds/borders. Page jump is normal-weight with no outer card shadow/border.

Validation: TypeScript passes. 1,640 tests pass (three existing source contracts updated to reflect intentional layout changes; unrelated CSS regex bounded to its own rule). Changed-file ESLint has no errors; existing sortable-table aria-description warning remains.

Evidence: ../inventory-comments-recheck has 28 PNGs (20 standard views, four bottom views, four additional 320px views). Eight 390/320 views refreshed after final refinements. No document overflow in 20 standard and eight narrow capture checks. Long synthetic label/value strings tested at 320/390 without overlap/overflow. Ellipsis action sheet opens and Escape closes it. Synthetic local database only; no save/post/dispatch operation performed.

Remaining: real-device keyboards, lifecycle posting/rollback/permission E2E. The stock-count reference's real names/data were not copied into fixtures. 320px numeric inputs are narrower while preserving the requested two-column layout.
