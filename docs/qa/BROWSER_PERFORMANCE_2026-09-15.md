# Production browser verification — 15 September 2026

Tested the signed-in WILSON account at https://system.seribako.com.my using actual browser interactions. No business records were submitted or changed.

## Current browser measurements

Measured wall time around browser reload/action and waiting for the named content to become visible. Includes browser automation overhead; these are not Navigation Timing, full-paint, server-duration, or percentile measurements. Three consecutive reloads use normal browser caching; cold/warm cache was not controlled.

| Scenario | Samples (ms) | Median (ms) | Visible completion condition |
| --- | --- | --- | --- |
| Dashboard reload | 4749, 3463, 3367 | 3463 | Payables and cash obligations heading |
| Purchase Requests reload | 2363, 1423, 2385 | 2363 | Open PR/SEP26/015 list item |
| Outlet Daily reload | 4771, 3287, 2798 | 3287 | Gurney Plaza 14/09/2026 Posted calendar button |
| PR next page | 1632 | Single sample | Page 2 of 3 — 30 rows |
| PR search | 2344 | Single sample | PR/SEP26/014 result visible |

## Functional observations

- Dashboard displayed actionable content after reload.
- PR pagination returned the second page; exact-number search returned one record.
- PR/SEP26/014 detail showed three items, RM 438.60 and linked PO-000240.
- Files & activity opened its dialog with file/activity/revision content and closed successfully.
- Outlet Daily displayed 342 records and the seven-day matrix.
- Opened Gurney Plaza 14/09/2026 daily record through its list item. Received 187 and wastage 110 matched the list. Posted/locked status and disabled edit fields were present.
- Calendar preview was clicked, but a distinct resulting preview was not conclusively captured; no pass claim for that interaction.

## What improvement can be claimed

Earlier recorded SQL comparisons in SYSTEM_QUALITY_2026-09-15.md show Dashboard core snapshot 1582.263 → 726.065 ms (54.1% less execution time), and seven-day daily lines 1501.167 → 468.424 ms (68.8% less). Those samples included result-equivalence checks. They are historical SQL measurements, not new browser measurements or whole-system speedups.

The older Dashboard observation of 6.9 seconds in PERFORMANCE_READ_PATHS_2026-09-14.md is one server response-completion sample. Its method differs from this browser-visible-content timing; calculating a percentage between them would be misleading.

Migration 291 index existence is verified separately, but its incremental speedup remains unmeasured. There is no matched before/after browser baseline, no demonstrated reduction in the historical database error rate, and no whole-system performance percentage. These current samples establish a baseline for a future comparison under the same method, account, dataset and viewport. This pass does not certify all workflows or responsive breakpoints.
