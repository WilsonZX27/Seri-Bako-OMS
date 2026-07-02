import { createClient } from "@/lib/supabase/server";

const generatedPlaceholderPatterns: Array<{ documentType: string; pattern: RegExp }> = [
  { documentType: "purchase_request", pattern: /^PR-(AUTO|\d{6,8})$/i },
  { documentType: "purchase_order", pattern: /^PO-(AUTO|\d{6,8})$/i },
  { documentType: "goods_receiving", pattern: /^GRN-(AUTO|\d{6,8})$/i },
  { documentType: "stock_count", pattern: /^SC-(AUTO|\d{6,8})$/i },
  { documentType: "stock_transfer", pattern: /^TRF-(AUTO|\d{6,8})$/i },
  { documentType: "stock_wastage", pattern: /^WST-(AUTO|\d{6,8})$/i },
  { documentType: "stock_transaction", pattern: /^ST-(AUTO|\d{6,8})$/i },
  { documentType: "opening_balance", pattern: /^OB-(AUTO|\d{6,8}(-\d{3})?)$/i },
];

function shouldGenerate(documentType: string, input: string | null | undefined) {
  const value = String(input ?? "").trim();
  if (!value) return true;
  const matcher = generatedPlaceholderPatterns.find((entry) => entry.documentType === documentType);
  return matcher ? matcher.pattern.test(value) : false;
}

export async function getNextDocumentNumber(companyId: string, documentType: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as typeof supabase & { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }).rpc("next_document_number", {
    p_company_id: companyId,
    p_document_type: documentType,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "string") throw new Error("Could not generate the next document number.");
  return data;
}

export async function resolveDocumentNumber(input: {
  companyId: string | null | undefined;
  documentType: string;
  enteredNumber: string | null | undefined;
}) {
  const entered = String(input.enteredNumber ?? "").trim();
  if (!input.companyId) {
    if (entered && !shouldGenerate(input.documentType, entered)) return entered;
    throw new Error("Company is required before creating this document.");
  }

  if (!shouldGenerate(input.documentType, entered)) return entered;
  return getNextDocumentNumber(input.companyId, input.documentType);
}
