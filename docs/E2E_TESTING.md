# E2E Testing

## Dynamic Scheduling and Attendance

Use disposable local data and the eight-role matrix. Verify roster submission/publication, return/reject comments, own-schedule visibility, pure swap versus material escalation, immutable history, both NGTeco samples, preview-before-mutation, duplicate import, exception review, adjustment revision, period lock and Owner reasoned unlock. Responsive targets are 320, 390×844, 768, 820×1180, 1180×820 and 1440×900.

Seri Bako OMS Playwright tests read `.env.test.local` automatically through `playwright.config.js`.

## Required variables

For local UAT, keep these variables in the ignored `.env.test.local` fixture. Never point that file at a remote target.

For authenticated Preview UAT, use a separate secret env file or process environment containing only disposable Preview identities and the exact isolated Preview project. The guard below must pass before any mutation-capable browser run:

Use the tracked [`.env.preview.test.example`](../.env.preview.test.example) as the
secret-free starting template, copy it to the ignored `.env.preview.test.local`,
and replace every placeholder only with the isolated Preview values.

```powershell
node scripts/check-uat-environment.mjs --target preview --env .env.preview.test.local
```

Once the isolated Preview app, Supabase project, and disposable role identities
are provisioned, run the complete guarded route matrix with:

```powershell
npm run uat:v9:preview
```

The runner validates the Preview target first, never starts the local server or
Production-like clone, and then executes the same role/viewport/route shards as
the local full-system audit. It stops before any browser shard when the env file
is missing, points at Production, or names a different Supabase project.

The Preview env must include `RUN_PREVIEW_UAT=confirmed`, `EXPECTED_PREVIEW_APP_HOST`, and `EXPECTED_PREVIEW_SUPABASE_PROJECT_REF`; the expected app host must be the exact Vercel Preview deployment URL and the project ref must not be Production. Do not reuse local or Production credentials.

Set the role variables for each identity you want to test:

```env
TEST_BASE_URL=https://<exact-preview-deployment>.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://<preview-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
RUN_PREVIEW_UAT=confirmed
EXPECTED_PREVIEW_APP_HOST=<exact-preview-deployment>.vercel.app
EXPECTED_PREVIEW_SUPABASE_PROJECT_REF=<preview-project-ref>

TEST_SUPER_ADMIN_EMAIL=
TEST_SUPER_ADMIN_PASSWORD=
TEST_PEOPLE_OPERATIONS_EMAIL=
TEST_PEOPLE_OPERATIONS_PASSWORD=
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
TEST_MANAGER_EMAIL=
TEST_MANAGER_PASSWORD=
TEST_PURCHASING_EMAIL=
TEST_PURCHASING_PASSWORD=
TEST_KITCHEN_EMAIL=
TEST_KITCHEN_PASSWORD=
TEST_FINANCE_EMAIL=
TEST_FINANCE_PASSWORD=
TEST_OUTLET_SUPERVISOR_EMAIL=
TEST_OUTLET_SUPERVISOR_PASSWORD=
TEST_OUTLET_EMAIL=
TEST_OUTLET_PASSWORD=

```

Local role-specific tests may skip only the role whose credentials are missing. Preview UAT is stricter: the guard requires all eight role identities before any browser shard starts, so a green Preview run cannot silently omit a role. If credentials are present but login fails, the test fails with the role and email address only. Passwords are never printed.

## Run

```powershell
npm.cmd run test:e2e
```

For local production smoke testing, build first, start the app, and set:

```env
TEST_BASE_URL=http://127.0.0.1:3000
```
### Build environment preflight

`npm run build` runs `scripts/check-build-environment.mjs` first. It requires only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, validates that the URL is absolute HTTP(S), and never prints key material. A missing or malformed value fails before Next.js compilation/prerendering with an actionable message. Use the target environment's injected variables; do not commit credentials or reuse local test keys for Preview/Production.
