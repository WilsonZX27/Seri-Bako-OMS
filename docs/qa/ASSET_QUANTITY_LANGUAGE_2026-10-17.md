# Asset quantity language — 17 October 2026

Register, location details, asset details and checklist now share formatRegisteredAssetQuantity: null means Not recorded; zero remains a real zero. Register labels identify Registered qty. Checklist optional input is explicitly This inspection’s physical count, with guidance that it does not change registered quantities. The existing confirmation workflow asks for physical verification before recording a missing registered quantity. Creation placeholder uses Not recorded.

No query, permission, database, submission or historical data semantics changed. No historical count is silently substituted. Private production diagnosis stays outside this repository and is not used as test data.

Validation: TypeScript passed. Asset tests 44/44 passed. ESLint zero errors, one pre-existing navigation aria-description warning in sortable-table.tsx. Authenticated synthetic local UI at 430 × 932 displayed Registered qty: 12; screenshot captured and visually inspected without submitting. No production deployment.
