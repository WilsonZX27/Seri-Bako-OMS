# Batch 06 follow-up

Transfers and wastage creation now pass a shared action explanation to desktop and mobile. Explanations reflect missing branch access or stock, rather than only suggesting quantities. Transfer branch prerequisites use an amber icon notice.

DocumentWorkspace exposes mobileActionHint. Its shared mobile footer now reserves measured height plus 24px using ResizeObserver, including wrapped guidance and safe-area padding; the former fixed pb-20 reserve is removed. This spacing change applies to all DocumentWorkspace mobile actions. Other document routes have not yet been migrated to the optional guidance prop.

Typecheck passed. Local synthetic browser capture at 390×844 confirmed both explanations above disabled actions (112px footer height), no horizontal overflow, and unobscured final stock warning. Screenshots are in ../audit-evidence/batch-06-fixed outside the worktree. No business records submitted and no deployment. Real-device keyboard/browser chrome and populated/detail/filter states remain pending.
