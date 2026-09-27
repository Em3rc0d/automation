import * as XLSX from "xlsx";
import { tenantId } from "./store";
import { query, withTransaction } from "./persistence/database";

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
  const tenant = tenantId();
  const existing = await query<{ id: string; imported_at: Date | string }>(`
    select id, imported_at
    from public.case001_sap_snapshots
    where tenant_id = $1 and file_sha256 = $2
    limit 1
  `, [tenant, input.fileSha256]);
  const found = existing.rows[0];
  if (found) {
    return { snapshotId: found.id, importedAt: new Date(found.imported_at).toISOString(), duplicate: true };
  }

  return withTransaction(async (database) => {
    const snapshotResult = await database.query<{ id: string; imported_at: Date | string }>(`
      insert into public.case001_sap_snapshots (tenant_id, source_file_name, file_sha256, imported_at)
      values ($1, $2, $3, now())
      returning id, imported_at
    `, [tenant, input.fileName, input.fileSha256]);
    const snapshot = snapshotResult.rows[0];
    if (!snapshot) throw new Error("SAP snapshot insert returned no row.");

    if (input.rows.length) {
      await database.query(`
        insert into public.case001_product_snapshots (
          tenant_id, snapshot_id, sku, description, stock, unit_of_measure,
          base_price, cost, currency, imported_at
        )
        select $1, $2, r.sku, r.description, r.stock, r.unit_of_measure,
          r.base_price, r.cost, r.currency, $3
        from jsonb_to_recordset($4::jsonb) as r(
          sku text,
          description text,
          stock numeric,
          unit_of_measure text,
          base_price numeric,
          cost numeric,
          currency text
        )
      `, [tenant, snapshot.id, snapshot.imported_at, JSON.stringify(input.rows)]);
    }

    return {
      snapshotId: snapshot.id,
      importedAt: new Date(snapshot.imported_at).toISOString(),
      duplicate: false,
    };
  });
}
