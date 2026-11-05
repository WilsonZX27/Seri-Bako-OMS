# Stock Card totals and base units — 2026-11-05

Base8ff7143. Actual authorized Owner Production Stock Card,from/to4Nov2026,Allitems/Allbranches:77movements withKG,LITRE,PACK,PCS,etc. Actualphone/desktop showunitlessFilterednetmovement-1472.39anddesktopAdjustmentsamevalue. Screenshot06-stock-card-phone.png/07-stock-card-desktop.png inproduction-audit-20261105-batch18. These are incompatible quantities and mustnotbe a single total. Sourceconfirmsunconditionalreduceoverallrows.

Minimalpresentationfix:all-itemhistorykeepsrowvaluesbutreplacesnetwithselect-itemguidanceandcategorytotalswithdash;single-selected-itemtotalsincludeitsbaseunit. DesktopitemcellnowstatesrowbaseunitbecausethereisnoUOMcolumn. Query,ledgerrecords,runningbalance,filtersandaccountinglogicunchanged. Noaddtobasketorotherwrite.

Ninechecks pass:3actualpageSSRtests(mixedKG/LITREnotcombined,single-itemnegativewithunit,unavailabledoesnotderivezero)plus6existingworkspace/unavailable/bounded-querycontracts. SSRstubsdataandunrelatedUIwrappersonly;notbrowservisualacceptance. Focusedlintpasses;typesresultrecordedinbatchlog. Newintegratedbrowseraftercheckpending. Originalannotationpixelsandotherrolesunverified.

Integration: all nine SSR/bounded-query/workspace/unavailable tests pass, including the tenant-authorization contract. Focused ESLint (page and new ESM render test) and TypeScript --noEmit --incremental false pass. Existing item filter passes p_item_id to the bounded RPC; no query, RLS, permission or database changes in this patch. Hosted readiness and rendered after acceptance remain pending.
