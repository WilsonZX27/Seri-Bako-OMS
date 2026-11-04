# Schedule import result visibility — local candidate

Parent/base: 2dbf979 (independent delta; preceding RO patches remain separate).

The sole existing result message moves out of the scroll body into the non-shrinking footer above actions. Header/navigation remain non-shrinking. Success, partial failure and error text retain their existing source and suppression logic. Source warnings and unresolved-days note remain. Long status messages wrap and have bounded internal scrolling. No API, permission, import or database changes.

Validation:
- 26 targeted tests passed: schedule-import-result-visibility and schedule-workbook-recognition.
- Target component ESLint, TypeScript noEmit and git diff --check passed.
- Browser: actual component SSR + actual Tailwind/global/design-system CSS, synthetic review with 35 unresolved warnings and sample success result. 1366x900 and 390x844 visually checked. Desktop body scrolled to 1065px while status stayed y718–776; mobile status y618–692 and footer y601–812, with actions below and no overlap. Browser viewport reset and local server stopped.
- Fixture render-preview.cjs reproduces isolated markup into /tmp/oms-import-result-preview/index.html (create directory first; generate style.css using Tailwind CLI and append src/app/design-system-v2.css). Hooks inject a synthetic result; zero eligible outlets intentionally disable writes.

Limits: this is a component layout fixture, not a hydrated Next.js or workbook-save E2E. Original annotation image was not materialized; parent-provided description guided the fix. No production/real-device acceptance, real schedule writes or deployment. Node24.21.0 used; Node22 unavailable in checked local locations.

Integration on a1fdcc21: verified supplied SHA256; component patch applied without conflict, rules appended alongside newer decisions. 26 targeted tests, TypeScript and scoped lint passed. Existing 390/1366 synthetic evidence belongs to originating work; no additional authenticated visual acceptance claimed. No real schedule operations or deployment.
