// Isolated component fixture: no .env files, authentication, database, or production writes.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd();
const target = fs.mkdtempSync(path.join(os.tmpdir(), "oms-ux-fixture-"));
fs.symlinkSync(path.join(root, "node_modules"), path.join(target, "node_modules"), "dir");
fs.mkdirSync(path.join(target, "app", "[[...route]]"), { recursive: true });
fs.writeFileSync(path.join(target, "package.json"), JSON.stringify({ private: true, scripts: { dev: "next dev" } }));
fs.writeFileSync(path.join(target, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "esnext"], jsx: "preserve", module: "esnext", moduleResolution: "bundler", esModuleInterop: true, skipLibCheck: true, baseUrl: root, paths: { "@/*": ["./src/*"] } }, include: ["app/**/*.tsx", ".next/types/**/*.ts"] }));
fs.writeFileSync(path.join(target, "next.config.mjs"), `export default {devIndicators:false,distDir:'.next',experimental:{externalDir:true},outputFileTracingRoot:${JSON.stringify(root)}};`);
fs.writeFileSync(path.join(target, "postcss.config.mjs"), "export default {plugins:{tailwindcss:{},autoprefixer:{}}};");
const tailwind = fs.readFileSync(path.join(root, "tailwind.config.ts"), "utf8");
// Include every real source component, not only the fixture markup.
fs.writeFileSync(path.join(target, "tailwind.config.ts"), tailwind.replace(/"\.\/src\//g, `"${root}/src/`));
fs.writeFileSync(path.join(target, "app", "layout.tsx"), `import '@/app/globals.css';import '@/app/design-system-v2.css';export default function Layout({children}){return <html lang="en" data-design-layer="v2"><body>{children}</body></html>}`);
fs.copyFileSync(path.join(root, "tests/fixtures/ux-remediation-page.txt"), path.join(target, "app", "[[...route]]", "page.tsx"));
fs.writeFileSync(path.join(target, "middleware.ts"), `import {NextResponse} from 'next/server';export function middleware(request){return ['GET','HEAD'].includes(request.method)?NextResponse.next():new NextResponse('Fixture is read-only',{status:405});}`);
console.log(JSON.stringify({ target, port: 3110, scope: "real shared components with synthetic data; all HTTP writes blocked" }));
const child=spawn(process.execPath,[path.join(root,"node_modules/next/dist/bin/next"),"dev","--hostname","127.0.0.1","--port","3110"],{cwd:target,stdio:"inherit",env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:"development",NEXT_TELEMETRY_DISABLED:"1",SUPABASE_URL:"",SUPABASE_PUBLISHABLE_KEY:"",NEXT_PUBLIC_SUPABASE_URL:"",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:""}});
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
child.on("exit",code=>process.exit(code??0));
