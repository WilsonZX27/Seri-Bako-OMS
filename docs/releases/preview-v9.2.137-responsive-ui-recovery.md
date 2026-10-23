# v9.2.137 (Preview candidate) — responsive forecasts and UI recovery

Base fc7e58c72be3c2c041493ac697af575bb59a41b8.

- Forecast selector and CSV controls use independent responsive tracks; forecast table opts out of sticky identity only here and reveals horizontal scrollbar.
- Daily today rows show Today once, preserving dateTime; otherdates retain numeric date.
- Submit presentation releases after matching-form reset/pageshow/popstate, existing React pending=false/unmount and route navigation. No automatic retry, save-success assertion or timeout release.
- Five prior failing contracts now test current semantic roles, actual SSR task identity, CSS owner declarations and scoped recovery events. Old yellow panel/sm-fourcolumns/context-onlyrail/portrait-query/MutationObserver+30stimeout are not current acceptance requirements. Source parsing is not layout acceptance.

32product/layout-fixture checks +32semantic-contract checks +3mutation checks passed locally before fullsuite. Browser retest pending; no Production deployment.

Core business source and migration history must remain byte-identical136. No SQL execution, businesswrites or permission changes. Multiasset/leave/numbering/Chefperms remain separatelyopen.

Final Node22.23.4 fullsuite1786/1786pass0fail; typecheck0; whole-sourceLint0; synthetic-configNextbuild0. Three interim failures were only fixture loaders missing newly introduced local recovery module; dependencies corrected and all15 recovery checks pass. Browser137 acceptance remains pending, no live mutation test.
