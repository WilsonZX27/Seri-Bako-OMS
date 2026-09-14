/** Stored pending quantity is the outstanding snapshot BEFORE this receipt.
 * Rejected units do not fulfil the order; they still require replacement.
 * This is a historical receipt balance, not today's outstanding PO quantity.
 */
export function remainingAfterReceipt(line: { pending_qty: number; received_qty: number }, status: string) {
  return Math.max(line.pending_qty - (status === "posted" ? line.received_qty : 0), 0);
}
