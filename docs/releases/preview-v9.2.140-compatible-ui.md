# v9.2.140 Compatible pre-v10 UI repair

Target:existing codex/ui-followup-136-20261023 Preview branch; Production unchanged. Base9.2.139 dc3b822245d3cb1c4e9f599690c4b91250853638; frozen full-feature local v4 retained separately. All compatible repairs are included, not just two hotfixes.

## Included
- Daily desktop table, compact quantity tracks, single helper descriptions, readable date/branch/count rail and truthful missing-submitter display.
- Concise distinct notification tasks/destinations, long identity wrapping, Dashboard repair-copy and odd-metric-tail fixes.
- GR icon/metadata grouping and readable long supplier identities.
- Asset workspace fixes and existing compact fine-pointer desktop36px/touch44px contract, with existing mobile heights retained.
- O10 independent personnel list for the selected authorized branch, gated by existing attendance/comp-time/staff read permissions and RLS, retaining balance/approval/history semantics.

## Shared-database safety boundary
assetFeatureCapabilities always returns bothfalse and does not invoke any readiness RPC. Automatic IDs remain manual; new multi-asset request/detail/register/RPC paths remain disabled. Existing single-asset flows continue. No active migration files, SQL execution, grants, sequence seeds, account/branch changes or real saves. Review-only proposals and dormant tests/components remain clearly labelled and are not installed/enabled. Preflight tests must prove no readiness call even if shared schema advertises readiness.

## Acceptance boundaries
Local source/full-suite/build and synthetic interaction evidence are separate from hosted real-page acceptance. New release requires exactversion read-only real-page smoke via existing reviewer; synthetic-value approval does not permit real business changes. N9 reference, automatic numbering/multiasset activation, extra12/13+annotation source and untested real-role/save flows remain open. Not v10final; no Production release.

## Actual release-candidate local gates
Node22.23.4:1828/1828 full tests, typecheck and lint exit0; release consistency against139passed; synthetic-public-config production-mode build exit0. These checks were run after the permanent UI-only feature gate and140version edits. Known build warnings retained in local logs. Generated Next include/reference modifications verified/restored. Hosted build/real-page acceptance recorded separately; Ready is not all-role/save acceptance.
