import { createAdminClient } from "@/lib/supabase/admin";
import { looseSupabase } from "@/lib/supabase/loose";

type QueuedEmail = { id: string; recipient: string; dedupe_key: string; subject: string; body: string; attempts: number };

export async function deliverPlanningEmails(limit = 10) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: 0, failed: 0, unavailable: true };
  const db = looseSupabase(createAdminClient());
  const claimed = await db.rpc("claim_production_emails", { p_limit: limit });
  if (claimed.error) throw new Error(claimed.error.message);
  let sent = 0;
  let failed = 0;
  await Promise.all(((claimed.data ?? []) as QueuedEmail[]).map(async (row) => {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "Idempotency-Key": row.dedupe_key },
        body: JSON.stringify({ from: process.env.PRODUCTION_PLANNING_EMAIL_FROM ?? "Seri Bako Operations <admin@seribako.com.my>", to: [row.recipient], subject: row.subject, text: row.body }),
        signal: AbortSignal.timeout(12000),
      });
      const payload = await response.json() as { id?: string; message?: string };
      if (!response.ok || !payload.id) throw new Error(payload.message ?? `Provider returned ${response.status}`);
      const saved = await db.from("production_planning_email_queue").update({ status: "sent", provider_id: payload.id, sent_at: new Date().toISOString(), locked_until: null, last_error: null }).eq("id", row.id).eq("attempts", row.attempts);
      if (saved.error) throw new Error(saved.error.message);
      sent++;
    } catch (error) {
      failed++;
      await db.from("production_planning_email_queue").update({ status: "failed", locked_until: null, last_error: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed", next_attempt_at: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** row.attempts)).toISOString() }).eq("id", row.id).eq("attempts", row.attempts);
    }
  }));
  return { sent, failed, unavailable: false };
}
