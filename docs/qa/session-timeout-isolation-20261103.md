# Idle-session isolation fix — 2026-11-03

Base5fc88063c2d81f0b0ad68d560b69002f49789422. Request: prevent one idle login from invalidating another active login without changing real accounts or permissions.

Evidence: SessionTimeoutProvider called auth.signOut() withoutscope. Installed Supabase GoTrueClient defaults scopeglobal and documents local for current session. Actual provider callback exercised with fakeReact hooks/clock/storage and SDK-contract mock: beforefix isolation test failed, shared-activity testpassed. Afterfix scope local: both pass; combined existing coordination/governance10/10pass, changedcomponentESLint/diffcheckpass.

One runtime change: idle provider signOut({scope:local}).25minwarning/30minexpiry, same-origin activitycoordination and redirect retained. Sign out now inside this idlewarning also useslocal. Explicit accountmenu logout and disabled-account paths are outside this change.

Boundary: independent login sessions for sameuser remain valid in SDK-contract mock. Same-session tabs still share authentication and may correctly sign out together. No real auth service or browser pair was used; not proof of the original incident's complete causality. No tokens/accounts/data changed. No deployment.
