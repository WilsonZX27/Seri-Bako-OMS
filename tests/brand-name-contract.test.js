const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const migration = read("supabase/migrations/176_structured_item_brand.sql");
const parser = read("src/lib/imports/autocount.ts");
const itemForm = read("src/components/item-form.tsx");
const itemPicker = read("src/components/item-combobox.tsx");

if (!migration.includes("add column if not exists brand_name text")) throw new Error("brand migration must add the nullable field");
if (!migration.includes("create_operational_item") || !migration.includes("apply_autocount_import_job") || !migration.includes("get_items_workspace")) throw new Error("brand migration must preserve all write/read paths");
if (!migration.includes("p_item->>''brand_name''") || !migration.includes("row_record.normalized->>''brand_name''")) throw new Error("brand migration must source the explicit JSON field in both write paths");
if (!migration.includes("regexp_replace") || !migration.includes("i[.]item_name") || !migration.includes("[[:space:]]+")) throw new Error("workspace patch must tolerate the function definition newline format");
for (const header of ["Brand", "Brand Name", "品牌"]) {
  if (!parser.includes(`get(row, \"${header}\")`)) throw new Error(`parser must accept explicit ${header} source header`);
}
if (!parser.includes("brand_name: brandName || null")) throw new Error("staged item rows must carry the explicit brand");
if (/itemName.*brand|brand.*itemName/i.test(parser.replace(/\/\/.*$/gm, ""))) throw new Error("brand must not be inferred from item description");
if (!itemForm.includes('name="brand_name"')) throw new Error("Item Master form must expose brand_name");
if (!itemPicker.includes("brand_name")) throw new Error("item picker must search/display brand_name");

console.log("brand-name contract: passed");
