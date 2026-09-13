import { createClient } from "@supabase/supabase-js";
import type { ProductSnapshot, QuoteIntent, QuoteCalculationResult } from "./domain";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function hasInboundMessage(providerMessageId: string): Promise<boolean> {
  const { data, error } = await client().from("case001_messages").select("id").eq("provider_message_id", providerMessageId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function persistInboundMessage(input: { providerMessageId: string; phone: string; body: string; receivedAt: string }) {
  const { data, error } = await client().from("case001_messages").insert({
    tenant_id: process.env.CASE001_TENANT_ID ?? "case-001-pilot",
    provider_message_id: input.providerMessageId,
    phone: input.phone,
    direction: "inbound",
    body: input.body,
    occurred_at: input.receivedAt,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function persistOutboundMessage(input: { providerMessageId: string; phone: string; body: string; quoteId?: string }) {
  const { error } = await client().from("case001_messages").insert({
    tenant_id: process.env.CASE001_TENANT_ID ?? "case-001-pilot",
    provider_message_id: input.providerMessageId,
    phone: input.phone,
    direction: "outbound",
    body: input.body,
    quote_id: input.quoteId ?? null,
    occurred_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function findCustomerByPhone(phone: string) {
  const { data, error } = await client().from("case001_customers").select("*").eq("whatsapp_phone", phone).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findProduct(reference: string): Promise<ProductSnapshot | null> {
  const q = reference.trim();
  const { data, error } = await client()
    .from("case001_product_snapshot_latest")
    .select("snapshot_id,sku,description,stock,unit_of_measure,base_price,cost,currency,imported_at")
    .or(`sku.ilike.%${q.replaceAll(",", " ")}%,description.ilike.%${q.replaceAll(",", " ")}%`)
    .limit(2);
  if (error) throw error;
  if (!data || data.length !== 1) return null;
  const p = data[0];
  return {
    snapshotId: p.snapshot_id,
    sku: p.sku,
    description: p.description,
    stock: Number(p.stock),
    unitOfMeasure: p.unit_of_measure ?? "UND",
    basePrice: p.base_price == null ? undefined : Number(p.base_price),
    cost: p.cost == null ? undefined : Number(p.cost),
    currency: p.currency ?? undefined,
    importedAt: p.imported_at,
  };
}

export async function lastAcceptedOrSentQuote(phone: string) {
  const { data, error } = await client()
    .from("case001_quotes")
    .select("*,case001_quote_lines(*)")
    .eq("customer_phone", phone)
    .in("status", ["sent", "accepted", "revised"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createQuote(input: { phone: string; intent: QuoteIntent; calculation: QuoteCalculationResult; sourceSnapshotId: string }) {
  const db = client();
  const { data: quote, error } = await db.from("case001_quotes").insert({
    tenant_id: process.env.CASE001_TENANT_ID ?? "case-001-pilot",
    customer_phone: input.phone,
    status: input.calculation.requiresApproval ? "awaiting_approval" : "draft",
    currency: input.calculation.currency,
    subtotal: input.calculation.subtotal,
    tax_total: input.calculation.tax,
    total: input.calculation.total,
    discount_pct: input.calculation.discountPct,
    requires_approval: input.calculation.requiresApproval,
    exception_codes: input.calculation.exceptionCodes,
    source_intent: input.intent,
  }).select("id").single();
  if (error) throw error;

  const { error: lineError } = await db.from("case001_quote_lines").insert({
    quote_id: quote.id,
    snapshot_id: input.sourceSnapshotId,
    sku: input.calculation.sku,
    description: input.calculation.description,
    quantity: input.calculation.quantity,
    list_unit_price: input.calculation.listUnitPrice,
    quoted_unit_price: input.calculation.quotedUnitPrice,
    discount_pct: input.calculation.discountPct,
  });
  if (lineError) throw lineError;
  return quote.id as string;
}

export async function markQuoteSent(quoteId: string) {
  const { error } = await client().from("case001_quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", quoteId);
  if (error) throw error;
}

export async function setQuoteTerminalByPhone(phone: string, status: "accepted" | "rejected") {
  const previous = await lastAcceptedOrSentQuote(phone);
  if (!previous) return null;
  const patch = status === "accepted" ? { status, accepted_at: new Date().toISOString() } : { status, rejected_at: new Date().toISOString() };
  const { error } = await client().from("case001_quotes").update(patch).eq("id", previous.id);
  if (error) throw error;
  return previous.id as string;
}
