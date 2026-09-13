import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppText } from "./providers";
import { persistOutboundMessage, tenantId } from "./store";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function latestInboundAt(database: ReturnType<typeof db>, phone: string) {
  const { data, error } = await database
    .from("case001_messages")
    .select("occurred_at")
    .eq("tenant_id", tenantId())
    .eq("phone", phone)
    .eq("direction", "inbound")
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.occurred_at ? new Date(data.occurred_at) : null;
}

export async function runQuoteFollowups(now = new Date()) {
  const delayHours = Number(process.env.FOLLOWUP_AFTER_HOURS ?? 12);
  const maxAttempts = Math.max(1, Number(process.env.FOLLOWUP_MAX_ATTEMPTS ?? 1));
  const cutoff = new Date(now.getTime() - delayHours * 3_600_000).toISOString();
  const database = db();
  const tenant = tenantId();

  const { data: quotes, error } = await database
    .from("case001_quotes")
    .select("id,customer_phone,sent_at,total,currency,follow_up_count,last_follow_up_at,follow_up_template_required_at")
    .eq("tenant_id", tenant)
    .eq("status", "sent")
    .lte("sent_at", cutoff)
    .order("sent_at", { ascending: true })
    .limit(50);
  if (error) throw error;

  const results: Array<Record<string, unknown>> = [];
  for (const quote of quotes ?? []) {
    if (!quote.sent_at || Number(quote.follow_up_count ?? 0) >= maxAttempts) continue;

    const lastAttemptAt = quote.last_follow_up_at ? new Date(quote.last_follow_up_at) : new Date(quote.sent_at);
    const hoursSinceAttempt = (now.getTime() - lastAttemptAt.getTime()) / 3_600_000;
    if (hoursSinceAttempt < delayHours) continue;

    const inboundAt = await latestInboundAt(database, quote.customer_phone);
    if (!inboundAt || (now.getTime() - inboundAt.getTime()) / 3_600_000 >= 24) {
      if (!quote.follow_up_template_required_at) {
        const { error: blockedError } = await database
          .from("case001_quotes")
          .update({ follow_up_template_required_at: now.toISOString() })
          .eq("tenant_id", tenant)
          .eq("id", quote.id);
        if (blockedError) throw blockedError;
      }
      results.push({ quoteId: quote.id, status: "template_required" });
      continue;
    }

    const body = "Hola, ¿pudiste revisar la cotización que te envié? Si quieres cambiar cantidad, producto, moneda o condición, dime por aquí y la actualizo.";
    const sent = await sendWhatsAppText(quote.customer_phone, body);
    await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: quote.customer_phone, body, quoteId: quote.id });
    const nextCount = Number(quote.follow_up_count ?? 0) + 1;
    const { error: updateError } = await database
      .from("case001_quotes")
      .update({ follow_up_sent_at: now.toISOString(), last_follow_up_at: now.toISOString(), follow_up_count: nextCount })
      .eq("tenant_id", tenant)
      .eq("id", quote.id);
    if (updateError) throw updateError;
    results.push({ quoteId: quote.id, status: "sent", attempt: nextCount });
  }
  return results;
}
