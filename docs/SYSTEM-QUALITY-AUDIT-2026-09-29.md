# System quality audit — 2026-09-29

This audit covers the current source tree and read-only production login measurements. It does not certify the authenticated production workflows: the isolated Supabase test database was unavailable.

## Verified

- Strict TypeScript, ESLint, and an optimized Next.js build passed. The build generated 102 static pages and reported 102 kB of shared first-load JavaScript. It also reported the existing Supabase Edge Runtime Node API warning.
- All 1,337 contract tests passed.
- Public authentication/setup layout E2E passed at 8 widths from 320 to 2,560 CSS pixels. In local mock mode, setup now returns to login instead of displaying an error page.
- A browser geometry scan visited 81 static application routes at 320, 390, 820, and 1,440 CSS pixels (324 probes). No document-level horizontal overflow was found. The first scan flagged 6 undersized controls: two visually hidden inputs and four outlet-compliance controls. The visible controls were corrected; focused follow-up scans found no undersized controls on the corrected surfaces.
- The original scan had 21 measurement failures during client redirects. Retrying after the destination document loaded cleared all 16 probes on the four affected routes rechecked. Nine routes still rendered mock-mode error boundaries on 36 probes because their server queries require Supabase; their actual business content was not visually assessed.
- Local mock interaction smoke passed for purchase-request quantity increment/decrement, compliance-calendar day selection, and month navigation. No business record was saved.

## UI changes

Phone filter bars, shared buttons, native date inputs, workflow triggers, setup disclosures, and outlet-compliance controls now use the shared 48 px phone control height. Purchase-request quantity and unit fields stack on narrow layouts, giving the quantity input and both stepper buttons usable touch areas. The compliance calendar uses at least 44 px date buttons; its grid scrolls horizontally on narrow screens instead of compressing the hit targets. These changes follow Apple's [design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) on consistency and [button guidance](https://developer.apple.com/design/human-interface-guidelines/buttons) on a hit region of at least 44 × 44 points, translated to CSS-pixel targets for this web app.

## Performance evidence

Five read-only production `/login` requests returned HTTP 200. The first curl request had a 1.85 s time to first byte; the following four were 0.12–0.18 s. In Chromium, the first 390 px login load completed in 3.02 s and two warm loads in 0.24–0.54 s. Three 1,440 px loads completed in 0.18–1.08 s. These small samples include network/cache variability and do not measure logged-in pages, database query latency, or concurrent users.

## Not yet verified

The repository lists 456 Playwright E2E cases, including role and tenant workflows. The local Supabase CLI could not reach a Docker daemon, so the isolated test database and role fixtures could not start. An attempted local UAT run also hit the sandbox's `::1:3109` listener restriction before it could exercise those flows. No production write-flow E2E or load test was run. A complete release gate needs an isolated populated database (or production-like clone), the configured test roles, a working browser server, and then the full UAT matrix and logged-in performance run.
