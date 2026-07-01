import { z } from "zod";

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
  request_no: z.string().trim().min(1, "Request number is required"),
  request_date: z.string().trim().min(1, "Request date is required"),
  required_date: z.string().trim().optional().nullable().or(z.literal("")),
  branch_id: z.string().uuid("Branch is required"),
  location_id: z.string().uuid("Location is required"),
  status: z.enum(["draft", "submitted", "admin_review", "purchasing_review", "pending_approval", "approved", "rejected", "converted", "cancelled"]),
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
  po_no: z.string().trim().min(1, "PO number is required"),
  supplier_id: z.string().uuid("Supplier is required"),
  order_date: z.string().trim().min(1, "Order date is required"),
  expected_delivery_date: z.string().trim().optional().nullable().or(z.literal("")),
  status: z.enum(["draft", "pending_approval", "approved", "sent", "partial_received", "received", "cancelled", "closed"]),
  approval_status: z.enum(["not_required", "draft", "pending", "approved", "rejected", "cancelled"]),
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
  grn_no: z.string().trim().min(1, "GRN number is required"),
  purchase_order_id: z.string().uuid("Purchase order is required"),
  supplier_id: z.string().uuid("Supplier is required"),
  received_date: z.string().trim().min(1, "Received date is required"),
  branch_id: z.string().uuid("Branch is required"),
  location_id: z.string().uuid("Location is required"),
  status: z.enum(["draft", "posted", "cancelled"]),
  received_by: z.string().uuid().optional().nullable().or(z.literal("")),
  remarks: z.string().trim().optional().nullable(),
  delivery_order_attached: z.coerce.boolean().optional(),
  lines: z.array(goodsReceivingLineSchema).min(1, "GRN must have at least one line"),
});
