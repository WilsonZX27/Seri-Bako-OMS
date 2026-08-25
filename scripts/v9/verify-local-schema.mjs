import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalContainer, localDatabaseContainer } from "./clone-utils.mjs";

const container = localDatabaseContainer();
assertLocalContainer(container);
const sql = readFileSync(resolve("supabase", "uat", "verify_v9_schema.sql"), "utf8");
const output = execFileSync("docker", ["exec", "-i", container, "psql", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
  cwd: process.cwd(),
  input: sql,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
});

if (!output.includes("V9_SCHEMA_OK")) throw new Error("Local v9 schema verification did not return its success marker.");
console.log(output.trim());
