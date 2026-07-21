import { z } from "zod";

const optionalUuid = z.string().uuid().optional().nullable().or(z.literal(""));
const prioritySchema = z.enum(["low", "normal", "urgent", "critical"]);

export const purchaseRequestLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  qty: z.coerce.number().positive("Quantity must be more than 0"),
  uom: z.string().trim().min(1, "UOM is required"),
  estimated_unit_cost: z.coerce.number().min(0),
  suggested_supplier_id: z.string().uuid().optional().nullable().or(z.literal("")),
  reason: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
});

export const purchaseRequestSchema = z.object({
  request_no: z.string().trim().optional().nullable().or(z.literal("")),
  request_date: z.string().trim().min(1, "Request date is required"),
  required_date: z.string().trim().optional().nullable().or(z.literal("")),
  priority: prioritySchema.default("normal"),
  needed_by_date: z.string().trim().optional().nullable().or(z.literal("")),
  urgency_reason: z.string().trim().optional().nullable(),
  production_risk: z.coerce.boolean().optional(),
  branch_id: z.string().uuid("Branch is required"),
  location_id: optionalUuid,
  status: z.literal("draft").optional(),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(purchaseRequestLineSchema).min(1, "Purchase request must have at least one line"),
});

export const purchaseOrderLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  qty_ordered: z.coerce.number().positive("Quantity must be more than 0"),
  qty_received: z.coerce.number().min(0),
  qty_cancelled: z.coerce.number().min(0),
  uom: z.string().trim().min(1, "UOM is required"),
  unit_price: z.coerce.number().min(0),
});

export const purchaseOrderSchema = z.object({
  po_no: z.string().trim().optional().nullable().or(z.literal("")),
  supplier_id: z.string().uuid("Supplier is required"),
  order_date: z.string().trim().min(1, "Order date is required"),
  expected_delivery_date: z.string().trim().optional().nullable().or(z.literal("")),
  status: z.literal("draft").optional(),
  approval_status: z.literal("draft").optional(),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(purchaseOrderLineSchema).min(1, "Purchase order must have at least one line"),
});

export const goodsReceivingLineSchema = z
  .object({
    purchase_order_line_id: z.string().uuid("PO line is required"),
    item_id: z.string().uuid("Item is required"),
    ordered_qty: z.coerce.number().min(0),
    previously_received_qty: z.coerce.number().min(0),
    pending_qty: z.coerce.number().min(0),
    received_qty: z.coerce.number().min(0, "Received quantity cannot be negative"),
    rejected_qty: z.coerce.number().min(0, "Rejected quantity cannot be negative"),
    uom: z.string().trim().min(1, "UOM is required"),
    unit_cost: z.coerce.number().min(0),
    batch_no: z.string().trim().optional().nullable(),
    expiry_date: z.string().trim().optional().nullable().or(z.literal("")),
    remarks: z.string().trim().optional().nullable(),
  })
  .refine((line) => line.received_qty + line.rejected_qty <= line.pending_qty, {
    message: "Received plus rejected quantity cannot exceed pending quantity without manager override",
    path: ["received_qty"],
  });

export const goodsReceivingSchema = z.object({
  grn_no: z.string().trim().optional().nullable().or(z.literal("")),
  purchase_order_id: z.string().uuid("Purchase order is required"),
  supplier_id: z.string().uuid("Supplier is required"),
  received_date: z.string().trim().min(1, "Received date is required"),
  branch_id: z.string().uuid("Branch is required"),
  location_id: optionalUuid,
  status: z.literal("draft").optional(),
  received_by: z.string().uuid().optional().nullable().or(z.literal("")),
  remarks: z.string().trim().optional().nullable(),
  delivery_order_attached: z.coerce.boolean().optional(),
  lines: z.array(goodsReceivingLineSchema).min(1, "GRN must have at least one line"),
});

export const purchaseReturnLineSchema = z.object({
  goods_receiving_line_id: z.string().uuid("GRN line is required"),
  purchase_order_line_id: z.string().uuid("PO line is required"),
  item_id: z.string().uuid("Item is required"),
  received_qty: z.coerce.number().min(0),
  previously_returned_qty: z.coerce.number().min(0),
  return_qty: z.coerce.number().positive("Return quantity must be more than 0"),
  uom: z.string().trim().min(1, "UOM is required"),
  unit_cost: z.coerce.number().min(0),
  reason: z.string().trim().optional().nullable(),
}).refine((line) => line.return_qty <= line.received_qty - line.previously_returned_qty, {
  message: "Return quantity cannot exceed returnable quantity",
  path: ["return_qty"],
});

export const purchaseReturnSchema = z.object({
  purchase_return_no: z.string().trim().optional().nullable().or(z.literal("")),
  goods_receiving_id: z.string().uuid("GRN is required"),
  return_date: z.string().trim().min(1, "Return date is required"),
  reason: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(purchaseReturnLineSchema).min(1, "Purchase return must have at least one return line"),
});

export const supplierInvoiceSchema = z.object({
  supplier_invoice_no: z.string().trim().min(1, "Supplier invoice number is required"),
  supplier_id: z.string().uuid("Supplier is required"),
  invoice_date: z.string().trim().min(1, "Invoice date is required"),
  due_date: z.string().trim().optional().nullable().or(z.literal("")),
  payment_terms_days: z.coerce.number().int().min(0),
  tax_amount: z.coerce.number().min(0),
  notes: z.string().trim().optional().nullable(),
  lines: z.array(z.object({
    goods_receiving_line_id: z.string().uuid(),
    invoice_qty: z.coerce.number().positive("Invoice quantity must be more than 0"),
    invoice_unit_price: z.coerce.number().min(0, "Invoice price cannot be negative"),
  })).min(1, "Select at least one uninvoiced receiving line"),
});

export const supplierInvoicePaymentSchema = z.object({
  payment_date: z.string().trim().min(1, "Payment date is required"),
  amount: z.coerce.number().positive("Payment must be more than 0"),
  payment_method: z.string().trim().min(1, "Payment method is required"),
  reference_no: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  idempotency_key: z.string().uuid(),
});
