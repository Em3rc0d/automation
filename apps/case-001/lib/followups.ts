import { sendWhatsAppText } from "./providers";
import { persistOutboundMessage, tenantId } from "./store";
import { query } from "./persistence/database";

async function latestInboundAt(phone: string) {
  const result = await query<{ occurred_at: Date | string }>(`
    select occurred_at
    from public.case001_messages
    where tenant_id = $1 and phone = $2 and direction = 'inbound'
    order by occurred_at desc
    limit 1
  `, [tenantId(), phone]);
  const value = result.rows[0]?.occurred_at;
  return value ? new Date(value) : null;
}

export async function runQuoteFollowups(now = new Date()) {
  const delayHours = Number(process.env.FOLLOWUP_AFTER_HOURS ?? 12);
  const maxAttempts = Math.max(1, Number(process.env.FOLLOWUP_MAX_ATTEMPTS ?? 1));
  const cutoff = new Date(now.getTime() - delayHours * 3_600_000).toISOString();
  const tenant = tenantId();

  const result = await query<any>(`
    select id, customer_phone, sent_at, total, currency, follow_up_count,
      last_follow_up_at, follow_up_template_required_at
    from public.case001_quotes
    where tenant_id = $1 and status = 'sent' and sent_at <= $2
    order by sent_at asc
    limit 50
  `, [tenant, cutoff]);

  const results: Array<Record<string, unknown>> = [];
  for (const quote of result.rows) {
    if (!quote.sent_at || Number(quote.follow_up_count ?? 0) >= maxAttempts) continue;

    const lastAttemptAt = quote.last_follow_up_at ? new Date(quote.last_follow_up_at) : new Date(quote.sent_at);
    const hoursSinceAttempt = (now.getTime() - lastAttemptAt.getTime()) / 3_600_000;
    if (hoursSinceAttempt < delayHours) continue;

    const inboundAt = await latestInboundAt(quote.customer_phone);
    if (!inboundAt || (now.getTime() - inboundAt.getTime()) / 3_600_000 >= 24) {
      if (!quote.follow_up_template_required_at) {
        await query(`
          update public.case001_quotes
          set follow_up_template_required_at = $1
          where tenant_id = $2 and id = $3
        `, [now.toISOString(), tenant, quote.id]);
      }
      results.push({ quoteId: quote.id, status: "template_required" });
      continue;
    }

    const body = "Hola, ¿pudiste revisar la cotización que te envié? Si quieres cambiar cantidad, producto, moneda o condición, dime por aquí y la actualizo.";
    const sent = await sendWhatsAppText(quote.customer_phone, body);
    await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: quote.customer_phone, body, quoteId: quote.id });
    const nextCount = Number(quote.follow_up_count ?? 0) + 1;
    await query(`
      update public.case001_quotes
      set follow_up_sent_at = $1, last_follow_up_at = $1, follow_up_count = $2
      where tenant_id = $3 and id = $4
    `, [now.toISOString(), nextCount, tenant, quote.id]);
    results.push({ quoteId: quote.id, status: "sent", attempt: nextCount });
  }
  return results;
}
