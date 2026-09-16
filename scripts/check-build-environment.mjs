import { existsSync } from "node:fs";
import process, { loadEnvFile } from "node:process";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
// Next.js loads `.env.local` during `next build`, but this prebuild guard runs
// first. Mirror that local behavior so the guard validates the same inputs that
// the build will use. Hosted builds continue to use their injected environment.
if (required.some((key) => !process.env[key]?.trim()) && existsSync(".env.local")) {
  loadEnvFile(".env.local");
}
const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  throw new Error(`Build environment is incomplete. Set ${missing.join(" and ")} before running next build.`);
}

let url;
try {
  url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch {
  throw new Error("Build environment is invalid. NEXT_PUBLIC_SUPABASE_URL must be an absolute http(s) URL.");
}
if (!/^https?:$/.test(url.protocol)) {
  throw new Error("Build environment is invalid. NEXT_PUBLIC_SUPABASE_URL must use http or https.");
}

console.log(`Build environment ready (${url.protocol}//${url.host}); public Supabase key present.`);
