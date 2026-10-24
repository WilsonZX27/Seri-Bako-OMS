# Asset synthetic interaction batch — local only

Trusted user authorisation forwarded from main conversation:question “你允许我先在隔离测试页面里输入、勾选、改数量和移除测试项吗？不碰真实数据、不部署。”; answer “ok”. This covers synthetic value changes, not real business submissions, remote SQL, permissions, numbering access or deployment. The reviewer did not click submit, including dedicated failure pages; do not infer that approval from the answer.

## Preservation/isolation
Frozen v3 base9.2.139 dc3b822245d3cb1c4e9f599690c4b91250853638; all74manifest file hashes matched before work. v3patch cea2f7e566181c1ba94fddc353255195c32e5ba2b6ebec9bf5154adb55170729 and old v2 remain immutable. Existing3210fixture was stopped, port verified free then restored loopback with env-i/no.envfiles. Actual component copies verified byte-equivalent except server-action import replaced with browser-local inert error. No AssetDraftScope, no draft persistence; no business API routes, real credentials, ID allocation or remote writes. Fixture side routes and boundary manifest are outside the application source. AutomaticId=true is a forced display sample only; actual capability helper still disables automatic numbering pending approval.

## Executed browser evidence
Reviewer report:/private/tmp/oms-asset-local-acceptance-20261024/interaction-v3/REPORT.md.
- Select synthetic1+2, filter to12, both selected payloads/quantities retained; clear filter preserves2/3; remove1 leaves2quantity3.
- Actual components at390/820/1180/1440:no document overflow, long identities wrap and quantity can receive focus.
- Native number validity:0underflow,3overflow against holding2,1.5stepMismatch; legal2retained. Request button remains enabled but HTML validity is false. No submit, so no browser/server validation claim. Existing parser/action tests remain distinct.
- Manual fallback390:empty ID required/invalid, manual ID value retained/read-write/valid; no submit. Automatic ID readonly placeholder is display evidence only, not feature enablement or issuance.

## Demonstrated defect and bounded fix
Clicking Remove originally moved activeElement to BODY. Only the transfer component and focused regression tests changed:after state commit, requestAnimationFrame focuses next selected quantity, previous selected quantity when deleting the tail, removed choice checkbox when selection empties, or search if checkbox is filtered out. No quantity/selection payload, business validation, permissions or transaction changes.
- Four widths x next/last-visible/search-fallback =12 DOM samples passed; target visible, no BODY focus. Pointer-click path does not establish focus-visible rings.
- Keyboard-only tail removal390/1440:Tab from second quantity to its Remove; button:typebutton + focus-visible verified before nativeEnter. First quantity2/one remaining item retained; focus returns to first quantity and focus-visible=true. No submission.
- Proof/screens:remove-focus-after.json,remove-focus-{next,last,search}-{390,820,1180,1440}.jpg,remove-keyboard-previous.json,remove-keyboard-previous-{390,1440}.jpg in reviewer directory above.

## Test provenance and limits
Final full run1827/1827 passed after product focus fix; subsequently added previous-row preservation assertion and focused batch-form4/4 passed. Do not relabel as full1828run. Typecheck passed. Changed focus source production-mode build exit0 with synthetic configuration, including lint/types/routes. Known warnings retained. Log:/tmp/oms38-interaction-final-build/build.log; generated Next configuration changes verified/restored. Prior v3build/full1825 evidence retained without claiming it is this new exacttree.

O5/N10 remain local integration candidates pending actual authenticated backend/schema acceptance; O16/N11 remain disabled pending allocator permission decision. This does not close online139 or all38annotations. N9reference, missingextra12/13+source, target-specific SQL/permission approval and real shell/role/query acceptance remain separate. Browser failure-submit remains untested under current explicit scope. No deployment, version bump, remote migration or business save.
