from pathlib import Path
import os
repo=Path.cwd(); f=Path('/tmp/oms-asset-import-harness-20261102'); (f/'app').mkdir(parents=True,exist_ok=True)
(f/'node_modules').symlink_to((repo/'node_modules').resolve()) if not (f/'node_modules').exists() else None
(f/'package.json').write_text('{"private":true}')
(f/'tsconfig.json').write_text('{"compilerOptions":{"baseUrl":".","paths":{"@/*":["'+str(repo)+'/src/*"]},"jsx":"preserve","esModuleInterop":true,"moduleResolution":"bundler","module":"esnext","target":"ES2022","skipLibCheck":true}}')
(f/'next.config.js').write_text('module.exports={devIndicators:false,experimental:{externalDir:true},webpack(c){c.resolve.alias["@"]="'+str(repo)+'/src";c.resolve.alias["@/server/actions/asset-import"]="'+str(f)+'/mock-actions.ts";return c;}}')
(f/'postcss.config.mjs').write_text((repo/'postcss.config.mjs').read_text())
(f/'tailwind.config.ts').write_text((repo/'tailwind.config.ts').read_text().replace('"./src/', '"'+str(repo)+'/src/'))
(f/'app/layout.tsx').write_text('import "'+str(repo)+'/src/app/globals.css";import "'+str(repo)+'/src/app/design-system-v2.css";export default function Layout({children}){return <html lang="en" data-design-layer="v2"><body>{children}</body></html>}')
(f/'app/page.tsx').write_text('import {AssetImportWorkflow} from "./workflow";import {RightConsoleProvider} from "@/components/layout/right-console";export default function Page(){return <div className="flex min-h-screen"><RightConsoleProvider><main style={{padding:24,flex:1,minWidth:0}}><h1>Import assets</h1><AssetImportWorkflow draftScope="synthetic-only" locations={[{id:"00000000-0000-4000-8000-000000000010",source_name:"QA Kitchen"}]} automaticId={false}/></main></RightConsoleProvider></div>}')
(f/'mock-actions.ts').write_text('"use server";import {validateAssetImport} from "@/lib/imports/assets";export async function previewAssetImport(rows){const issues=validateAssetImport(rows,["00000000-0000-4000-8000-000000000010"],false);rows.forEach((r,i)=>{if(r.values["Asset ID"]==="EXISTING")issues[i].errors.push("Asset ID already exists. Existing assets will not be overwritten.")});return issues;}export async function confirmAssetImport(){throw Error("Synthetic harness forbids registration")};')
print(f)

(f/'app/workflow.tsx').write_text((repo/'src/components/asset-import-workflow.tsx').read_text().replace("from '@/server/actions/asset-import'", "from '../mock-actions'"))
api=f/'app/api/asset-management/import-template'; api.mkdir(parents=True,exist_ok=True)
(api/'route.ts').write_text("import {buildAssetImportWorkbook} from '@/lib/imports/asset-workbook'; export async function GET(){return new Response(new Uint8Array(buildAssetImportWorkbook({automaticId:false,locations:[{id:'00000000-0000-4000-8000-000000000010',source_name:'QA Kitchen'}]})),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename=\"asset-import.xlsx\"'}})}")
