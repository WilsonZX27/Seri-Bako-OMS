# Seri Bako OMS — Security & QA Baseline

## Release gate

Every release candidate must pass all of the following before deployment:

```powershell
npm test
npm run typecheck
npm run build
$env:RUN_TENANT_BOUNDARY_E2E='1'; npm run test:e2e -- tests/e2e/security-responsive-core.spec.js --reporter=line
```

The browser command is intentionally local-only. It creates disposable role fixtures in the local Supabase stack and is blocked from silently using a remote target.

## Security boundaries

- Authentication inputs are normalized and validated server-side in `src/server/auth/auth-input.ts`.
- Every privileged server action derives the active tenant actor and checks a permission; database RLS and locked RPCs remain the authoritative enforcement layer.
- Object writes verify the target record belongs to the actor company before a storage write or mutation occurs.
- JSON mutation routes reject explicit cross-site requests before reading a write payload.
- Search is capability-gated before querying a module. It never acts as a discovery side channel for inaccessible data.
- Uploads accept only verified supported binary signatures. Active SVG content is not accepted for company or master-data images.
- Server failures use the shared redacting logger. Do not add raw `console.*` calls in `src`.

## Responsive and interaction rules

- Phone controls have a minimum 48 px hit target; do not reduce this inside the 640–767 px compact range.
- A page must keep its own content clear of sticky mobile navigation and action surfaces.
- Critical actions must be reachable by click/tap. Hover can enhance but cannot be required.
- Use the shared responsive workspace shell, contained tables, workflow status component, and contextual action rail instead of page-private variants.
- Test the authenticated shell at 320, 390, 768, 1180, 1440, and 2560 px before release.

## Test fixture discipline

- `RUN_TENANT_BOUNDARY_E2E=1` is the single opt-in for local role setup.
- `tests/e2e/local-role-fixture-global-setup.cjs` refreshes six disposable accounts before browser tests.
- Do not embed production credentials in test files, screenshots, logs, or browser artifacts.
- Remote Playwright targets are fail-closed unless separately and explicitly approved.

## Evidence covered by the baseline

- Role routing: Super Admin, Finance, Manager, Purchasing, Kitchen, Outlet Staff.
- Authentication shell: no horizontal overflow at the six supported viewport bands.
- Mobile authentication targets: at least 48 px high.
- Kitchen Stock Count: contained, permission-safe creation entry at phone, tablet, and desktop widths; phone operational controls are at least 48 px high and tablet exposes one primary action.
- Stock Count creation: one idempotent database aggregate is required for header, document, revision, and lines; theoretical quantities and UOM are database-derived, not client-trusted.
- Browser console: no page console errors during the covered journeys.
- Cross-site mutation: a forged request is redirected to sign-in or rejected with `403` before a write handler.

This baseline is an executable minimum, not a substitute for a focused manual acceptance review of new operational workflows.
