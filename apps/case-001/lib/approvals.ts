import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppText } from "./providers";
import { markQuoteSent, persistOutboundMessage, tenantId } from "./store";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);
}

export async function requestQuoteApproval(input: { quoteId: string; reasons: string[] }) {
  const tenant = tenantId();
  const database = db();
  const { data: quote, error: quoteError } = await database
    .from("case001_quotes")
    .select("id")
    .eq("tenant_id", tenant)
    .eq("id", input.quoteId)
    .single();
  if (quoteError) throw quoteError;
  if (!quote) throw new Error("Quote not found for tenant.");

  const { data, error } = await database.from("case001_approval_requests").insert({
    tenant_id: tenant,
    quote_id: input.quoteId,
    reasons: input.reasons,
    status: "pending",
  }).select("id").single();
  if (error) throw error;

  const sellerPhone = process.env.CASE001_SELLER_PHONE;
  if (sellerPhone) {
    const body = `Cotización ${input.quoteId} requiere aprobación. Motivos: ${input.reasons.join(", ")}. Revisa el portal privado para aprobar o rechazar.`;
    await sendWhatsAppText(sellerPhone, body);
  }
  return data.id as string;
}

export async function listPendingApprovals() {
  const { data, error } = await db()
    .from("case001_approval_requests")
    .select("id,status,reasons,requested_at,quote_id,case001_quotes(*,case001_quote_lines(*))")
    .eq("tenant_id", tenantId())
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function decideApproval(input: { approvalId: string; decision: "approved" | "rejected"; decidedBy: string; reason?: string }) {
  const database = db();
  const tenant = tenantId();
  const { data: approval, error } = await database
    .from("case001_approval_requests")
    .select("id,quote_id,status,case001_quotes(*,case001_quote_lines(*))")
    .eq("tenant_id", tenant)
    .eq("id", input.approvalId)
    .single();
  if (error) throw error;
  if (approval.status !== "pending") throw new Error("Approval is not pending.");

  const { error: updateError } = await database.from("case001_approval_requests").update({
    status: input.decision,
    decided_at: new Date().toISOString(),
    decided_by: input.decidedBy,
    decision_reason: input.reason ?? null,
  }).eq("tenant_id", tenant).eq("id", input.approvalId);
  if (updateError) throw updateError;

  const quote = approval.case001_quotes as any;
  if (input.decision === "rejected") {
    const { error: quoteError } = await database
      .from("case001_quotes")
      .update({ status: "approval_rejected" })
      .eq("tenant_id", tenant)
      .eq("id", approval.quote_id);
    if (quoteError) throw quoteError;
    return { status: "approval_rejected" as const, quoteId: approval.quote_id };
  }

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
  await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: quote.customer_phone, body, quoteId: approval.quote_id });
  await markQuoteSent(approval.quote_id);
  return { status: "approved_and_sent" as const, quoteId: approval.quote_id };
}
