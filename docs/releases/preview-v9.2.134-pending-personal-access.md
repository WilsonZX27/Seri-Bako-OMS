# v9.2.134 (Preview candidate) — pending work and personal access

Base: `d26eac3c36a712253911e690eb297f12e446adfb` /9.2.133.

Current Owner IAB evidence at this exact baseline reproduces checklist errorReference3691376504; mobile More/Profile lack own-attendance/payslips links while both target pages open successfully. Actual Dashboard shows3actions vs5 in Updates, repair/PR weights differ; Updates titles are mixedcase and its bottom action overlaps the fixed navigation. Evidence in `/private/tmp/oms-preview-next-batch-evidence-20261023` derives from current pages; original27user screenshots were9.2.132 and are not conflated with these captures.

## Changes / eleven annotation IDs

- #18: committed migration368's existing get_asset_checklist_summary returns onlycheckDate/checklist; current query unconditionally accessed overview.locations.map. Real query executed with that exact narrow result crashes in Owner/Kitchen fixtures before thefix. Skip overview-only location metric mapping for checklist. Preserve canonical checklist naming, tenant/permission filters, counts and errors. No migration or liveRPCwrite. This identifies a deterministic source defect; matching live serverstack is unavailable, so closure requiresactualPreview checklist retest.
- #1: keep up to5actual pending records instead of slicing the already fetched5to3; preserve order, total and unknown state.
- #2–4: selected Dashboard pending row body/status/meta use400fontweight; repair asset/issue and location/byline/date reuse PR metadata owners. No global heading/amount restyle.
- #11–13/#26: concise uppercase task identity, workflow state and repair priority ononeheader; remove redundant tray subtitle and extra priorityrow. Notifications remain distinct, preserve full message in text/tooltip and actionable detail links; lineclamp2onlysummary. No dedup by text or count loss, no markread mutation.
- #25: tray scroll body flexes/shrinks within its header; mobile/tablet viewport reserve includes fixed bottomnav/safearea. Existing Escape/returnfocus handlers unchanged; actual shortlandscape viewport still needsretest.
- #27: add My attendance and My payslips in existing More panel using precisely desktop selfroutes /attendance/confirmations and /attendance/payslips, no employeeID/params. Keep all routeauth/ownscope checks and no newpermissions.

Separate deferred requirements #5multiassettransfers, #10central timeoffbalances, #16transactional assetnumbering are not included. Remaining27items stay open.

## Verification boundary

Seven new isolated semantic cases pass: Owner/Kitchen narrow checklist RPC and retained errors; actualDashboard projection0/3/5/8 preserveslimit/order; mobilepaths matchdesktopselfroutes; actual UpdatesSSR preservesdistincttargets/states/fulldetail; scoped400andnavigationclearance. Fullsuite/typecheck/lint/build results recorded afterexecution. RealPreview viewport/accessibility checks require localreadonlyreviewer; never count these fixtures as visualroleacceptance. Existing9.2.133fourvisibledefects remainPASScurrentOwneronly; realoverflow,errorstate,otherroles/lifecycle/performance stillpending.

Final Node22.23.4 fullsuite1760/1755pass/5fail versus1753/1748/5baseline; exactfailure set unchanged. Typecheck and changedsource lint exit0; focused15/15. One olddynamicviewport contract initiallyfailed because it demanded the removed innerheightliteral; replacement parses the actual outertray CSS dynamicbound, mobile navigation/safearea reserve and flexscroll ownership while retaining overflow/no-fixedheight assertions. This is recorded, not labelled an application regression or silently deleted. Hosted build and exactPreview visualretest remain required.
