# Single-page asset transfer candidate (not deployed)

Source: human clarification 2026-10-25 06:06 UTC, Sentinel_e9887244fd648191bd852b5c5cff6f0e. Reopens the existing multi-asset requirement; Production150 single-asset layout acceptance did not close it.

## Flow

Use the existing DocumentWorkspace, the actual PR ItemCombobox with optional multi-selection, and RequestLineRow shared with the actual PR form. Request details are editable before an asset is selected. Search selects directly into the current request; no asset-detail navigation or source-load GET is required. Each selected asset has its own quantity. Removing one row keeps other quantities and details and restores focus. Searching and changing the common source retain lines; unavailable holdings stay visible and block submission until corrected. Existing scoped draft/unsaved and uncertain-result handling are retained.

The existing atomic backend contract is one common From/To pair and date/reason with 1–100 distinct asset lines. Different per-line routes are not invented. The old transfer action and batch-line protections remain unchanged. Catalogue reads use the ordinary authenticated client, company filters and asset_location_access before loading only authorized positive known holdings. No schema or permission changes.

## Activation boundaries

ASSET_BATCH_CREATION_ENABLED=false and ASSET_NUMBERING_ENABLED=false are independent. Editable preparation does not require batch activation; unified submission still requires the complete version3/revision1 batch contract and the separate batch switch. The old combined enable patch is not applicable to this new candidate. Automatic numbering must stay off independently.

The attempted asset transaction was rolled back exactly. Its strict guarded retry is still awaiting approval. A successful asset base package and independent postflight are required before batch submission can be enabled; compact formatter / sequence initialization are separate numbering dependencies and are not required merely to submit a batch. No test consumes an asset number or moves a real holding.

## Verification

- 1951 unit/contract tests pass, zero failures; lint, types and local production build pass (synthetic public build configuration).
- Actual shared components exercised in a localhost synthetic browser at390/820/1440: editable details, two-asset multi-select without navigation, query and quantity retention, reload recovery through AssetUnsavedGuard, source-change validation, individual removal/focus, responsive single action48/44/36, failed-result retry with identical unified payload/client key. No POST or external request allowed.
- Real PR form at three widths: add second line/select different item, first line retained, single-select behavior and page width preserved.
- Shared required select rejects an empty Radix hydration event only when no selectable empty value exists; optional/clearable variants retain existing semantics.

No Preview/Production release, remote SQL, real transfer, inventory movement, automatic ID allocation or account action was performed for this candidate. This is local flow proof, not live backend UAT.
