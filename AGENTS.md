# Working on OMS interfaces

- Read PRODUCT.md, DESIGN.md and docs/v10/DESIGN-CONTRACT.md before changing an interface.
- Fix the shared component or token that owns a repeated problem. Check its existing callers before adding a page-specific variant; avoid a second phone/desktop implementation of the same control.
- Reuse WorkspaceTabs, UnifiedListHeader, PaginationControls, DocumentWorkspace and the house SelectControl where their contracts apply. Preserve permissions, query parameters, form payloads and keyboard behavior.
- Keep responsive sizes scoped: phone primary actions are 48px; tablet touch and compact desktop controls follow their existing tokens. Do not apply a blanket global size override.
- For a shared-component fix, keep a regression check for the actual caller and responsive behavior. Include an unaffected caller or state when a change could spread beyond the reported issue.
- Distinguish source checks, synthetic browser checks and authenticated Preview evidence. A passing build or a version number does not close a visual requirement.
- Preserve annotation batch IDs and unresolved requirements. Record duplicate mappings without deleting their original sources.
