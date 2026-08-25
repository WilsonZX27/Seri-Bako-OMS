const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("barcode support is removed while the backup manifest records the retired dataset", () => {
  const migration = read("supabase/migrations/091_remove_barcode_support.sql");
  const types = read("src/types/database.ts");
  const backup = read("src/server/backup/export.ts");
  const reset = read("supabase/maintenance/go_live_full_reset.sql");

  assert.match(migration, /delete from public\.permissions where module = 'barcodes'/);
  assert.match(migration, /drop table if exists public\.barcode_mappings/);
  assert.match(migration, /drop column if exists barcode/);
  assert.match(migration, /drop type if exists public\.barcode_type/);
  assert.doesNotMatch(types, /BarcodeType|barcode_mappings|barcode_image_url|supplier_barcode|internal_barcode/);
  assert.match(backup, /table: "barcode_mappings", classification: "excluded", reason: "Retired legacy table removed by migration 091/);
  assert.match(backup, /BACKUP_DATASETS\.filter\(\(dataset\) => dataset\.classification !== "excluded"\)/);
  assert.doesNotMatch(reset, /barcode_mappings/);
});
