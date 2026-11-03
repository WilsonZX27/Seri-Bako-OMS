# Production sheet follow-up, 3 November 2026

User requests: smaller item codes, vertical column titles, explain PJS10 still20 products.

Current authenticated annotations21 Preview edfec544 downloaded real PJS1003Nov v1 PDF. Actual PNG inspected: header is already rotated90degrees, all8 outlet names legible, codes unbroken, no alternating row tint. User-provided screenshot has horizontal broken headers and different SC01 quantities304 vs live112; do not treat it as the current exported file. Its originating export/version is unknown.

Local minimal code delta: PDF item code8→7pt and never wrap; browser print code9→8px with nowrap. Existing rotated headers retained. Quantities, names, rules and plan payload unchanged. Local20-row/eight-outlet synthetic PDF rendered and inspected;6 existing targeted production-supply-period tests pass including multipage export. First standalone sample harness failed because VM-realm arrays were passed to pdf-lib; fixed harness module loading, not product code. Native Safari/print not verified.

Live read-only database evidence: 03Nov PJS10 plan4239f11e-20ea-4348-8e57-23da7538e3c7 v1 draft was created02Nov07:48:26UTC (15:48MYT), with20 persisted product rows. ALMA plan2b3388f1-6537-4218-aae5-60074a554085 v1 has42. Missing22:BB01–BB07,BB09,BI06–BI07,DR01–DR04,RT01–RT05,SRR01–SRR03. All22 active, undeleted and in supply period; PJS10 has0 batch-rule rows and0 forecast rows for these22. PJS10 included_product_ids isNULL; ALMA has explicit selected IDs.

Historical generator skipped unconfigured products when employee planning existed; b31c14ff removes this continue. Existing saved plan loader still reads persisted production_plan_products; print/UI show only products with corresponding lines. Thus new visibility code does not rewrite old snapshots. This is not a20-row pagination cap, not export-only omission, and not these22 being seasonal/inactive.

No recalculate/save/configuration/plan write performed. Recalculate suggestions can change existing quantities; restoring missing rows must be a separately reviewed data update preserving current20 product values and allocations, with new quantities left unconfirmed rather than copying ALMA quantities. No claim that the20-item live plan has been repaired.

Evidence:/tmp/oms-planning-print-20261103-evidence (live PDF render, persisted counts, missing product aggregation, synthetic after render, test log). Code local only, no push or SQL.
