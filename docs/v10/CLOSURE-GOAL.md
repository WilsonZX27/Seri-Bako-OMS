# OMS UI closure goal

Preserve full accepted UI changes plus verified Production2d89524c business behavior. Close reported defects through isolated regression checks and screenshot-backed390/820/1440 acceptance. Ready is not closure. Production changes require a separate decision.

Current release baseline9.2.136 fc7e58c72be3c2c041493ac697af575bb59a41b8 remains immutable. Follow-up branch codex/ui-followup-136-20261023 is the sole writer.

## Gates
1. F1/F2/F3 screenshot-proven planning selector, sticky input and DailyToday fixes.
2. Five failed contracts reconciled with equivalent semantic/behavior tests; no assertion deletion or product changes to satisfy stale design. Browser lifecycle remains required.
3. Reconcile docs/v10/ANNOTATIONS-27-2026-10-23.md and earlier34-item ledger; each item retains exact scope, owner, fix, test, deployedSHA and real screenshots. Source-only is not accepted.
4. Node22 tests/type/lint/build; coherent version/footer/docs update only for a meaningful combined Preview batch.
5. Read-only local reviewer screenshot acceptance, no role impersonation/business writes. Record unavailable roles/states asblocked.

Multi-asset transfer, leave balances, automatic numbering and Chef/permission redesign are unfinished feature/proposal scope, not silently resolved UI defects. No SQL execution, remote migration, role grants or real business submissions.

## Current closure ledger
| ID | Owner | Baseline evidence | Local fix | Test | Rendered acceptance |
|---|---|---|---|---|---|
|136-F1|EmployeeForecastEditor|planning-outlet-390.jpg, selector44px|singlecolumn controls below640/twocolumn above|32 targeted SSR/schema/forecast checks PASS; no browser claim|pending|
|136-F2|EmployeeForecastEditor/Table opt-in|planning-forecast-keyboard-820.jpg, hit test wrongcell|disable sticky only here, visible scrollbar|32 targeted SSR/schema/forecast checks PASS; no browser claim|pending|
|136-F3 /27-7|Dailylist|daily-list390/820/1440 screenshots|Today instead of duplicate visible date; machine datetime retained|32 targeted SSR/schema/forecast checks PASS; no browser claim|pending|

Evidence base /private/tmp/oms-preview-acceptance-evidence-9.2.136/ACCEPTANCE.md. Raw screenshots retained locally; no nativeLibrary delivery claimed.

## Production procedure inspection
Never merely alias a Preview-config build to Production. Existing deployment guidance stages a build using Production environment (vercel build--prod /deploy--prod--skip-domain), tests it, then promotes that same Production-target build. Current136 is Preview-target; Production env parity is not verified. No env values were read/copied and no Production action performed. Current rollbackreference dpl_ECf4TPgezkaP4KiRbzvv68ifbWEf; rollback not exercised.

## Five contract reconciliation (local follow-up)

1. hierarchy: actual OwnerSSR pendingidentity/supplier/location, Outletcompletion, parsedCSS minwidth/attention-surface/no outer-colouredcanvas replaceobsoletepadding/yellowpanel/quickactionstructure.
2. compact attention: nine-role actualSSR andfinancecontentisolation replaceobsolete4columns; remainingfocus/oddrow/sourceassertionsretained.
3. filters: exactaccessibleStockCount search/from/to, scoped responsiveowner replaceobsoleteportraitselector; existing36pxtokenassertionretained butnotclaimed44pxgeometryproof.
4. tablet owner: actualnine-role WorkspaceGrid propcapture and exactlyoneActionssection replacecontext-only expectation.
5. mutation: actualeventlistenercallbacks exercisematchingreset vs unrelated, pageshow/popstate, cleanup/no submitreplay; actualReactbridge false/unmount contractretained. No30stimeout automaticrelease; no livebusinessmutation. Realbfcache/focus/overlaygates remainopen.

ChangesarelocaluntilversionedPreviewandread-onlyreview. Entire34legacyledgerstillmustberecovered/reconciled; current27tableand131routeinventorynotimplicitlycomplete.

Current local137 batch:1786/1786testsPASS; type/lint/build0. This closes the five executable failures, not the browser lifecycle gate or remaining annotations. No remote migration/server/business changes from136. Production decision superseded by usercontinue-to-closure instruction; remainPreviewonly.

Legacy34source recovered from preserved annotation-status report; extracted all34 IDs into legacy34-closure.csv. Historicalpasses remainhistorical; do not inheritascurrentacceptance. Combinedledger has61explicitrequirements across two rounds, with overlaps retaineduntilreviewed. Legacy3missingtarget,7missingnamedrecord,25businessdate remainexplicitblockers/semanticdecisions, not silentlyclosed.
