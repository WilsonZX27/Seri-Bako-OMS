import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalContainer, CLONE_MARKER, localDatabaseContainer } from "./clone-utils.mjs";

if (!existsSync(CLONE_MARKER)) throw new Error("No production-like clone marker exists. Prepare the clone before UAT.");
const marker = JSON.parse(readFileSync(CLONE_MARKER, "utf8"));
if (Date.parse(marker.expires_at) <= Date.now()) throw new Error("The production-like clone expired. Destroy it before preparing a fresh clone.");

const container = localDatabaseContainer();
assertLocalContainer(container);
const sql = `set seri_bako.production_like_clone = 'confirmed';\n${readFileSync(resolve("supabase", "uat", "verify_production_like_clone.sql"), "utf8")}`;
const output = execFileSync("docker", ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
});
console.log(output.trim());
