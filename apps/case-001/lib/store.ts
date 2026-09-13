import type { ProductSnapshot, QuoteIntent, QuoteCalculationResult } from "./domain";
import { query, withTransaction } from "./persistence/database";

export function tenantId() {
  return process.env.CASE001_TENANT_ID ?? "case-001-pilot";
}

const quoteWithLinesSql = `
  select q.*,
    coalesce((
      select jsonb_agg(to_jsonb(l) order by l.id)
      from public.case001_quote_lines l
      where l.quote_id = q.id
    ), '[]'::jsonb) as case001_quote_lines
  from public.case001_quotes q
`;

export async function hasInboundMessage(providerMessageId: string): Promise<boolean> {
  const result = await query("select 1 from public.case001_messages where tenant_id = $1 and provider_message_id = $2 limit 1", [tenantId(), providerMessageId]);
  return result.rows.length > 0;
}

export async function persistInboundMessage(input: { providerMessageId: string; phone: string; body: string; receivedAt: string }) {
  const result = await query<{ id: string }>(`
    insert into public.case001_messages (tenant_id, provider_message_id, phone, direction, body, occurred_at)
    values ($1, $2, $3, 'inbound', $4, $5)
    returning id
  `, [tenantId(), input.providerMessageId, input.phone, input.body, input.receivedAt]);
  const row = result.rows[0];
  if (!row) throw new Error("Inbound message insert returned no id.");
  return row.id;
}

export async function persistOutboundMessage(input: { providerMessageId: string; phone: string; body: string; quoteId?: string }) {
  await query(`
    insert into public.case001_messages (tenant_id, provider_message_id, phone, direction, body, quote_id, occurred_at)
    values ($1, $2, $3, 'outbound', $4, $5, now())
  `, [tenantId(), input.providerMessageId, input.phone, input.body, input.quoteId ?? null]);
}

export async function findCustomerByPhone(phone: string) {
  const result = await query<any>("select * from public.case001_customers where tenant_id = $1 and whatsapp_phone = $2 limit 1", [tenantId(), phone]);
  return result.rows[0] ?? null;
}

export async function findProduct(reference: string): Promise<ProductSnapshot | null> {
  const value = reference.trim();
  if (!value) return null;
  const tenant = tenantId();

  let result = await query<any>(`
    select snapshot_id, sku, description, stock, unit_of_measure, base_price, cost, currency, imported_at
    from public.case001_product_snapshot_latest
    where tenant_id = $1 and lower(sku) = lower($2)
    limit 2
  `, [tenant, value]);

  if (result.rows.length === 0) {
    result = await query<any>(`
      select snapshot_id, sku, description, stock, unit_of_measure, base_price, cost, currency, imported_at
      from public.case001_product_snapshot_latest
      where tenant_id = $1 and description ilike ('%' || $2 || '%')
      limit 2
    `, [tenant, value]);
  }

  if (result.rows.length !== 1) return null;
  const product = result.rows[0];
  return {
    snapshotId: String(product.snapshot_id),
    sku: String(product.sku),
    description: String(product.description),
    stock: Number(product.stock),
    unitOfMeasure: product.unit_of_measure ? String(product.unit_of_measure) : "UND",
    basePrice: product.base_price == null ? undefined : Number(product.base_price),
    cost: product.cost == null ? undefined : Number(product.cost),
    currency: product.currency === "PEN" || product.currency === "USD" ? product.currency : undefined,
    importedAt: new Date(product.imported_at).toISOString(),
  };
}

export async function lastReferenceQuote(phone: string) {
  const result = await query<any>(`${quoteWithLinesSql}
    where q.tenant_id = $1 and q.customer_phone = $2 and q.status = any($3::text[])
    order by q.created_at desc
    limit 1
  `, [tenantId(), phone, ["sent", "accepted", "revised"]]);
  return result.rows[0] ?? null;
}

export async function lastOpenQuote(phone: string) {
  const result = await query<any>(`${quoteWithLinesSql}
    where q.tenant_id = $1 and q.customer_phone = $2 and q.status = 'sent'
    order by q.created_at desc
    limit 1
  `, [tenantId(), phone]);
  return result.rows[0] ?? null;
}

export async function createQuote(input: {
  phone: string;
  intent: QuoteIntent;
  calculation: QuoteCalculationResult;
  sourceSnapshotId: string;
  parentQuoteId?: string;
  version?: number;
}) {
  return withTransaction(async (database) => {
    const quoteResult = await database.query<{ id: string }>(`
      insert into public.case001_quotes (
        tenant_id, customer_phone, parent_quote_id, version, status, currency,
        subtotal, tax_total, total, discount_pct, requires_approval, exception_codes, source_intent
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
      returning id
    `, [
      tenantId(),
      input.phone,
      input.parentQuoteId ?? null,
      input.version ?? 1,
      input.calculation.requiresApproval ? "awaiting_approval" : "draft",
      input.calculation.currency,
      input.calculation.subtotal,
      input.calculation.tax,
      input.calculation.total,
      input.calculation.discountPct,
      input.calculation.requiresApproval,
      input.calculation.exceptionCodes,
      JSON.stringify(input.intent),
    ]);
    const quote = quoteResult.rows[0];
    if (!quote) throw new Error("Quote insert returned no id.");

    await database.query(`
      insert into public.case001_quote_lines (
        quote_id, snapshot_id, source_type, sku, description, quantity,
        list_unit_price, quoted_unit_price, discount_pct
      ) values ($1, $2, 'SAP_SNAPSHOT', $3, $4, $5, $6, $7, $8)
    `, [
      quote.id,
      input.sourceSnapshotId,
      input.calculation.sku,
      input.calculation.description,
      input.calculation.quantity,
      input.calculation.listUnitPrice,
      input.calculation.quotedUnitPrice,
      input.calculation.discountPct,
    ]);
    return quote.id;
  });
}

export async function markQuoteSent(quoteId: string) {
  const tenant = tenantId();
  await withTransaction(async (database) => {
    const quoteResult = await database.query<{ id: string; parent_quote_id: string | null }>(`
      select id, parent_quote_id
      from public.case001_quotes
      where tenant_id = $1 and id = $2
      for update
    `, [tenant, quoteId]);
    const quote = quoteResult.rows[0];
    if (!quote) throw new Error("Quote not found for tenant.");

    await database.query(`
      update public.case001_quotes
      set status = 'sent', sent_at = now()
      where tenant_id = $1 and id = $2
    `, [tenant, quoteId]);

    if (quote.parent_quote_id) {
      await database.query(`
        update public.case001_quotes
        set status = 'revised'
        where tenant_id = $1 and id = $2 and status = 'sent'
      `, [tenant, quote.parent_quote_id]);
    }
  });
}

export async function setQuoteTerminalByPhone(phone: string, status: "accepted" | "rejected") {
  const previous = await lastOpenQuote(phone);
  if (!previous) return null;
  const timestampColumn = status === "accepted" ? "accepted_at" : "rejected_at";
  await query(`
    update public.case001_quotes
    set status = $1, ${timestampColumn} = now()
    where tenant_id = $2 and id = $3
  `, [status, tenantId(), previous.id]);
  return String(previous.id);
}

export async function getQuoteById(quoteId: string) {
  const result = await query<any>(`${quoteWithLinesSql}
    where q.tenant_id = $1 and q.id = $2
    limit 1
  `, [tenantId(), quoteId]);
  return result.rows[0] ?? null;
}
