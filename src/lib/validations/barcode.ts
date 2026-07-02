import { z } from "zod";

export const barcodeTypeSchema = z.enum(["ean13", "upc", "qr", "internal", "supplier", "packaging", "other"]);

export const barcodeFieldsSchema = z.object({
  barcode: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  qr_code: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  supplier_barcode: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  internal_barcode: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  barcode_type: barcodeTypeSchema.optional().nullable().transform((value) => value ?? "internal"),
  barcode_image_url: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
});

export const productBarcodeFieldsSchema = barcodeFieldsSchema.omit({ supplier_barcode: true });

export const barcodeLookupSchema = z.object({
  barcode: z.string().trim().min(1, "Barcode is required"),
});
