# Asset annotation batch: local verification

Base: 1597da8c6b7ea90d767e6a834d51f06bf3bc1b95, version 9.2.162. Not committed or deployed. No production business mutations.

## Requested changes

| Comment | Local implementation / evidence |
|---|---|
|1|Transfer Next Action and Document timeline rail follow existing ConsoleSection pattern; phone timeline disclosure accessible. No new attachments/comments business capability invented.|
|2|Main Action history removed; retained audit entries in Document timeline with pagination.|
|3|Asset section values use 14px/600.|
|4|Transfer action optional note removed from both single and batch detail presentations.|
|5|Delivery Orders date/View form scoped sizing; 64px View, phone inline.|
|6|Asset desktop Search constrained to 44px with page-only CSS.|
|7|Checklist date computed in browser: 14px, weight600, same as title.|
|8|Maintenance queue plain divided rows via explicit plain variant. Overview keeps previous cards.|
|9|Compact history shows date, author, note and state transition; audit details collapsed.|
|10|Maintenance updates use compact divided rows instead of nested cards.|
|11|Earlier reports retained in disclosure as plain rows.|
|12|Desktop maintenance detail and queue independently scroll within bounded workspace.|
|13|Queue uses available bounded desktop height; pagination retained.|
|14|Status summary links reset page/ticket, preserve remaining filters. They filter by the selected status group.|
|15|Default Outstanding = Open/Assigned; explicit Resolved/Processed/All remain accessible.|
|16|Creation Remarks optional; empty input generates Asset registration audit reason. Existing-asset edit reason remains mandatory.|
|17|Asset toast vertically centered with explicitly bounded close button. Phone long success message observed, no excess lower blank area.|
|18|Success exposes Register new asset. Browser verified empty new form and disabled save; VM component test verifies fresh request key/remount and stale candidate removal.|
|19|Read-only sequence candidate, explicitly not reserved; no allocation RPC. Success no longer displays candidate as a confirmed ID.|
|20|Desktop/tablet breadcrumb includes Register New Asset.|
|21|Desktop Status/Condition/Check separate columns; tablet table minimum768px scrolls inside container; phone existing rows retained.|

## Shared impact audit

- FilterBar, WorkspaceGrid, ConsoleSection and global design-system CSS unchanged. Two CSS modules limit sizing changes to asset workspace and Delivery Orders.
- AssetMaintenanceQueue has two call sites, both asset workspace: Maintenance explicitly opts into plain; Overview default preserved.
- AssetRegisterRows: asset workspace Assets only. Phone branch retained. Desktop/tablet table changed.
- AssetSectionHeading: workspace Overview/Checklist, asset detail Transfers/Maintenance/Attachments, maintenance detail Update history/Attachments. Values consistently use requested14px/600; no unrelated application headings changed.
- AssetMaintenanceDetailPanel: split workspace and standalone maintenance detail. History simplification applies to both presentations of the same maintenance content; bounded height only workspace CSS.
- AssetActionFeedback: asset-management layout only, all asset action toasts receive close-button/vertical alignment fix.
- Breadcrumbs: shared component, change limited to assets/new branch.
- AssetMasterForm: create and edit consumers. Optional remarks/re-register/sequence preview restricted to create; edit mandatory audit reason retained.
- getAssetRegistration: new asset page only; read-only sequence lookup. getAssetWorkspace: maintenance status predicates targeted; transfer predicate retained.
- saveAssetMaster: create fallback audit reason; edit validation retained.
- Transfer single route and batch component both updated; audit storage and action authorization unchanged.

## Verification boundaries

Real components rendered in localhost fixture with synthetic profile/data. Fake save action returns synthetic success, without a database call. Tested desktop1440, tablet820 and phone390 across this batch; prior screenshot evidence includes maintenance long grouped reports, transfer rail and mobile timeline, Delivery Orders empty state. This turn additionally verified phone toast, tablet form/breadcrumb, success-to-new registration, checklist computed typography, final desktop asset columns, tablet table overflow containment (document820px, table768px), phone asset row DOM.

Evidence directory: /tmp/oms-annotation21-evidence. Final desktop image: assets-1440-final.png. Other images may precede final localized refinements; they are not asserted to be a complete final-width matrix.

Automated tests include real application action execution with mocked RPC, component wrapper execution with mocked React hooks, and source contracts. They do not prove production database transactions or real-role authorization. Maintenance fixture does not apply status filters; predicates checked by contracts, not a live database UI test. This batch did not perform production asset creation/dispatch/status writes. No new exhaustive768/1024 boundary matrix or real-role UAT completed; these remain pre-release verification limits.

Paused staged session/login patch remains separate and unchanged; staged binary diff SHA256: 4602d6d172dafe66f3eb2ed390ae8276b805a2e3de6304779a5c7730161fbba9. Basket atomicity changes excluded.

Final checks recorded separately in /tmp/oms-annotation21-tests-final.log, /tmp/oms-annotation21-types-final.log, /tmp/oms-annotation21-build-final.log. Build uses synthetic localhost Supabase URL/key to allow compilation without production access.

Final run after last source edit: 2128 tests passed, 0 failed; tsc --noEmit exit0; Next production build exit0; git diff --check clean. Final phone asset screenshot inspected, no document horizontal overflow visible. Browser viewport override reset.

## Completed breakpoint follow-up (supersedes incomplete matrix note above)

All following actual local component presentations were rendered and screenshot-inspected at 390/768/820/1024/1440, viewport height900:

| Presentation | 390 | 768 | 820 | 1024 | 1440 |
|---|---|---|---|---|---|
| Overview, existing card variant | checked | checked | checked | checked | checked |
| Assets, search/table/mobile rows | checked | checked | checked | checked | checked |
| Checklist title/date/inspection sections | checked | checked | checked | checked | checked |
| Maintenance, expanded9 earlier reports | checked | checked | checked | checked | checked |
| Batch transfer,3 audit entries | checked | checked | checked | checked | checked |
| Single transfer,empty audit history | checked | checked | checked | checked | checked |
| Registration empty form/candidate | checked | checked | checked | checked | checked |
| Delivery Orders date/View/empty state | checked | checked | checked | checked | checked |

Files: `<presentation>-final-<width>.png` in evidence directory; single transfer prefix `transfer-single`; contact sheets `<presentation>-matrix.jpg` (columns390,768,820,1024,1440). Some initial immediate navigation screenshots captured hydration transitions; affected assets390/768, delivery390/768 and single-transfer1440 were recaptured and inspected once settled. Delivery768 settled button64x44, replacing initial106.5px transitional reading. Raw initial metrics retain that transitional sample for traceability.

Observations: all measured document scroll widths equal viewport width. Overview queue child radius8px preserved; Maintenance plain variant remains separate. Desktop maintenance panels height530/532px with independent overflow:auto and content981/864px at1440; tablet/phone stack normally. Tablet asset table scrolls inside its container, rather than widening document. Both single and batch transfer mobile timeline expanded via actual UI; visible dispatch button count1. No dispatch clicked. Single history empty message rendered. QA single route uses actual production route component and synthetic query response; its generic QA breadcrumb is fixture-only.

Registration success/re-register was previously exercised on final application code with synthetic success: fields reset, save disabled, old preview dropped. Fresh key verified by executed wrapper test; browser hides hidden values, so raw key not claimed as browser-observed. Preview never allocates sequence. No production source changed during this follow-up; previous final2128 pass/types/build applies to identical source.

### Remaining specific limits / readiness

Local visual scope is ready for release review. Not yet published. Remaining external acceptance: real-role database-backed maintenance status query, real registration transaction/assigned-number confirmation, and transfer dispatch authorization/transaction are not exercised by this UI fixture. No claim of live end-to-end business validation. Production smoke inspection must follow an approved deployment; actual business writes require separate explicit scope. The paused login patch must be excluded when creating the release candidate. No basket changes included. No schema/permissions changes required by this batch.
