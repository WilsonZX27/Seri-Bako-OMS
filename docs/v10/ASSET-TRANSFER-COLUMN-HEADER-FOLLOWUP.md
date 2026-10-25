# Asset transfer title-row follow-up — local, not deployed

Source: user Sentinel_352812b4e95c819190cf13c7332ad94c (2026-10-25 07:51 UTC). Quantity must be a shared column title, not a repeated visible row label; every selected asset still needs its own quantity input.

RequestLineHeader is shared with the actual PR header and uses the same grid tracks as RequestLineRow. Asset, Available, Quantity and Remove appear once in the title row at all three widths. Values and editable quantity fields remain per asset. Duplicate row labels are screen-reader-only; unique per-asset accessible names, native required/min/max validation and removal focus are retained. Available and Remove tracks were measured against actual intrinsic text width, rather than accepting only a root-overflow check.

1954 tests, lint, types and local production build pass. Actual component browser390/820/1440 verifies header/input alignment, every header text inside its own column, preserved quantities/selection/recovery and no root overflow. Actual PR form's add-line and single-select behavior also passes three-width synthetic regression. No real transfer or SQL was used. Asset batch creation stays in the already approved151 state; automatic numbering remains OFF. This patch changes neither backend nor feature flags and has not been published.

Independent live151 evidence now confirms the permitted test-draft interactions across three widths: selecting a second asset, search retention of both quantities/reason, removal retention/focus and no navigation. The draft was restored through existing UI; no Request/Submit was clicked. Live151 still has repeated Quantity labels; these screenshots do not prove this local header patch deployed.

The existing notification sample is5pending+5notifications. Tail reachability/focus/Escape passed at390/820/1440 without mark-read or link activation; it is not ten-notification or arbitrary long-list pressure proof. Full real business submission, failure recovery and remaining annotation criteria remain distinct and unverified.
