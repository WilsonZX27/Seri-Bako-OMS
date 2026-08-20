export type AutoCountFileType = "supplier_list" | "item_list" | "location_snapshot";
export type AutoCountParsedFile = {
  name: string;
  hash: string;
  type: AutoCountFileType;
  headers: string[];
  rows: Record<string, string>[];
};

export type AutoCountStageRow = {
  entityType: "supplier" | "item" | "branch_mapping" | "uom_conversion";
  businessKey: string;
  sourceFile: string;
  sourceRow: number;
  normalized: Record<string, unknown>;
  warnings: string[];
};

export type AutoCountIssue = {
  code: "missing_required_file" | "missing_item_code" | "duplicate_item_code" | "missing_item_list_record" | "unknown_branch" | "incomplete_item" | "supplier_conflict";
  message: string;
  sourceFile?: string;
  sourceRow?: number;
  itemCode?: string;
  resolution: string;
};

export type AutoCountAnalysis = {
  rows: AutoCountStageRow[];
  blockingIssues: string[];
  issueDetails: AutoCountIssue[];
  warnings: string[];
  summary: {
    files: number;
    supplierSources: number;
    itemSources: number;
    locationSources: number;
    suppliers: number;
    items: number;
    branchMappings: number;
    uomConversions: number;
    inventoryMovements: 0;
  };
};

export function formatAutoCountInfrastructureError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const normalized = raw.toLowerCase();
  const migrationMissing = normalized.includes("autocount_import_") || normalized.includes("apply_autocount_import_job") || normalized.includes("pgrst205") || normalized.includes("schema cache");
  if (migrationMissing) {
    return {
      message: "AutoCount setup is not available in this environment yet. Ask an Owner to apply migrations 169 and refresh the Supabase schema, then retry. No OMS records were changed.",
      setupRequired: true,
    } as const;
  }
  return {
    message: "AutoCount staging is temporarily unavailable. Retry this import; no OMS records were changed. If it persists, ask an Owner to check the import setup.",
    setupRequired: false,
  } as const;
}

const normalizeHeader = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const text = (value: unknown) => String(value ?? "").trim();
const numberOrNull = (value: unknown) => {
  const normalized = text(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export function classifyAutoCountHeaders(headers: string[]): AutoCountFileType | null {
  const set = new Set(headers.map(normalizeHeader));
  if (["code", "company name", "currency code"].every((header) => set.has(header))) return "supplier_list";
  if (["item code", "base uom", "main supplier", "item group"].every((header) => set.has(header))) return "item_list";
  if (["item code", "location", "uom", "qty", "total cost"].every((header) => set.has(header))) return "location_snapshot";
  return null;
}

function get(row: Record<string, string>, header: string) {
  const key = Object.keys(row).find((candidate) => normalizeHeader(candidate) === normalizeHeader(header));
  return key ? text(row[key]) : "";
}

export function analyzeAutoCountFiles(files: AutoCountParsedFile[], knownBranchCodes: string[]): AutoCountAnalysis {
  const blockingIssues: string[] = [];
  const issueDetails: AutoCountIssue[] = [];
  const warnings: string[] = [];
  const staged = new Map<string, AutoCountStageRow>();
  const supplierNames = new Map<string, string>();
  const itemRows = new Map<string, { row: Record<string, string>; file: string; rowNumber: number }>();
  const locations: Array<{ row: Record<string, string>; file: string; rowNumber: number }> = [];
  const branchCodes = new Set(knownBranchCodes.map((code) => code.toLowerCase()));

  for (const file of files) {
    file.rows.forEach((row, index) => {
      const sourceRow = index + 2;
      if (file.type === "supplier_list") {
        const code = get(row, "Code");
        const name = get(row, "Company Name");
        if (code && name) supplierNames.set(code.toLowerCase(), name);
      } else if (file.type === "item_list") {
        const itemCode = get(row, "Item Code");
        if (!itemCode) {
          blockingIssues.push(`${file.name} row ${sourceRow}: Item Code is required.`);
          issueDetails.push({ code: "missing_item_code", message: "Item Code is blank.", sourceFile: file.name, sourceRow, resolution: "Enter an Item Code in AutoCount, then export the Item List again." });
        } else if (itemRows.has(itemCode.toLowerCase())) {
          blockingIssues.push(`${file.name} row ${sourceRow}: duplicate Item Code ${itemCode}.`);
          issueDetails.push({ code: "duplicate_item_code", message: `Item Code ${itemCode} appears more than once.`, sourceFile: file.name, sourceRow, itemCode, resolution: "Keep one authoritative Item record in AutoCount, then export the Item List again." });
        }
        else itemRows.set(itemCode.toLowerCase(), { row, file: file.name, rowNumber: sourceRow });
      } else {
        // AutoCount appends valuation totals with no Item Code or Location.
        // They are report footers, not malformed inventory rows.
        if (get(row, "Item Code") || get(row, "Location")) locations.push({ row, file: file.name, rowNumber: sourceRow });
      }
    });
  }

  if (!files.some((file) => file.type === "supplier_list")) {
    blockingIssues.push("Add one AutoCount Supplier List file.");
    issueDetails.push({ code: "missing_required_file", message: "Supplier List was not selected.", resolution: "Export and select the latest AutoCount Supplier List." });
  }
  if (!files.some((file) => file.type === "item_list")) {
    blockingIssues.push("Add one AutoCount Item List file.");
    issueDetails.push({ code: "missing_required_file", message: "Item List was not selected.", resolution: "Export and select the latest AutoCount Item List." });
  }
  if (!files.some((file) => file.type === "location_snapshot")) {
    blockingIssues.push("Add at least one AutoCount Location Snapshot file.");
    issueDetails.push({ code: "missing_required_file", message: "Location Snapshot was not selected.", resolution: "Export and select at least one AutoCount Location Snapshot." });
  }

  const locationsByItem = new Map<string, typeof locations>();
  for (const location of locations) {
    const itemCode = get(location.row, "Item Code");
    const branchCode = get(location.row, "Location");
    if (!itemCode) {
      blockingIssues.push(`${location.file} row ${location.rowNumber}: Item Code is required.`);
      issueDetails.push({ code: "missing_item_code", message: "Item Code is blank in the Location Snapshot.", sourceFile: location.file, sourceRow: location.rowNumber, resolution: "Correct the source record in AutoCount, then export the Location Snapshot again." });
      continue;
    }
    if (!itemRows.has(itemCode.toLowerCase())) {
      blockingIssues.push(`${location.file} row ${location.rowNumber}: ${itemCode} is missing from the Item List.`);
      issueDetails.push({ code: "missing_item_list_record", message: `${itemCode} exists in Location data but not in the selected Item List.`, sourceFile: location.file, sourceRow: location.rowNumber, itemCode, resolution: "Export a newer Item List from the same time as, or after, this Location Snapshot and review again." });
      continue;
    }
    if (!branchCodes.has(branchCode.toLowerCase())) {
      blockingIssues.push(`${location.file} row ${location.rowNumber}: Location ${branchCode || "(blank)"} does not match an active OMS branch code.`);
      issueDetails.push({ code: "unknown_branch", message: `Location ${branchCode || "(blank)"} does not match an active OMS branch.`, sourceFile: location.file, sourceRow: location.rowNumber, itemCode, resolution: "Correct the AutoCount Location code or add the matching active branch in OMS, then review again." });
      continue;
    }
    const list = locationsByItem.get(itemCode.toLowerCase()) ?? [];
    list.push(location);
    locationsByItem.set(itemCode.toLowerCase(), list);
  }

  const supplierGroups = new Map<string, { refs: Map<string, string>; sourceFile: string; sourceRow: number }>();
  const creditorGroups = new Map<string, string>();
  for (const { row, file, rowNumber } of itemRows.values()) {
    const itemCode = get(row, "Item Code");
    const group = get(row, "Item Group");
    const baseUom = get(row, "Base UOM");
    const itemName = get(row, "Description");
    // Brand is accepted only when the source export supplies an explicit
    // Brand/Brand Name/品牌 column. Never infer it from the description.
    const brandName = get(row, "Brand") || get(row, "Brand Name") || get(row, "品牌");
    const creditorCode = get(row, "Main Supplier");
    if (!group || !baseUom || !itemName) {
      blockingIssues.push(`${file} row ${rowNumber}: ${itemCode} requires Description, Base UOM, and Item Group.`);
      issueDetails.push({ code: "incomplete_item", message: `${itemCode} is missing Description, Base UOM, or Item Group.`, sourceFile: file, sourceRow: rowNumber, itemCode, resolution: "Complete the Item master record in AutoCount, then export the Item List again." });
      continue;
    }
    const groupKey = group.toLowerCase();
    const groupEntry = supplierGroups.get(groupKey) ?? { refs: new Map<string, string>(), sourceFile: file, sourceRow: rowNumber };
    if (creditorCode) {
      const priorGroup = creditorGroups.get(creditorCode.toLowerCase());
      if (priorGroup && priorGroup !== groupKey) {
        blockingIssues.push(`${file} row ${rowNumber}: Main Supplier ${creditorCode} is assigned to both ${priorGroup.toUpperCase()} and ${group}.`);
        issueDetails.push({ code: "supplier_conflict", message: `Main Supplier ${creditorCode} is assigned to both ${priorGroup.toUpperCase()} and ${group}.`, sourceFile: file, sourceRow: rowNumber, itemCode, resolution: "Correct the Item Group or Main Supplier assignment in AutoCount, then export the Item List again." });
      }
      creditorGroups.set(creditorCode.toLowerCase(), groupKey);
      groupEntry.refs.set(creditorCode, supplierNames.get(creditorCode.toLowerCase()) ?? "");
    }
    supplierGroups.set(groupKey, groupEntry);

    const locationRows = locationsByItem.get(itemCode.toLowerCase()) ?? [];
    const baseLocation = locationRows.find((entry) => get(entry.row, "UOM").toLowerCase() === baseUom.toLowerCase());
    const standardCost = numberOrNull(baseLocation ? get(baseLocation.row, "Standard Cost") : "");
    staged.set(`item|${itemCode.toLowerCase()}`, {
      entityType: "item",
      businessKey: itemCode,
      sourceFile: file,
      sourceRow: rowNumber,
      normalized: {
        item_code: itemCode,
        item_name: itemName,
        brand_name: brandName || null,
        supplier_code: group,
        supplier_group: group,
        creditor_code: creditorCode || null,
        base_uom: baseUom,
        standard_cost: standardCost && standardCost > 0 ? standardCost : null,
        active: !["unchecked", "false", "0"].includes(get(row, "Is Active").toLowerCase()),
      },
      warnings: [],
    });
  }

  for (const [groupKey, entry] of supplierGroups) {
    const group = [...itemRows.values()].map(({ row }) => get(row, "Item Group")).find((value) => value.toLowerCase() === groupKey) ?? groupKey.toUpperCase();
    const namedRefs = [...entry.refs].filter(([, name]) => name);
    const supplierName = namedRefs.length === 1 && entry.refs.size === 1 ? namedRefs[0][1] : group;
    const internalCode = [...entry.refs.keys()].sort((a, b) => a.localeCompare(b))[0] ?? group;
    const rowWarnings = entry.refs.size === 0 ? ["No AutoCount creditor reference; supplier name uses Item Group."]
      : namedRefs.length !== entry.refs.size ? ["One or more Main Supplier codes were not found in the Supplier List."] : [];
    staged.set(`supplier|${groupKey}`, {
      entityType: "supplier", businessKey: group, sourceFile: entry.sourceFile, sourceRow: entry.sourceRow,
      normalized: { supplier_code: internalCode, supplier_group: group, supplier_name: supplierName, external_refs: [...entry.refs].map(([code, name]) => ({ code, name })) },
      warnings: rowWarnings,
    });
    warnings.push(...rowWarnings.map((warning) => `${group}: ${warning}`));
  }

  for (const location of locations) {
    const itemCode = get(location.row, "Item Code");
    const branchCode = get(location.row, "Location");
    const item = itemRows.get(itemCode.toLowerCase());
    if (!item || !branchCodes.has(branchCode.toLowerCase())) continue;
    const supplierCode = get(item.row, "Item Group");
    staged.set(`mapping|${branchCode.toLowerCase()}|${itemCode.toLowerCase()}`, {
      entityType: "branch_mapping", businessKey: `${branchCode}|${itemCode}`, sourceFile: location.file, sourceRow: location.rowNumber,
      normalized: {
        branch_code: branchCode, item_code: itemCode, supplier_code: supplierCode, supplier_group: supplierCode,
        source_qty: numberOrNull(get(location.row, "Qty")), source_total_cost: numberOrNull(get(location.row, "Total Cost")),
        source_average_cost: numberOrNull(get(location.row, "Average Cost Per Qty")),
      },
      warnings: ["AutoCount quantity and valuation are audit-only; no OMS inventory movement will be created."],
    });
    const baseUom = get(item.row, "Base UOM");
    const uom = get(location.row, "UOM");
    const factor = numberOrNull(get(location.row, "UOM Rate"));
    if (uom && baseUom && uom.toLowerCase() !== baseUom.toLowerCase()) {
      if (factor && factor > 0 && factor !== 1) {
        staged.set(`uom|${itemCode.toLowerCase()}|${uom.toLowerCase()}|${baseUom.toLowerCase()}`, {
          entityType: "uom_conversion", businessKey: `${itemCode}|${uom}|${baseUom}`, sourceFile: location.file, sourceRow: location.rowNumber,
          normalized: { item_code: itemCode, from_uom: uom, to_uom: baseUom, factor }, warnings: [],
        });
      } else {
        warnings.push(`${location.file} row ${location.rowNumber}: ${itemCode} ${uom} has no trustworthy conversion to ${baseUom}; conversion was not created.`);
      }
    }
  }

  const rows = [...staged.values()];
  return {
    rows, blockingIssues: [...new Set(blockingIssues)], issueDetails, warnings: [...new Set(warnings)],
    summary: {
      files: files.length,
      supplierSources: files.filter((file) => file.type === "supplier_list").length,
      itemSources: files.filter((file) => file.type === "item_list").length,
      locationSources: files.filter((file) => file.type === "location_snapshot").length,
      suppliers: rows.filter((row) => row.entityType === "supplier").length,
      items: rows.filter((row) => row.entityType === "item").length,
      branchMappings: rows.filter((row) => row.entityType === "branch_mapping").length,
      uomConversions: rows.filter((row) => row.entityType === "uom_conversion").length,
      inventoryMovements: 0,
    },
  };
}
