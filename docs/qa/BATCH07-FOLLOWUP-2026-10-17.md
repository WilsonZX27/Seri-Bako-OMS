# Batch 07 follow-up

Stock Balance now distinguishes active-filter empty results and offers Reset filters on both surfaces. Add-to-basket icons include a plus, while the floating button remains the basket view action. Balance and Low Stock reserve 96px below their mobile content for floating actions.

Low Stock mobile uses the same decision Badge variants as desktop. Current and Suggested quantities are labelled in the detail area, with status badges stacked to avoid squeezing the item name.

Stock Card investigation: the displayed value sums in minus out over filtered rows, not a current stock snapshot. Renamed it Filtered net movement without altering inventory data or backend balance semantics. Empty-period zero is a net movement, not evidence of lost stock.

Validation: typecheck and 1638 tests passed. Local synthetic screenshots captured desktop/mobile populated and empty-query states; Low Stock was recaptured after stacked layout refinement. No document mutations or deployment. Long-list FAB hit testing, real device browser chrome and stock balance accounting remain separate checks; padding alone does not certify all devices.
