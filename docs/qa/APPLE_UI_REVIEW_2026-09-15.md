# Apple UI review — 2026-09-15

This pass applies Apple design principles and the project’s Impeccable product register without changing OMS business rules, permissions, routes, data mutations or established navigation.

## System-level findings

- The shared design system already uses a restrained operational palette, one UI type family, fixed product typography, 44px touch controls, semantic focus rings, bounded media, a documented z-index scale and an operating-system reduced-motion fallback.
- The Impeccable detector found no prohibited visual-pattern matches across `src/app` and `src/components`.
- Shared Button and Select controls now provide immediate, subtle press feedback with touch manipulation enabled. Existing keyboard focus and disabled states remain intact; the global reduced-motion rule suppresses the transform for users who request it.
- No new decorative motion, glass layers, navigation patterns or page-specific visual vocabulary were introduced. This keeps the tool familiar and preserves density for operational work.

## Attendance review corrections

- A successful raw-punch import disables its original action and labels it `Completed`; choosing another file resets the state and begins a new import.
- Actual post-shift time uses the existing exact `post_shift_seconds` evidence and is displayed as `HH:MM`. The separate OT claim candidate and its 30-minute submission rule are unchanged.
- RO and OT share one two-line table heading. RO use is shown as a count of 30-minute units; actual OT appears beneath it.
- Repeated missing-punch text wraps inside its column instead of overlapping Clock In.
- Desktop Reports & time-off balance moved to the existing right rail below Actions. The original in-flow section remains on smaller layouts where the desktop rail is hidden.
- Searchable Staff day, Employee and Outlet menus now portal into their owning native dialog, preventing the browser top layer from covering them.
- `wrong_branch_device` is presented as `Punch location differs from schedule`, with a direct explanation that system access does not change fingerprint-device location. The underlying validation remains active.

## Verification boundary

Source and contract checks cover the state, layout, portal and wording changes. Authenticated Preview verification must be completed after the branch deployment contains this commit. Full multi-role mutation UAT and Production promotion remain separate release gates.
