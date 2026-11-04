# Browser comments 13 — 2026-11-04

Source: user screenshots of Production TRX and followup Preview Publika. Independent batch; IDs retained.

## Local implementation, not deployed or visually accepted

- #1/#3/#10/#11/#13: shared product and four quantity tracks for daily groups, sized by panel container. Numbers remain equal width; reason follows quantity row. No data mapping change.
- #4/#12: editable comment only for Other. Existing remarks retained in form payload and shown as text for other reasons.
- #5: remove visible technical channel keys and reduce row padding; names, ordering restrictions, permissions and save contract unchanged. Further visual review pending.
- #6: no stores defaults to Add store instead of an unusable movement form. Existing store workflow unchanged.
- #7: selected source can be applied to matching unresolved conflicts only; existing choices preserved, requires recheck. No import occurs on batch selection.
- #8: original workbook requested. Parser already scopes matching to a selected seven-day header; sheet names alone are not dates. Do not guess source month from WEEK number.
- #9: Unpublished means the other outlet's assignment has not been published, not a command to undo publication. Existing permissions unchanged.
- #2: unresolved persistence work. Migration 363 explicitly normalizes non-daily wastage to zero and saves carryover usage separately. Renaming Usage to Wastage would misrepresent old data. Requires a separately reviewed persistence change and compatibility handling; no real records changed.

Verification: TypeScript and targeted ESLint passed; 35 existing targeted tests passed (history, availability, sales settings and workbook recognition). These tests do not establish new batch-selection interaction or rendered layout acceptance. Authenticated Preview, responsive visual acceptance and Production not yet performed for this batch. Existing f1d06d6 Preview remains the deployed candidate.

Update #2: user chose historical-only Usage. Local UI/payload and guarded SQL candidate are prepared; see [save trace](odr-carryover-save-trace-20261104.md). This supersedes the earlier unresolved business decision, but deployment and full-chain verification remain incomplete.

## Preview dependency notice
Before publishing this combined candidate, both Daily form routes now perform a zero-row read of the additive carryover confirmation column. If unavailable and the form includes next-day food (including historical tracking), the form visibly states read-only Preview, locks inputs and prevents submission. The server action retains its independent pre-RPC guard. Three actual-component static-render assertions pass for missing/ready dependency and unaffected daily-only forms. No database installation is performed by this release; next-day Wastage saving remains unavailable until separately approved SQL. This notice is not a claim that all other application routes are read-only.

## Integration checkpoint after be54e03
The earlier full-chain verification gap is superseded by the carryover full-chain and concurrency evidence linked from the save trace/install review: 28 saving-chain assertions and five real two-connection scenarios passed. SQL remains uninstalled. User approval is conditional on confirmation that compatible Preview c8915d86 is READY; that condition remains unverified after Vercel list returned403. No alternate access or deployment attempted.

Application c8915d86 was pushed to the existing followup Preview branch. Later local commits a1fdcc21 (asset import secondary action) and be54e03 (fixed import result footer) are not pushed. On be54e03,49 combined targeted tests passed and the complete Next.js build exited0. Logs: /tmp/oms-be54-integrated-tests.log and /tmp/oms-be54-build.log. No real business writes.

Remaining: original workbook for #8; actual responsive/authenticated acceptance of this batch; the new batch-selection interaction is not established by source tests; black blur flicker remains unreproduced. Import result390/1366 and asset entry six-width checks are originating synthetic fixtures, not authenticated acceptance.

## Additional authenticated bounded audit
Owner WILSON, fixed followup alias: sales settings1440px displayed compact rows without separate technical-key labels; move-boundary buttons disabled, Save and Back visible. Back to Settings link exercised without editing fields. Schedule import initial modal opened at desktop, remained within390x844 after viewport change, Close removed the backdrop and restored the schedule visibly. No workbook uploaded, so conflict resolution, original week-filter report and post-import result remain unverified live. This single open/close does not resolve intermittent black-blur report. Asset registration Import from Excel linked to /asset-management/import;390px upload/template page fit without clipping, no file uploaded. Later local secondary-button and fixed-result-footer commits remain unpushed, so these checks are navigation/initial-state evidence, not acceptance of those local patches. Viewport reset, no business mutation or deployment. No new reproducible defect in this pass.
