# v9.2.165 (local candidate) — Chef assigned-location schedule access

Chef gets a Schedule navigation entry and the schedule route checks schedule.read rather than attendance access. Its workspace shows Schedule only; existing assigned-location scope, draft/submit rights and Manager approval remain unchanged. No database grants, payroll access, transfer display, basket or deferred login changes.

Release authorization: user confirmed the isolated Chef patch on 2026-10-31. Baseline production 9.2.164 efc28d530e7aef873178ef822e67734b630da016.

Verification: source/component regression and local anonymous schedule lifecycle; production Chef-account login remains a separate read-only acceptance step. No production schedule submissions performed.
