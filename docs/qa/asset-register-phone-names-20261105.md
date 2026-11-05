# Phone asset register names — 2026-11-05

Base: 298ffd8. Isolated UI-only patch; no deployment or business writes.

## Actual before evidence

Existing authorized Owner session at https://system.seribako.com.my, footer v9.2.174 (deployed SHA unknown), 390×900. `/asset-management?view=assets` showed 465 records and truncated asset names such as “Clock In Punch Card M...” and locations. Screenshot: `production-audit-20261105-batch3/01-assets.png` in the audit workspace. Source `AssetRegisterRows` used `truncate` on both mobile name and location.

## Change and checks

Replace those two mobile-only truncation classes with normal whitespace and word wrapping. Existing code, registered quantity formatter, destination, permissions and desktop table remain intact.

Four focused tests passed (new full-name/quantity/link/unknown-holding checks plus existing Owner/non-Owner import-entry checks). Focused ESLint and TypeScript --noEmit completed with empty diagnostic logs.

Actual component SSR rendered with synthetic long names and holdings, styled with generated project Tailwind, was inspected at 320×900 and 390×900. Name occupied 40px and location 32px, normal whitespace, no root horizontal overflow. Screenshots: `fixed-names-320.png`, `fixed-names-390.png` in that audit folder. This is local static layout evidence, not a hydrated or deployed after-check.

## Acceptance limits

Production was not changed. Need recheck the integrated authenticated version. This patch does not close asset creation sequence/allocation (O16/O17/N11), transfer selection (N10), historical annotations, desktop regression acceptance or reported navigation/backdrop flicker.

Integration on298ffd8: clean apply; new test converted to ESM without lint exceptions.4 focused renderer/import-permission tests, scoped ESLint, TypeScript noEmit and diff whitespace check passed. Only two phone text classes change; desktop table, numbers, links and handlers are untouched. Prior full build belongs to298ffd8, not this new commit; hosted build and authenticated after-check remain pending. No database changes.
