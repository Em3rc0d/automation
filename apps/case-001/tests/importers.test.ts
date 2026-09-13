import { describe, expect, it } from "vitest";
import { parseSapWorkbook } from "../lib/importer";
import { parseHistoricalWorkbook } from "../lib/history-importer";

function csvBuffer(value: string) {
  return new TextEncoder().encode(value).buffer;
}

describe("parseSapWorkbook", () => {
  it("normalizes a valid SAP-like CSV", () => {
    const parsed = parseSapWorkbook(csvBuffer([
      "codigo,descripcion,stock,unidad,precio,costo,moneda",
      "EPOX-1,Epoxico Gris,12,GAL,100,65,USD",
    ].join("\n")));
    expect(parsed.rejected).toHaveLength(0);
    expect(parsed.accepted).toHaveLength(1);
    expect(parsed.accepted[0]).toMatchObject({ sku: "EPOX-1", stock: 12, base_price: 100, cost: 65, currency: "USD" });
  });

  it("rejects malformed optional commercial numbers instead of persisting NaN", () => {
    const parsed = parseSapWorkbook(csvBuffer([
      "codigo,descripcion,stock,unidad,precio,costo,moneda",
      "EPOX-1,Epoxico Gris,12,GAL,no-es-numero,65,USD",
    ].join("\n")));
    expect(parsed.accepted).toHaveLength(0);
    expect(parsed.rejected[0]?.reason).toMatch(/base price/i);
  });

  it("allows missing price/cost because the quote engine will safely escalate unavailable authority", () => {
    const parsed = parseSapWorkbook(csvBuffer([
      "codigo,descripcion,stock,unidad,precio,costo,moneda",
      "EPOX-1,Epoxico Gris,12,GAL,,,",
    ].join("\n")));
    expect(parsed.accepted).toHaveLength(1);
    expect(parsed.accepted[0]).toMatchObject({ base_price: null, cost: null, currency: null });
  });
});

describe("parseHistoricalWorkbook", () => {
  it("accepts canonical historical quote rows", () => {
    const parsed = parseHistoricalWorkbook(csvBuffer([
      "quote_ref,quote_date,customer_phone,customer_name,company_name,customer_type,currency,subtotal,tax_total,total,discount_pct,status,sku,description,quantity,list_unit_price,quoted_unit_price",
      "Q-1,2026-08-20T15:00:00-05:00,51999900001,Cliente,Empresa SAC,B2B,USD,920,165.6,1085.6,8,accepted,EPOX-1,Epoxico Gris,10,100,92",
    ].join("\n")));
    expect(parsed.rejected).toHaveLength(0);
    expect(parsed.accepted[0]).toMatchObject({ quoteRef: "Q-1", customerPhone: "51999900001", status: "accepted", currency: "USD" });
  });

  it("rejects incomplete historical rows", () => {
    const parsed = parseHistoricalWorkbook(csvBuffer([
      "quote_ref,quote_date,customer_phone,currency,subtotal,tax_total,total,status,sku,description,quantity,list_unit_price,quoted_unit_price",
      "Q-1,bad-date,51999900001,USD,920,165.6,1085.6,accepted,EPOX-1,Epoxico Gris,10,100,92",
    ].join("\n")));
    expect(parsed.accepted).toHaveLength(0);
    expect(parsed.rejected).toHaveLength(1);
  });
});
