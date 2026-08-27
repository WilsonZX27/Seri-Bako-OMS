import { normalizeUom } from "@/lib/uom";

export type PurchaseRequestGuidedIssueCode =
  | "supplier_data_unavailable"
  | "supplier_inactive"
  | "supplier_assignment_required"
  | "supplier_selection_required"
  | "branch_mapping_missing"
  | "uom_mapping_missing";

export type PurchaseRequestGuidedIssue = {
  code: PurchaseRequestGuidedIssueCode;
  severity: "blocking" | "unavailable";
  field: "supplier" | "uom";
  message: string;
  cause: string;
  recommendedAction: string;
  allowedActions: Array<"retry" | "select_supplier" | "change_uom" | "create_mapping" | "replace_item">;
  ownerRole: "Manager / Purchasing" | "Purchasing / Master Data";
};

type Mapping = {
  branch_id: string;
  item_id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_uom: string;
  is_preferred: boolean;
};

export function diagnosePurchaseRequestSupplier({
  line,
  item,
  branchId,
  supplierIds,
  supplierMappings,
}: {
  line: { item_id: string; suggested_supplier_id: string | null; uom: string };
  item?: { supplier_id: string | null; purchase_unit?: string | null; base_unit?: string | null };
  branchId: string | null;
  supplierIds: Set<string> | null;
  supplierMappings: Mapping[] | null;
}): { supplierName: string | null; ready: boolean; issue: PurchaseRequestGuidedIssue | null; suggestedSupplierId: string | null } {
  if (!supplierIds || !supplierMappings) {
    return {
      supplierName: null,
      ready: false,
      suggestedSupplierId: null,
      issue: {
        code: "supplier_data_unavailable",
        severity: "unavailable",
        field: "supplier",
        message: "Supplier readiness could not be verified.",
        cause: "The supplier or branch-mapping directory did not load completely.",
        recommendedAction: "Retry this page. Existing PR data remains unchanged.",
        allowedActions: ["retry"],
        ownerRole: "Manager / Purchasing",
      },
    };
  }

  const itemMappings = supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === line.item_id);
  const compatible = itemMappings.filter((mapping) => normalizeUom(mapping.purchase_uom) === normalizeUom(line.uom));
  const explicit = line.suggested_supplier_id;
  const explicitMapping = explicit ? compatible.find((mapping) => mapping.supplier_id === explicit) : null;
  const baseUom = item?.base_unit ?? "base UOM";
  const requestedUom = line.uom.toUpperCase();
  const sameAsBase = normalizeUom(line.uom) === normalizeUom(baseUom);

  if (explicitMapping) return { supplierName: explicitMapping.supplier_name, ready: true, issue: null, suggestedSupplierId: explicit };

  const itemDefaultIsValid = Boolean(
    explicit && itemMappings.length === 0 && item?.supplier_id === explicit && supplierIds.has(explicit)
    && normalizeUom(item.purchase_unit ?? item.base_unit ?? "") === normalizeUom(line.uom),
  );
  if (itemDefaultIsValid) return { supplierName: null, ready: true, issue: null, suggestedSupplierId: explicit };

  if (explicit && !supplierIds.has(explicit)) {
    return {
      supplierName: null,
      ready: false,
      suggestedSupplierId: null,
      issue: {
        code: "supplier_inactive", severity: "blocking", field: "supplier",
        message: "The selected supplier is no longer active or accessible.",
        cause: "This PR still references an older supplier selection.",
        recommendedAction: "Choose an active supplier mapped to this branch, item, and UOM.",
        allowedActions: ["select_supplier", "replace_item"], ownerRole: "Purchasing / Master Data",
      },
    };
  }

  // A PR supplier is a suggested source, not proof that master-data setup is
  // complete. Keep the request reviewable when the active supplier has no
  // branch/item/UOM route yet; Purchasing confirms or creates that route later.
  if (explicit && supplierIds.has(explicit)) {
    return { supplierName: null, ready: true, issue: null, suggestedSupplierId: explicit };
  }

  if (explicit && itemMappings.some((mapping) => mapping.supplier_id === explicit)) {
    return {
      supplierName: itemMappings.find((mapping) => mapping.supplier_id === explicit)?.supplier_name ?? null,
      ready: false,
      suggestedSupplierId: explicit,
      issue: {
        code: "uom_mapping_missing", severity: "blocking", field: "uom",
        message: `Purchase UOM ${requestedUom} is not configured for this supplier.`,
        cause: `The current supplier term uses ${itemMappings.find((mapping) => mapping.supplier_id === explicit)?.purchase_uom ?? "another UOM"}; the inventory base unit is ${baseUom}.`,
        recommendedAction: sameAsBase ? `Set the supplier purchase UOM to ${requestedUom}. No conversion is needed.` : `Set purchase UOM to ${requestedUom} and add its conversion to ${baseUom}.`,
        allowedActions: ["change_uom", "create_mapping", "select_supplier"], ownerRole: "Purchasing / Master Data",
      },
    };
  }

  if (explicit) {
    return {
      supplierName: null,
      ready: false,
      suggestedSupplierId: explicit,
      issue: {
        code: "branch_mapping_missing", severity: "blocking", field: "supplier",
        message: "The selected supplier is not mapped to this branch and item.",
        cause: "A supplier name exists, but the purchasing route required for this PR does not.",
        recommendedAction: "Create the branch mapping or choose another mapped supplier.",
        allowedActions: ["create_mapping", "select_supplier", "replace_item"], ownerRole: "Purchasing / Master Data",
      },
    };
  }

  const automatic = compatible.find((mapping) => mapping.is_preferred) ?? (compatible.length === 1 ? compatible[0] : null);
  if (automatic) {
    return {
      supplierName: automatic.supplier_name,
      ready: false,
      suggestedSupplierId: automatic.supplier_id,
      issue: {
        code: "supplier_assignment_required", severity: "blocking", field: "supplier",
        message: `${automatic.supplier_name} is the available mapped supplier, but this PR line has not stored it yet.`,
        cause: "The line predates the current supplier snapshot or was saved without a supplier.",
        recommendedAction: "Use the mapped supplier and revalidate this line.",
        allowedActions: ["select_supplier", "replace_item"], ownerRole: "Manager / Purchasing",
      },
    };
  }

  if (compatible.length > 1) {
    return {
      supplierName: null, ready: false, suggestedSupplierId: null,
      issue: {
        code: "supplier_selection_required", severity: "blocking", field: "supplier",
        message: "More than one supplier is mapped for this item and UOM.",
        cause: "The system cannot safely guess which supplier Purchasing intends to use.",
        recommendedAction: "Select the supplier for this PR line.",
        allowedActions: ["select_supplier", "replace_item"], ownerRole: "Manager / Purchasing",
      },
    };
  }

  const hasOtherUom = itemMappings.length > 0;
  return {
    supplierName: null, ready: false, suggestedSupplierId: null,
    issue: hasOtherUom ? {
      code: "uom_mapping_missing", severity: "blocking", field: "uom",
       message: `Purchase UOM ${requestedUom} is not configured for this supplier.`,
       cause: `The existing supplier term uses ${itemMappings[0]?.purchase_uom ?? "another UOM"}; inventory is controlled in ${baseUom}.`,
       recommendedAction: sameAsBase ? `Set the supplier purchase UOM to ${requestedUom}. No conversion is needed.` : `Set purchase UOM to ${requestedUom} and add its conversion to ${baseUom}.`,
      allowedActions: ["change_uom", "create_mapping", "replace_item"], ownerRole: "Purchasing / Master Data",
    } : {
      code: "branch_mapping_missing", severity: "blocking", field: "supplier",
      message: "No supplier is mapped to this branch and item.",
      cause: "The Item Master exists, but its branch purchasing route has not been set up.",
      recommendedAction: "Create a branch mapping, select a replacement item, or keep the PR in review.",
      allowedActions: ["create_mapping", "replace_item"], ownerRole: "Purchasing / Master Data",
    },
  };
}
