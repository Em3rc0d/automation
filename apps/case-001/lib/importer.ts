import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { tenantId } from "./store";

const aliases = {
  sku: ["sku", "codigo", "código", "material", "material_code"],
  description: ["description", "descripcion", "descripción", "material_description"],
  stock: ["stock", "available_stock", "disponible", "qty", "cantidad"],
  unitOfMeasure: ["uom", "unidad", "unidad_medida", "unit"],
  basePrice: ["base_price", "precio", "precio_base", "price", "netpr"],
  cost: ["cost", "costo", "costo_unitario"],
  currency: ["currency", "moneda", "waers"],
} as const;

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function pick(row: Record<string, unknown>, candidates: readonly string[]) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const hit = entries.find(([key]) => normalizeKey(key) === candidate);
    if (hit && hit[1] !== "" && hit[1] != null) return hit[1];
  }
  return undefined;
}

function optionalNumber(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function parseSapWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const first = workbook.Sheets[workbook.SheetNames[0]];
  if (!first) throw new Error("Workbook contains no sheets.");
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(first, { defval: null });

  const accepted: Array<Record<string, unknown>> = [];
  const rejected: Array<{ row: number; reason: string }> = [];

  rows.forEach((row, index) => {
    const sku = String(pick(row, aliases.sku) ?? "").trim();
    const description = String(pick(row, aliases.description) ?? "").trim();
    const stock = Number(pick(row, aliases.stock));
    const basePrice = optionalNumber(pick(row, aliases.basePrice));
    const cost = optionalNumber(pick(row, aliases.cost));
    const currencySource = pick(row, aliases.currency);
    const currencyRaw = String(currencySource ?? "").trim().toUpperCase();

    if (!sku || !description || !Number.isFinite(stock) || stock < 0) {
      rejected.push({ row: index + 2, reason: "Missing/invalid SKU, description or stock" });
      return;
    }
    if (Number.isNaN(basePrice) || (basePrice != null && basePrice <= 0)) {
      rejected.push({ row: index + 2, reason: "Invalid base price" });
      return;
    }
    if (Number.isNaN(cost) || (cost != null && cost < 0)) {
      rejected.push({ row: index + 2, reason: "Invalid cost" });
      return;
    }
    if (currencySource != null && currencyRaw !== "PEN" && currencyRaw !== "USD") {
      rejected.push({ row: index + 2, reason: "Unsupported currency; expected PEN or USD" });
      return;
    }

    accepted.push({
      sku,
      description,
      stock,
      unit_of_measure: String(pick(row, aliases.unitOfMeasure) ?? "UND").trim() || "UND",
      base_price: basePrice,
      cost,
      currency: currencyRaw === "PEN" || currencyRaw === "USD" ? currencyRaw : null,
    });
  });

  return { accepted, rejected, total: rows.length };
}

export async function persistSapSnapshot(input: {
  fileName: string;
  fileSha256: string;
  rows: Array<Record<string, unknown>>;
}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const tenant = tenantId();

  const { data: existing, error: existingError } = await db
    .from("case001_sap_snapshots")
    .select("id,imported_at")
    .eq("tenant_id", tenant)
    .eq("file_sha256", input.fileSha256)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    return { snapshotId: existing.id as string, importedAt: existing.imported_at as string, duplicate: true };
  }

  const { data: snapshot, error } = await db.from("case001_sap_snapshots").insert({
    tenant_id: tenant,
    source_file_name: input.fileName,
    file_sha256: input.fileSha256,
    imported_at: new Date().toISOString(),
  }).select("id,imported_at").single();
  if (error) throw error;

  const payload = input.rows.map((row) => ({
    ...row,
    tenant_id: tenant,
    snapshot_id: snapshot.id,
    imported_at: snapshot.imported_at,
  }));

  try {
    if (payload.length) {
      const { error: rowsError } = await db.from("case001_product_snapshots").insert(payload);
      if (rowsError) throw rowsError;
    }
  } catch (error) {
    await db.from("case001_sap_snapshots").delete().eq("tenant_id", tenant).eq("id", snapshot.id);
    throw error;
  }

  return { snapshotId: snapshot.id as string, importedAt: snapshot.imported_at as string, duplicate: false };
}
