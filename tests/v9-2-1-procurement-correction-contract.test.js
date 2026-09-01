const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("Kitchen correction remains an audited withdraw-to-Draft workflow", () => {
  const migration = read("supabase/migrations/230_procurement_actor_withdraw_and_receiving_authority.sql");
  assert.match(migration, /withdraw_purchase_request_for_correction/);
  assert.match(migration, /status::text <> 'manager_review'/);
  assert.match(migration, /set status = 'draft'/);
  assert.match(migration, /withdrawn_for_correction/);
  assert.match(migration, /role_code = 'kitchen'/);
  assert.match(migration, /goods_receiving\.post/);
});

test("record attribution uses the bounded actor display authority", () => {
  const procurement = read("src/server/queries/procurement.ts");
  const outletDaily = read("src/server/queries/outlet-daily-records.ts");
  assert.match(procurement, /resolveActorDisplayMap\(data\.map\(\(row\) => row\.requested_by\)\)/);
  assert.match(procurement, /actorDisplayName\(actorDisplayMap, row\.requested_by\)/);
  assert.match(outletDaily, /actorDisplayName\(actorDisplayMap, record\.updated_by/);
});

test("document actions stay available at tablet and phone breakpoints", () => {
  const prDetail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  const workspace = read("src/components/documents/document-workspace.tsx");
  assert.match(prDetail, /tabletRailMode="split"/);
  assert.match(prDetail, /Revoke submission/);
  assert.match(workspace, /mobileActivity \? <div className="min-w-0"><MobileActivityAndFiles>/);
});

test("purchase request actions separate reviewer decisions from requester and Owner recovery controls", () => {
  const prDetail = read("src/app/(app)/purchase-requests/[id]/page.tsx");
  assert.match(prDetail, /canRequesterWithdraw[\s\S]*profile\?\.id === request\.requested_by/);
  assert.match(prDetail, /canOwnerRecoverWithdraw[\s\S]*profile\?\.id !== request\.requested_by/);
  assert.match(prDetail, /label="Return for correction"/);
  assert.match(prDetail, /DocumentActionSection moreOptions=\{administrativeControls\}/);
  assert.match(prDetail, /showOwnerRecoveryWithdraw = canOwnerRecoverWithdraw && !canManagerReview/);
  assert.match(prDetail, /DocumentSideSection title="Request controls"/);
  assert.doesNotMatch(prDetail, /canRequesterWithdraw[\s\S]{0,200}\|\| isOwner/);
});

test("requester revoke is atomic, requester-owned and revision audited", () => {
  const migration = read("supabase/migrations/231_requester_revoke_before_manager_decision.sql");
  assert.match(migration, /status::text <> 'manager_review'/);
  assert.match(migration, /requested_by <> actor\.id and not actor_is_owner/);
  assert.match(migration, /Only the original requester can revoke/);
  assert.match(migration, /for update/);
  assert.match(migration, /revision_no = document_row\.revision_no \+ 1/);
  assert.match(migration, /insert into public\.document_revisions/);
  assert.match(migration, /submission_revoked/);
});

test("Goods Receiving posting returns actionable record feedback", () => {
  const action = read("src/server/actions/goods-receivings.ts");
  const page = read("src/app/(app)/goods-receivings/[id]/page.tsx");
  assert.match(action, /safeRedirectWithMessage\(`\/goods-receivings\/\$\{id\}`, "error"/);
  assert.match(page, /ActionErrorNotice/);
});
