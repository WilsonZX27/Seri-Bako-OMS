# Alma stock investigation and responsive fixes

## Production evidence (read-only)

Alma branch: `99e47a02-4862-4207-aa5f-cd2bc07a0014`.

- `ONICOLD00006`, PXX SUGAR / GULA PRAI FINE SUGAR PXX 50KG: retired in Alma by WILSON on 1 September 2026 at 17:36 MYT. Reason `used_up`, note `no longer required`, final quantity 0 KG. No restoration timestamp. Historical counts include 51.49 KG on 23 August and 0 KG on 30 August; no 13 September count was returned for this code.
- `CHYINING00067`, PXX GULA PASIR MSM 50KG: active in Alma, created by JACK on 14 September 2026 at 14:52 MYT. No retired/restored timestamps and no stock-count lines returned. The current new-count UI includes it at Code-sorted position 61, UOM KG, no prior balance. These are distinct catalog records; their physical identity cannot be established from similar names alone.
- User-provided 13 September quantity of 32.9 KG has not been written to either code. No quantity, retirement, or branch mapping was changed.
- Current Code-sorted positions 143–155 are TANGHK00003/4/5, TEOWJOO00005/7/8/16/18/22/27/28/29, and YINONNBM00001. Queried scope rows are Alma-active and have historical Alma associations. Captured mapping rows for TANGHK and TEOWJOO include active Alma mappings created 20 August UTC; historical count dates go back to 30 July (including cancelled counts). This does not prove the original catalog assignment was correct. User subsequently instructed that these items remain untouched pending identification.

## Local implementation

- Outlet Daily list stretches to its parent width instead of shrink-wrapping through `align-self: start`.
- PO and GRN mobile document numbers use the same 14px size as PR.
- PO delivery date renders only when present; removed the absent-date placeholder.
- Stock Count: two-column cards from 400px through tablet widths below 1024px; one column below 400px. Identity and variance no longer compete in a narrow title row. Quantity controls span the card, with UOM beneath on touch layouts. Desktop keeps its existing row structure.
- Retired items now have visible indices. Daily variance sidebar dates and quantities occupy separate lines.
- Purchasing preparation UI and migration 292 are prepared. The migration changes only the existing three preparation guards, retaining function bodies, validation, revision history and idempotency. It does not grant Manager approval or change approval transition functions. Production guard strings were verified with read-only catalog queries. **Migration application and role mutation UAT are pending explicit approval; not deployed or verified as live.**

## Verification

- Actual local browser test of the StockCountForm using isolated fixtures, not production records: 430px mobile, 834px tablet with 560px content allowance, 1440px desktop, and 390px narrow-phone fallback.
- DOM scroll width equaled viewport width in all four samples. Quantity field widths: 82px / 147px / 142px / 240px respectively. Phone and tablet screenshots inspected. After hydration, plus changed 26.82 to 26.83 and minus restored 26.82, preserving the existing 0.01 KG step.
- This fixture validates the edited form component, not every full-page shell or role workflow. Removed fixture route and generated fixture types after testing.
- Focused existing contracts: 62/62 passed. Full existing suite: 1264/1265 passed in sandbox; the local-server lifecycle test was denied a listening port and its file passed 3/3 when rerun with that restriction lifted.
- Removed one literal layout-string test in favor of actual browser geometry; updated two stale expectations to the requested tablet and delivery behavior. No business assertions were removed.
- No production deployment in this pass. Full live page verification and purchasing role UAT remain release gates.
