import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/301_atomic_recipe_transitions.sql", "utf8");
const actions = readFileSync("src/server/actions/recipes.ts", "utf8");

test("recipe lifecycle is one tenant-scoped atomic transition", () => {
  assert.match(migration, /create or replace function public\.transition_recipe_atomic/);
  assert.match(migration, /security definer/);
  assert.match(migration, /company_id = actor\.company_id/);
  assert.match(migration, /for update/);
  assert.match(migration, /public\.has_permission\(required_permission\)/);
  assert.ok(
    migration.indexOf("public.has_permission(required_permission)") < migration.indexOf("select * into recipe_row"),
    "permission must be checked before the security-definer function reads a recipe",
  );
  assert.match(migration, /revision_no = revision_no \+ 1/);
  assert.match(migration, /insert into public\.document_revisions/);
  assert.match(migration, /insert into public\.activity_logs/);
  assert.match(migration, /revoke all on function public\.transition_recipe_atomic\(uuid, text, text\) from public, anon/);
  assert.match(migration, /grant execute on function public\.transition_recipe_atomic\(uuid, text, text\) to authenticated/);
});

test("activation archives the prior version under the same product lock", () => {
  assert.match(migration, /if p_action = 'activate' then[\s\S]*where company_id = actor\.company_id and product_id = recipe_row\.product_id[\s\S]*for update/);
  assert.match(migration, /set status = 'archived'[\s\S]*Superseded by active recipe/);
  assert.match(migration, /recipes_one_active_per_product_idx|partial unique index/);
});

test("recipe actions delegate lifecycle writes to the atomic RPC", () => {
  assert.match(actions, /rpc\("transition_recipe_atomic"/);
  assert.match(actions, /await transitionRecipe\(id, "submit"\)/);
  assert.match(actions, /await transitionRecipe\(id, "approve"\)/);
  assert.match(actions, /await transitionRecipe\(id, "activate"\)/);
  assert.match(actions, /await transitionRecipe\(id, "reject", remarks\)/);
  assert.match(actions, /await transitionRecipe\(id, "archive"\)/);
  assert.doesNotMatch(actions, /async function updateRecipeStatus/);
});
