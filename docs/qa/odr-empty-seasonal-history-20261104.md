# Empty unavailable Daily history presentation

Confirmed source discrepancy: omission previously depended on draft status and unlocked state; a save advancing status could reveal the same empty unavailable historical row. Presentation now depends only on availability and row evidence, consistently across record states. Existing form lock and permissions remain unchanged. Actual quantities, explicit zero confirmations, DO provenance, stockout flags and notes remain visible. The existing at-least-one-row fallback remains unchanged.

No database deletion, pending/completeness change, unlock or posted-record write. This is not a fix claim for the reported pending count: outlet/date and the actual record are still needed to establish that cause. No deployment or hosted save/post verification.

Validation: helper and caller contract checks cover unavailable/available rows, recorded zeros, provenance, notes, carryover and unchanged lock wiring. TypeScript and production-file ESLint pass. Local regression result recorded in integration handoff.
