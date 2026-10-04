# v9.2.83 — Purchase Request list chronology

Production deployment `dpl_DsLmSB87WZSXxTatYTD61kEdyFnv` is Ready and aliased to https://system.seribako.com.my. Source commit: `4c4b77c3`.

Read-only production evidence confirmed PR/OCT26/006 exists, is not deleted, has two lines, and is in Manager Review. It has no linked Purchase Order yet. Default natural document-number sorting placed it at position 34 (page 3 with 12 rows per page), because SEP sorts above OCT as text.

The default register now sorts by created_at descending before pagination, with id as a stable tie-breaker. Explicit document-number sorting retains the existing generated natural key. Search, filtering, workflow state and records are unchanged.

Strict TypeScript, lint and all 1,393 tests passed on an isolated snapshot containing the committed hotfix. Three compiled-query regressions cover October records ahead of September, retained explicit number sorting/pagination, and invalid-sort fallback.

The hosted production build passed. CLI inspection confirmed the formal domain points to this deployment. Authenticated rendered-list acceptance was attempted but remains unverified: the user changed the active Chrome window during the check, and automation did not take over the user's active window. Refreshing the PR register loads the new default; `/purchase-requests?search=PR%2FOCT26%2F006` also locates the saved record.

Evidence: `/tmp/seri-pr-missing-preflight.json`, `/tmp/seri-pr-006-position.json`, `/tmp/seri-pr-983-release-{tests,types,lint}.log`, `/tmp/seri-pr-983-{deploy,inspect}.log`.

This application release includes the already-applied migration 328 source from the separate GRN hotfix. No new database migration or business-data mutation was performed for the PR list correction.
