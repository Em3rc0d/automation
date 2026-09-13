import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { tenantId } from "./store";

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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const db = createClient(url, key, { auth: { persistSession: false } });
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

    const { data: existing, error: existingError } = await db
      .from("case001_quotes")
      .select("id")
      .eq("tenant_id", tenant)
      .eq("source_kind", "HISTORICAL_IMPORT")
      .eq("external_ref", quoteRef)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      skipped += 1;
      continue;
    }

    const { error: customerError } = await db.from("case001_customers").upsert({
      tenant_id: tenant,
      whatsapp_phone: head.customerPhone,
      name: head.customerName ?? null,
      company_name: head.companyName ?? null,
      customer_type: head.customerType ?? null,
      preferred_currency: head.currency,
      usual_discount_pct: head.discountPct,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,whatsapp_phone" });
    if (customerError) throw customerError;

    const timestamps = {
      sent_at: head.quoteDate,
      accepted_at: head.status === "accepted" ? head.quoteDate : null,
      rejected_at: head.status === "rejected" ? head.quoteDate : null,
    };
    const { data: quote, error: quoteError } = await db.from("case001_quotes").insert({
      tenant_id: tenant,
      customer_phone: head.customerPhone,
      status: head.status,
      currency: head.currency,
      subtotal: head.subtotal,
      tax_total: head.taxTotal,
      total: head.total,
      discount_pct: head.discountPct,
      requires_approval: false,
      source_intent: { intent: "historical_import" },
      source_kind: "HISTORICAL_IMPORT",
      external_ref: quoteRef,
      source_observed_at: head.quoteDate,
      created_at: head.quoteDate,
      ...timestamps,
    }).select("id").single();
    if (quoteError) throw quoteError;

    const payload = quoteLines.map((line) => ({
      quote_id: quote.id,
      snapshot_id: null,
      source_type: "HISTORICAL_QUOTE_IMPORT",
      sku: line.sku,
      description: line.description,
      quantity: line.quantity,
      list_unit_price: line.listUnitPrice,
      quoted_unit_price: line.quotedUnitPrice,
      discount_pct: line.discountPct,
    }));
    const { error: lineError } = await db.from("case001_quote_lines").insert(payload);
    if (lineError) {
      await db.from("case001_quotes").delete().eq("tenant_id", tenant).eq("id", quote.id);
      throw lineError;
    }
    imported += 1;
  }

  return { imported, skipped, errors };
}
