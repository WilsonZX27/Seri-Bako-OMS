# OMS rules index

Updated 2026-11-02. Scope: all OMS changes. This index routes to existing sources; it does not grant access or certify implementation. Latest explicit user decisions for the same scope supersede older conflicting requirements. Security/tenant boundaries and higher-priority repository instructions still apply. Record uncertain conflicts instead of guessing. Historical release and audit documents describe their own date and environment, not current acceptance.

| Change | Read before design or coding |
| --- | --- |
| Any change | This index, [working contracts](contracts.md), applicable existing module documents and current code |
| Roles and workflows | [Role matrix](../ROLE_PERMISSION_MATRIX.md), [contracts](contracts.md), `src/lib/roles.ts`, relevant actions, queries and RLS |
| Product availability, Daily, Planning | [Contracts](contracts.md), relevant product/Daily/Planning code and current handoff evidence |
| Interface | [PRODUCT](../../PRODUCT.md), [DESIGN](../../DESIGN.md), [v10 design contract](../v10/DESIGN-CONTRACT.md), [annotation UI rules](../ANNOTATION-DERIVED-UI-RULES.md), and [contracts](contracts.md) |
| Verification and release | [Acceptance](acceptance.md), relevant module QA records, [testing checklist](../../TESTING_CHECKLIST.md), and release procedures |

Before changing behavior, identify the relevant requirement, actual implementation, scope, roles, and evidence. After a change, update the owning rule or link its decision, affected code and verification; mark older contradictory passages as superseded with a link, without erasing historical source. Update unresolved questions and the evidence state in the same change. Do not duplicate complete module specifications here. If a requirement is unclear, record it as pending; implementation is not proof of intended behavior.

Evidence states are separate: **code changed**, **local tests**, **authenticated Preview**, **Production**, and **actual user acceptance**. Record exact revision, environment, roles, scopes, data/state, date and outcome for each; one state does not imply another. Preview 738b8e5a is a historical reference, not a claim of full acceptance.

See the [baseline inventory and conflict review](inventory.md) for historical document boundaries.
