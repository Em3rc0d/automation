import { describe, expect, it } from "vitest";
import { calculateQuote, type CommercialPolicy, type ProductSnapshot } from "../lib/domain";

const policy: CommercialPolicy = {
  defaultCurrency: "USD",
  igvRate: 0.18,
  maxAutoDiscountPct: 8,
  minimumMarginPct: 22,
  quoteValidityDays: 7,
  sapStaleAfterHours: 24,
};

const product: ProductSnapshot = {
  snapshotId: "s1",
  sku: "EPOX-7000-GRIS",
  description: "Epóxico Industrial 7000 Gris",
  stock: 84,
  unitOfMeasure: "GAL",
  basePrice: 100,
  cost: 65,
  currency: "USD",
  importedAt: "2026-09-12T12:00:00.000Z",
};

describe("calculateQuote", () => {
  it("calculates discount, IGV and total deterministically", () => {
    const result = calculateQuote({ product, quantity: 50, discountPct: 8, policy, now: new Date("2026-09-12T13:00:00Z") });
    expect(result.quotedUnitPrice).toBe(92);
    expect(result.subtotal).toBe(4600);
    expect(result.tax).toBe(828);
    expect(result.total).toBe(5428);
    expect(result.requiresApproval).toBe(false);
  });

  it("requires approval above the automatic discount limit", () => {
    const result = calculateQuote({ product, quantity: 50, discountPct: 12, policy, now: new Date("2026-09-12T13:00:00Z") });
    expect(result.exceptionCodes).toContain("DISCOUNT_ABOVE_AUTO_LIMIT");
    expect(result.requiresApproval).toBe(true);
  });

  it("requires approval if stock is insufficient", () => {
    const result = calculateQuote({ product, quantity: 100, discountPct: 8, policy, now: new Date("2026-09-12T13:00:00Z") });
    expect(result.exceptionCodes).toContain("INSUFFICIENT_STOCK");
  });

  it("refuses currency conversion without an FX rate", () => {
    expect(() => calculateQuote({ product, quantity: 10, discountPct: 0, policy, requestedCurrency: "PEN" })).toThrow(/FX rate/);
  });
});
