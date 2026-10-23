# v9.2.138 (Preview candidate) — Asset workspace clarity

Parent line retains13734619fbd UI recovery,136fc7e58c production business restoration, and prior61-row ledger.

User27#17/#19–24 localfixes: three independent assetidentity/General/Purchasecards with registrationnote inidentity; unchangedallfieldnames/required/readonly/hiddenidempotencyfields andsubmitowner. Maintenancequeue intrinsicheight withboundedscroll andunchangedpagination/query; longnamegets two lines andtitle, existingassetIDshownnexttostatus. FourphoneKPIcolumns, labels canwrap. Maintenancefilter shares existingtabletquerytracks/count, twoequalboundedcontrols, noemptysearchtrack; stableSSRforms. Assetworkspace navigation nowonewrapperroot, avoiding12px space-y siblingmargincausedbyhiddenphone+desktoproots.

Desktop globalconsole remains at sharedpageheaderlevel, not artificial per-routeoffset; tablet embeddedrail andmainnavigation sharefirstrootbaseline. This expectation requiresactualretest; do notcallalltopalignmentclosedbeforeevidence.

Beforeevidence: /private/tmp/oms-asset-before-9.2.137/REPORT.md andactual390/820/1180/1440screens. FiveisolatedSSR/CSScriteria testsfailbeforefix,passafter; names/ids/filters/selectedrequest/fullfieldsandpending/readonly/new/edit verified. Entire1791tests0failbeforeversionmetadatafinalpass. No backend/query/permission/migration/businesschange. NoautomaticID/newbusinessfeature. Actualaftervisualpending.

Final Node22.23.4:1791/1791tests0fail; ESLint0; synthetic-configNextbuild0; sequentialpost-buildtypecheck0. Earlierparalleltypecheck hitTS6053 whileNextrecreatedgeneratedtypes; no config/assertion change, sequentialcheckpassed. SSRqueuefixturespreserve ticketIDs, selectedticket, location/status/pageGETfilters, assetcode andlongname; formfixturebothnew/edit preservesallfields, requiredreason, readonlyID, pendingfieldset.
