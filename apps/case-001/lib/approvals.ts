import { sendWhatsAppText } from "./providers";
import { getQuoteById, markQuoteSent, persistOutboundMessage, tenantId } from "./store";
import { query, withTransaction } from "./persistence/database";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);
}

export async function requestQuoteApproval(input: { quoteId: string; reasons: string[] }) {
  const tenant = tenantId();
  const quoteResult = await query("select id from public.case001_quotes where tenant_id = $1 and id = $2 limit 1", [tenant, input.quoteId]);
  if (!quoteResult.rows[0]) throw new Error("Quote not found for tenant.");

  const result = await query<{ id: string }>(`
    insert into public.case001_approval_requests (tenant_id, quote_id, reasons, status)
    values ($1, $2, $3, 'pending')
    returning id
  `, [tenant, input.quoteId, input.reasons]);
  const approval = result.rows[0];
  if (!approval) throw new Error("Approval insert returned no id.");

  const sellerPhone = process.env.CASE001_SELLER_PHONE;
  if (sellerPhone) {
    const body = `Cotización ${input.quoteId} requiere aprobación. Motivos: ${input.reasons.join(", ")}. Revisa la consola privada para aprobar o rechazar.`;
    await sendWhatsAppText(sellerPhone, body);
  }
  return approval.id;
}

export async function listPendingApprovals() {
  const result = await query<any>(`
    select a.id, a.status, a.reasons, a.requested_at, a.quote_id,
      (
        select to_jsonb(q) || jsonb_build_object(
          'case001_quote_lines', coalesce((
            select jsonb_agg(to_jsonb(l) order by l.id)
            from public.case001_quote_lines l
            where l.quote_id = q.id
          ), '[]'::jsonb)
        )
        from public.case001_quotes q
        where q.id = a.quote_id and q.tenant_id = a.tenant_id
      ) as case001_quotes
    from public.case001_approval_requests a
    where a.tenant_id = $1 and a.status = 'pending'
    order by a.requested_at asc
  `, [tenantId()]);
  return result.rows;
}

export async function decideApproval(input: { approvalId: string; decision: "approved" | "rejected"; decidedBy: string; reason?: string }) {
  const tenant = tenantId();

  const quoteId = await withTransaction(async (database) => {
    const approvalResult = await database.query<{ quote_id: string; status: string }>(`
      select quote_id, status
      from public.case001_approval_requests
      where tenant_id = $1 and id = $2
      for update
    `, [tenant, input.approvalId]);
    const approval = approvalResult.rows[0];
    if (!approval) throw new Error("Approval not found.");
    if (approval.status !== "pending") throw new Error("Approval is not pending.");

    await database.query(`
      update public.case001_approval_requests
      set status = $1, decided_at = now(), decided_by = $2, decision_reason = $3
      where tenant_id = $4 and id = $5
    `, [input.decision, input.decidedBy, input.reason ?? null, tenant, input.approvalId]);

    if (input.decision === "rejected") {
      await database.query(`
        update public.case001_quotes
        set status = 'approval_rejected'
        where tenant_id = $1 and id = $2
      `, [tenant, approval.quote_id]);
    }
    return approval.quote_id;
  });

  if (input.decision === "rejected") {
    return { status: "approval_rejected" as const, quoteId };
  }

  const quote = await getQuoteById(quoteId);
  const line = quote?.case001_quote_lines?.[0];
  if (!quote || !line) throw new Error("Quote data is incomplete.");

  const body = [
    `Cotización aprobada: ${line.description}`,
    `Cantidad: ${line.quantity}`,
    `Precio unitario: ${formatMoney(Number(line.quoted_unit_price), quote.currency)}`,
    `Subtotal: ${formatMoney(Number(quote.subtotal), quote.currency)}`,
    `IGV: ${formatMoney(Number(quote.tax_total), quote.currency)}`,
    `Total: ${formatMoney(Number(quote.total), quote.currency)}`,
  ].join("\n");

  const sent = await sendWhatsAppText(quote.customer_phone, body);
  await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: quote.customer_phone, body, quoteId });
  await markQuoteSent(quoteId);
  return { status: "approved_and_sent" as const, quoteId };
}
