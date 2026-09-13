import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppText } from "./providers";
import { persistOutboundMessage } from "./store";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function runQuoteFollowups(now = new Date()) {
  const delayHours = Number(process.env.FOLLOWUP_AFTER_HOURS ?? 12);
  const tenantId = process.env.CASE001_TENANT_ID ?? "case-001-pilot";
  const cutoff = new Date(now.getTime() - delayHours * 3_600_000).toISOString();

  const database = db();
  const { data: quotes, error } = await database
    .from("case001_quotes")
    .select("id,customer_phone,sent_at,total,currency")
    .eq("tenant_id", tenantId)
    .eq("status", "sent")
    .is("follow_up_sent_at", null)
    .lte("sent_at", cutoff)
    .order("sent_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  for (const quote of quotes ?? []) {
    if (!quote.sent_at) continue;
    const ageHours = (now.getTime() - new Date(quote.sent_at).getTime()) / 3_600_000;
    if (ageHours > 24) {
      results.push({ quoteId: quote.id, status: "template_required" });
      continue;
    }

    const body = "Hola, ¿pudiste revisar la cotización que te envié? Si quieres cambiar cantidad, producto, moneda o condición, dime por aquí y la actualizo.";
    const sent = await sendWhatsAppText(quote.customer_phone, body);
    await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: quote.customer_phone, body, quoteId: quote.id });
    const { error: updateError } = await database.from("case001_quotes").update({ follow_up_sent_at: now.toISOString() }).eq("id", quote.id);
    if (updateError) throw updateError;
    results.push({ quoteId: quote.id, status: "sent" });
  }
  return results;
}
