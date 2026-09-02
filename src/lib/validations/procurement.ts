import { z } from "zod";

const prioritySchema = z.enum(["low", "normal", "urgent", "critical"]);
const requiredIsoDate = z.iso.date("Use YYYY-MM-DD for dates.");
const optionalIsoDate = z.union([z.iso.date("Use YYYY-MM-DD for dates."), z.literal("")]).optional().nullable();
const optionalShortText = z.string().trim().max(1_000, "Text is too long.").optional().nullable();
const optionalLongText = z.string().trim().max(2_000, "Text is too long.").optional().nullable();
const maxOperationalQuantity = 1_000_000;
const maxOperationalCost = 1_000_000_000;

export const purchaseRequestLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  qty: z.coerce.number().positive("Quantity must be more than 0").max(maxOperationalQuantity, "Quantity is too large."),
  uom: z.string().trim().min(1, "UOM is required").max(32, "UOM is too long."),
  estimated_unit_cost: z.coerce.number().min(0).max(maxOperationalCost, "Estimated cost is too large."),
  suggested_supplier_id: z.string().uuid().optional().nullable().or(z.literal("")),
  reason: optionalShortText,
  remarks: optionalLongText,
});

export const unresolvedPurchaseRequestLineSchema = z.object({
  requested_description: z.string().trim().min(1, "Item description is required").max(240, "Item description is too long."),
  requested_qty: z.coerce.number().positive("Quantity must be more than 0").max(maxOperationalQuantity, "Quantity is too large."),
  requested_uom: z.string().trim().min(1, "UOM is required").max(32, "UOM is too long."),
  remarks: optionalLongText,
});

export const purchaseRequestSchema = z.object({
  request_no: z.string().trim().max(64, "Request number is too long.").optional().nullable().or(z.literal("")),
  request_date: requiredIsoDate,
  required_date: optionalIsoDate,
  priority: prioritySchema.default("normal"),
  needed_by_date: optionalIsoDate,
  urgency_reason: optionalLongText,
  production_risk: z.coerce.boolean().optional(),
  branch_id: z.string().uuid("Branch is required"),
  status: z.literal("draft").optional(),
  remarks: optionalLongText,
  lines: z.array(purchaseRequestLineSchema).max(500, "A purchase request is limited to 500 lines."),
  unresolved_lines: z.array(unresolvedPurchaseRequestLineSchema).max(500, "A purchase request is limited to 500 unresolved lines.").default([]),
}).superRefine((request, context) => {
  if (request.lines.length + request.unresolved_lines.length < 1) {
    context.addIssue({ code: "custom", path: ["lines"], message: "Purchase request must have at least one line" });
  }
  if (request.lines.length + request.unresolved_lines.length > 500) {
    context.addIssue({ code: "custom", path: ["lines"], message: "A purchase request is limited to 500 lines." });
  }
});

export const purchaseOrderLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  qty_ordered: z.coerce.number().positive("Quantity must be more than 0").max(maxOperationalQuantity, "Quantity is too large."),
  qty_received: z.coerce.number().min(0).max(maxOperationalQuantity, "Received quantity is too large."),
  qty_cancelled: z.coerce.number().min(0).max(maxOperationalQuantity, "Cancelled quantity is too large."),
  uom: z.string().trim().min(1, "UOM is required").max(32, "UOM is too long."),
  unit_price: z.coerce.number().min(0).max(maxOperationalCost, "Unit price is too large."),
});

export const purchaseOrderSchema = z.object({
  po_no: z.string().trim().max(64, "Purchase order number is too long.").optional().nullable().or(z.literal("")),
  branch_id: z.string().uuid("Branch is required"),
  supplier_id: z.string().uuid("Supplier is required"),
  order_date: requiredIsoDate,
  expected_delivery_date: optionalIsoDate,
  status: z.literal("draft").optional(),
  approval_status: z.literal("draft").optional(),
  remarks: optionalLongText,
  lines: z.array(purchaseOrderLineSchema).min(1, "Purchase order must have at least one line").max(500, "A purchase order is limited to 500 lines."),
});

export const goodsReceivingLineSchema = z
  .object({
    purchase_order_line_id: z.string().uuid("PO line is required"),
    item_id: z.string().uuid("Item is required"),
    ordered_qty: z.coerce.number().min(0).max(maxOperationalQuantity, "Ordered quantity is too large."),
    previously_received_qty: z.coerce.number().min(0).max(maxOperationalQuantity, "Previously received quantity is too large."),
    pending_qty: z.coerce.number().min(0).max(maxOperationalQuantity, "Pending quantity is too large."),
    received_qty: z.coerce.number().min(0, "Received quantity cannot be negative").max(maxOperationalQuantity, "Received quantity is too large."),
    rejected_qty: z.coerce.number().min(0, "Rejected quantity cannot be negative").max(maxOperationalQuantity, "Rejected quantity is too large."),
    uom: z.string().trim().min(1, "UOM is required").max(32, "UOM is too long."),
    unit_cost: z.coerce.number().min(0).max(maxOperationalCost, "Unit cost is too large."),
    received_base_qty: z.coerce.number().min(0, "Base received quantity cannot be negative").max(maxOperationalQuantity, "Base received quantity is too large.").optional().nullable(),
    rejected_base_qty: z.coerce.number().min(0, "Base rejected quantity cannot be negative").max(maxOperationalQuantity, "Base rejected quantity is too large.").optional().nullable(),
    conversion_to_base_uom_snapshot: z.coerce.number().positive("Conversion must be greater than 0.").max(maxOperationalQuantity, "Conversion is too large.").optional().nullable(),
    remember_conversion: z.coerce.boolean().optional(),
    over_receipt_reason: optionalShortText,
    batch_no: z.string().trim().max(160, "Batch number is too long.").optional().nullable(),
    expiry_date: optionalIsoDate,
    remarks: optionalLongText,
  })
  .superRefine((line, context) => {
    if (line.received_qty + line.rejected_qty > line.pending_qty && (line.over_receipt_reason?.trim().length ?? 0) < 3) {
      context.addIssue({
        code: "custom",
        message: "Explain why the received and rejected quantity exceeds the PO balance.",
        path: ["over_receipt_reason"],
      });
    }
  });

export const goodsReceivingSchema = z.object({
  grn_no: z.string().trim().max(64, "GRN number is too long.").optional().nullable().or(z.literal("")),
  purchase_order_id: z.string().uuid("Purchase order is required"),
  supplier_id: z.string().uuid("Supplier is required"),
  received_date: requiredIsoDate,
  branch_id: z.string().uuid("Branch is required"),
  status: z.literal("draft").optional(),
  received_by: z.string().uuid().optional().nullable().or(z.literal("")),
  remarks: optionalLongText,
  delivery_order_attached: z.coerce.boolean().optional(),
  lines: z.array(goodsReceivingLineSchema).min(1, "GRN must have at least one line").max(500, "A GRN is limited to 500 lines."),
});

export const purchaseReturnLineSchema = z.object({
  goods_receiving_line_id: z.string().uuid("GRN line is required"),
  purchase_order_line_id: z.string().uuid("PO line is required"),
  item_id: z.string().uuid("Item is required"),
  received_qty: z.coerce.number().min(0).max(maxOperationalQuantity, "Received quantity is too large."),
  previously_returned_qty: z.coerce.number().min(0).max(maxOperationalQuantity, "Previously returned quantity is too large."),
  return_qty: z.coerce.number().positive("Return quantity must be more than 0").max(maxOperationalQuantity, "Return quantity is too large."),
  uom: z.string().trim().min(1, "UOM is required").max(32, "UOM is too long."),
  unit_cost: z.coerce.number().min(0).max(maxOperationalCost, "Unit cost is too large."),
  reason: optionalShortText,
}).refine((line) => line.return_qty <= line.received_qty - line.previously_returned_qty, {
  message: "Return quantity cannot exceed returnable quantity",
  path: ["return_qty"],
});

export const purchaseReturnSchema = z.object({
  purchase_return_no: z.string().trim().max(64, "Return number is too long.").optional().nullable().or(z.literal("")),
  goods_receiving_id: z.string().uuid("GRN is required"),
  return_date: requiredIsoDate,
  reason: optionalShortText,
  remarks: optionalLongText,
  lines: z.array(purchaseReturnLineSchema).min(1, "Purchase return must have at least one return line").max(500, "A purchase return is limited to 500 lines."),
});

export const supplierInvoiceSchema = z.object({
  supplier_invoice_no: z.string().trim().min(1, "Supplier invoice number is required").max(160, "Supplier invoice number is too long"),
  supplier_id: z.string().uuid("Supplier is required"),
  invoice_date: requiredIsoDate,
  due_date: optionalIsoDate,
  payment_terms_days: z.coerce.number().int().min(0).max(36_500, "Payment terms are too large"),
  tax_amount: z.coerce.number().min(0).max(maxOperationalCost, "Tax amount is too large"),
  notes: optionalLongText,
  lines: z.array(z.object({
    goods_receiving_line_id: z.string().uuid(),
    invoice_qty: z.coerce.number().positive("Invoice quantity must be more than 0").max(maxOperationalQuantity, "Invoice quantity is too large"),
    invoice_unit_price: z.coerce.number().min(0, "Invoice price cannot be negative").max(maxOperationalCost, "Invoice price is too large"),
  })).min(1, "Select at least one uninvoiced receiving line").max(500, "An invoice is limited to 500 receiving lines."),
});

export const supplierInvoicePaymentSchema = z.object({
  payment_date: requiredIsoDate,
  amount: z.coerce.number().positive("Payment must be more than 0").max(maxOperationalCost, "Payment is too large"),
  payment_method: z.string().trim().min(1, "Payment method is required").max(80, "Payment method is too long"),
  reference_no: z.string().trim().max(160, "Reference is too long").optional().nullable(),
  notes: optionalLongText,
  idempotency_key: z.string().uuid(),
});
