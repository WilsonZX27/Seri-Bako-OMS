import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalContainer, localDatabaseContainer } from "./clone-utils.mjs";

const container = localDatabaseContainer();
assertLocalContainer(container);
const migrationCeiling = Math.max(...readdirSync(resolve("supabase", "migrations")).map((name) => Number(name.match(/^(\d+)_/)?.[1] ?? 0)));
const sql = readFileSync(resolve("supabase", "uat", "verify_v9_schema.sql"), "utf8").replaceAll("__EXPECTED_MIGRATION__", String(migrationCeiling));
const output = execFileSync("docker", ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  cwd: process.cwd(),
  input: sql,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});

if (!output.includes("V9_SCHEMA_OK")) throw new Error("Local v9 schema verification did not return its success marker.");
console.log(output.trim());
