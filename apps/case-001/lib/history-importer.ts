import * as XLSX from "xlsx";
import { tenantId } from "./store";
import { query, withTransaction } from "./persistence/database";

type HistoricalLine = {
  quoteRef: string;
  quoteDate: string;
  customerPhone: string;
  customerName?: string;
  companyName?: string;
  customerType?: "B2B" | "B2C";
  currency: "PEN" | "USD";
  subtotal: number;
  taxTotal: number;
  total: number;
  discountPct: number;
  status: "sent" | "accepted" | "rejected";
  sku: string;
  description: string;
  quantity: number;
  listUnitPrice: number;
  quotedUnitPrice: number;
};

const normalized = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => Number(value);

function parseStatus(value: unknown): HistoricalLine["status"] | null {
  const v = normalized(value).toLowerCase();
  if (["sent", "enviada", "enviado"].includes(v)) return "sent";
  if (["accepted", "aceptada", "aceptado"].includes(v)) return "accepted";
  if (["rejected", "rechazada", "rechazado"].includes(v)) return "rejected";
  return null;
}

export function parseHistoricalWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const first = workbook.Sheets[workbook.SheetNames[0]];
  if (!first) throw new Error("Workbook contains no sheets.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(first, { defval: null });
  const accepted: HistoricalLine[] = [];
  const rejected: Array<{ row: number; reason: string }> = [];

  rows.forEach((row, index) => {
    const quoteRef = normalized(row.quote_ref);
    const phone = normalized(row.customer_phone);
    const sku = normalized(row.sku);
    const description = normalized(row.description);
    const rawDate = row.quote_date;
    const date = rawDate instanceof Date ? rawDate : new Date(normalized(rawDate));
    const currency = normalized(row.currency).toUpperCase();
    const status = parseStatus(row.status);
    const customerType = normalized(row.customer_type).toUpperCase();
    const quantity = number(row.quantity);
    const listUnitPrice = number(row.list_unit_price);
    const quotedUnitPrice = number(row.quoted_unit_price);
    const subtotal = number(row.subtotal);
    const taxTotal = number(row.tax_total);
    const total = number(row.total);
    const discountPct = row.discount_pct == null || row.discount_pct === "" ? 0 : number(row.discount_pct);

    const invalid =
      !quoteRef || !phone || !sku || !description || Number.isNaN(date.getTime()) ||
      (currency !== "PEN" && currency !== "USD") || !status ||
      !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(listUnitPrice) || listUnitPrice < 0 ||
      !Number.isFinite(quotedUnitPrice) || quotedUnitPrice < 0 ||
      !Number.isFinite(subtotal) || subtotal < 0 ||
      !Number.isFinite(taxTotal) || taxTotal < 0 ||
      !Number.isFinite(total) || total < 0 ||
      !Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100;

    if (invalid) {
      rejected.push({ row: index + 2, reason: "Missing or invalid canonical historical quote fields" });
      return;
    }

    accepted.push({
      quoteRef,
      quoteDate: date.toISOString(),
      customerPhone: phone,
      customerName: normalized(row.customer_name) || undefined,
      companyName: normalized(row.company_name) || undefined,
      customerType: customerType === "B2B" || customerType === "B2C" ? customerType : undefined,
      currency: currency as "PEN" | "USD",
      subtotal,
      taxTotal,
      total,
      discountPct,
      status,
      sku,
      description,
      quantity,
      listUnitPrice,
      quotedUnitPrice,
    });
  });

  return { accepted, rejected, total: rows.length };
}

export async function persistHistoricalQuotes(lines: HistoricalLine[]) {
  const tenant = tenantId();
  const grouped = new Map<string, HistoricalLine[]>();
  for (const line of lines) grouped.set(line.quoteRef, [...(grouped.get(line.quoteRef) ?? []), line]);

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ quoteRef: string; reason: string }> = [];

  for (const [quoteRef, quoteLines] of grouped) {
    const head = quoteLines[0];
    if (!head) continue;
    const consistent = quoteLines.every((line) =>
      line.customerPhone === head.customerPhone && line.currency === head.currency && line.status === head.status &&
      line.subtotal === head.subtotal && line.taxTotal === head.taxTotal && line.total === head.total
    );
    if (!consistent) {
      errors.push({ quoteRef, reason: "Inconsistent quote-level values across lines" });
      continue;
    }

    const existing = await query("select id from public.case001_quotes where tenant_id = $1 and source_kind = 'HISTORICAL_IMPORT' and external_ref = $2 limit 1", [tenant, quoteRef]);
    if (existing.rows[0]) {
      skipped += 1;
      continue;
    }

    try {
      await withTransaction(async (database) => {
        // Historical quote terms are reference context only. Importing one old quote must not
        // silently promote its discount to the customer's current usual/authorized discount.
        await database.query(`
          insert into public.case001_customers (
            tenant_id, whatsapp_phone, name, company_name, customer_type,
            preferred_currency, updated_at
          ) values ($1, $2, $3, $4, $5, $6, now())
          on conflict (tenant_id, whatsapp_phone) do update set
            name = coalesce(excluded.name, public.case001_customers.name),
            company_name = coalesce(excluded.company_name, public.case001_customers.company_name),
            customer_type = coalesce(excluded.customer_type, public.case001_customers.customer_type),
            preferred_currency = excluded.preferred_currency,
            updated_at = now()
        `, [tenant, head.customerPhone, head.customerName ?? null, head.companyName ?? null, head.customerType ?? null, head.currency]);

        const quoteResult = await database.query<{ id: string }>(`
          insert into public.case001_quotes (
            tenant_id, customer_phone, status, currency, subtotal, tax_total, total,
            discount_pct, requires_approval, source_intent, source_kind, external_ref,
            source_observed_at, created_at, sent_at, accepted_at, rejected_at
          ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, false, $9::jsonb,
            'HISTORICAL_IMPORT', $10, $11, $11, $11, $12, $13
          )
          returning id
        `, [
          tenant,
          head.customerPhone,
          head.status,
          head.currency,
          head.subtotal,
          head.taxTotal,
          head.total,
          head.discountPct,
          JSON.stringify({ intent: "historical_import" }),
          quoteRef,
          head.quoteDate,
          head.status === "accepted" ? head.quoteDate : null,
          head.status === "rejected" ? head.quoteDate : null,
        ]);
        const quote = quoteResult.rows[0];
        if (!quote) throw new Error("Historical quote insert returned no id.");

        await database.query(`
          insert into public.case001_quote_lines (
            quote_id, snapshot_id, source_type, sku, description, quantity,
            list_unit_price, quoted_unit_price, discount_pct
          )
          select $1, null, 'HISTORICAL_QUOTE_IMPORT', r.sku, r.description, r.quantity,
            r.list_unit_price, r.quoted_unit_price, r.discount_pct
          from jsonb_to_recordset($2::jsonb) as r(
            sku text,
            description text,
            quantity numeric,
            list_unit_price numeric,
            quoted_unit_price numeric,
            discount_pct numeric
          )
        `, [quote.id, JSON.stringify(quoteLines.map((line) => ({
          sku: line.sku,
          description: line.description,
          quantity: line.quantity,
          list_unit_price: line.listUnitPrice,
          quoted_unit_price: line.quotedUnitPrice,
          discount_pct: line.discountPct,
        })))]);
      });
      imported += 1;
    } catch (error) {
      errors.push({ quoteRef, reason: error instanceof Error ? error.message : "historical_import_failed" });
    }
  }

  return { imported, skipped, errors };
}
