# Sprint 6.12.1 PR Approval Test Matrix

Use this matrix after deployment to verify PR workflow security and visibility.

## Kitchen Staff

- Can create a Purchase Request.
- Can submit own draft PR to Admin Review.
- Cannot see or perform Admin Review approval.
- Cannot see or perform Purchasing Review approval.
- Cannot see or perform Manager Approval.
- Cannot convert an approved PR to PO.

## Operations Admin / Admin

- Can complete Admin Review when PR status is Admin Review.
- Can reject during Admin Review.
- Cannot complete Purchasing Review unless explicitly granted `pr.purchasing_review`.
- Cannot complete Manager Approval unless explicitly granted `pr.manager_approve`.

## Purchasing

- Can complete Purchasing Review when PR status is Purchasing Review.
- Can reject during Purchasing Review.
- Cannot complete Manager Approval unless explicitly granted `pr.manager_approve`.
- Can convert approved PR to PO only when granted `pr.convert_to_po`.

## Manager

- Can approve Manager Approval when PR status is Manager Approval.
- Can reject during Manager Approval.
- Cannot complete Purchasing Review unless explicitly granted `pr.purchasing_review`.

## Super Admin

- Can perform every valid PR workflow step.
- Still only sees actions valid for the current PR status.

## Idempotency Checks

- Double-click Submit/Approve/Reject/Convert and confirm only one status transition happens.
- Refresh the PR after action and confirm the completed action button disappears.
- Re-run the same server action from the previous step and confirm it returns a friendly workflow-step message.
