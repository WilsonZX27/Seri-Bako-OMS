# Date action and modal focus follow-up

Date-only UnifiedListHeader controls now use an explicit green View submit action on mobile, matching desktop manual date submission. Date changes alone do not navigate. The date field remains bounded, with 8px gaps and a 64×44px View target. Existing horizontal workspace navigation is preserved.

The report dialog already used a ghost close icon. Its apparent border was the initial keyboard focus ring. Initial focus now targets the dialog heading; the shared focus helper accepts visible in-dialog programmatic targets while excluding hidden, disabled, and outside targets. Keyboard focus indicators remain enabled.

Validation: typecheck; focus behavior tests including negative-tabindex heading and invalid preferred targets; local browser checks at 320, 390, 430 and 1440px verify manual date submission and no horizontal overflow. At 430×667, expanding Link an asset and filling the description leaves both footer actions visible, with the submit center unobstructed. No requests were submitted. Real device keyboards and native browser safe areas still require device testing.

Evidence is under ../audit-evidence/mobile-system (outside the worktree): date-view-results.json, 430-date-view.png, 430-report-expanded.png. All browser data is synthetic and local. Not deployed.
