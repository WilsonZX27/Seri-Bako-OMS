# Preview real-data validation goal

Status: in progress. This extends the existing unfinished annotation-closure goal; it does not declare that goal complete.

## Objective

Publish `codex/production-ui-adjustments` to the authorized `WilsonZX27/Seri-Bako-OMS` repository, then validate the application against the deployed Preview and real records. Local or mock checks alone do not satisfy acceptance.

## Acceptance

- Inventory every application page, including create, detail, edit, tabs and permission-dependent states.
- Check phone (390 × 844), portrait tablet (820 × 1180), landscape tablet (1180 × 820), and desktop (1440 × 900).
- For each page record the deployed commit, actual route, data state, screenshot, console errors, loading/response observations, layout findings, and retest result. Dynamic routes need real accessible record IDs, not missing-ID placeholders.
- Review font size, wording, alignment, control height, spacing, overflow, icons, colors, sticky elements, filters, and navigation against the previous browser annotations.
- Verify downloads and blank form ordering. Classify by Daily, Next day, Beverage, Packaging first; apply existing product display order inside each group. Screen, PDF and CSV must consume the same function. Reclassifying or adding a product must not intermingle categories.
- Review established product conventions before altering patterns. References: [Airtable grouping](https://support.airtable.com/articles/7361540623-grouping-records-in-airtable), [Airtable sorting](https://support.airtable.com/articles/8716174546-sorting-records-in-airtable-views).
- Store raw real-data screenshots and captures in ignored local `test-results/preview-real-data-2026-10-21/`, not in Git. Commit only the sanitized coverage and defect report.
- Verify saving with explicit pending/success/error states using disposable Preview data only after checking Preview backend isolation. A Preview URL alone does not prove its database is isolated.
- Report blocked pages as blocked, including the actual reason. Do not mark unvisited, unauthenticated or empty-only pages as a real-data pass.

## Current evidence

- `cac1b9a4` pushed successfully to the authorized feature branch.
- Vercel GitHub status: Preview building. Deployment: `EKnYAjLgV4wKy148wFQWTu2ckxeZ`.
- Vercel connector returns 403; the user's authenticated Vercel browser session can inspect the deployment.
- 124 application page source files currently inventoried. Page-by-page real-data coverage is pending.
- Existing CSV template exported raw catalog sequence instead of grouped screen sequence: confirmed defect, fixing through a shared group/order function and printable PDF.
