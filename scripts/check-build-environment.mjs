import process from "node:process";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
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
