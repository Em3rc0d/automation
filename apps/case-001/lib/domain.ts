import Decimal from "decimal.js";
import { z } from "zod";

export const QuoteIntentSchema = z.object({
  intent: z.enum(["quote_request", "quote_revision", "quote_accept", "quote_reject", "other"]),
  quantity: z.number().positive().optional(),
  productReference: z.string().min(1).optional(),
  customerReference: z.string().min(1).optional(),
  requestedDiscountPct: z.number().min(0).max(100).optional(),
  requestedCurrency: z.enum(["PEN", "USD"]).optional(),
  usePreviousQuoteAsReference: z.boolean().default(false),
});
export type QuoteIntent = z.infer<typeof QuoteIntentSchema>;

export const ProductSnapshotSchema = z.object({
  snapshotId: z.string(),
  sku: z.string().min(1),
  description: z.string().min(1),
  stock: z.number().nonnegative(),
  unitOfMeasure: z.string().default("UND"),
  basePrice: z.number().positive().optional(),
  cost: z.number().nonnegative().optional(),
  currency: z.enum(["PEN", "USD"]).optional(),
  importedAt: z.string(),
});
export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;

export const CommercialPolicySchema = z.object({
  defaultCurrency: z.enum(["PEN", "USD"]).default("USD"),
  igvRate: z.number().min(0).max(1).default(0.18),
  maxAutoDiscountPct: z.number().min(0).max(100).default(8),
  minimumMarginPct: z.number().min(0).max(100).default(22),
  quoteValidityDays: z.number().int().positive().default(7),
  sapStaleAfterHours: z.number().positive().default(24),
});
export type CommercialPolicy = z.infer<typeof CommercialPolicySchema>;

export type QuoteCalculationInput = {
  product: ProductSnapshot;
  quantity: number;
  discountPct: number;
  policy: CommercialPolicy;
  requestedCurrency?: "PEN" | "USD";
  fxRate?: number;
  now?: Date;
};

export type QuoteCalculationResult = {
  sku: string;
  description: string;
  quantity: number;
  stockAvailable: number;
  stockSufficient: boolean;
  sourceCurrency: "PEN" | "USD";
  currency: "PEN" | "USD";
  listUnitPrice: number;
  quotedUnitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
  discountPct: number;
  grossMarginPct?: number;
  snapshotAgeHours: number;
  requiresApproval: boolean;
  exceptionCodes: string[];
};

const money = (value: Decimal.Value) => Number(new Decimal(value).toDecimalPlaces(2).toString());

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const { product, quantity, discountPct, policy } = input;
  if (!product.basePrice || !product.currency) {
    throw new Error("SAP snapshot is missing basePrice or currency; authoritative calculation is not possible.");
  }
  if (quantity <= 0) throw new Error("Quantity must be positive.");

  const now = input.now ?? new Date();
  const importedAt = new Date(product.importedAt);
  const snapshotAgeHours = Math.max(0, (now.getTime() - importedAt.getTime()) / 3_600_000);
  const targetCurrency = input.requestedCurrency ?? product.currency;

  let listUnitPrice = new Decimal(product.basePrice);
  let cost = product.cost == null ? undefined : new Decimal(product.cost);

  if (targetCurrency !== product.currency) {
    if (!input.fxRate || input.fxRate <= 0) throw new Error("A positive FX rate is required for currency conversion.");
    const fx = new Decimal(input.fxRate);
    if (product.currency === "USD" && targetCurrency === "PEN") {
      listUnitPrice = listUnitPrice.mul(fx);
      if (cost) cost = cost.mul(fx);
    } else if (product.currency === "PEN" && targetCurrency === "USD") {
      listUnitPrice = listUnitPrice.div(fx);
      if (cost) cost = cost.div(fx);
    }
  }

  const quotedUnitPrice = listUnitPrice.mul(new Decimal(1).minus(new Decimal(discountPct).div(100)));
  const subtotal = quotedUnitPrice.mul(quantity);
  const tax = subtotal.mul(policy.igvRate);
  const total = subtotal.plus(tax);

  let grossMarginPct: number | undefined;
  if (cost) {
    grossMarginPct = Number(quotedUnitPrice.minus(cost).div(quotedUnitPrice).mul(100).toDecimalPlaces(2).toString());
  }

  const exceptionCodes: string[] = [];
  if (quantity > product.stock) exceptionCodes.push("INSUFFICIENT_STOCK");
  if (snapshotAgeHours > policy.sapStaleAfterHours) exceptionCodes.push("STALE_SAP_SNAPSHOT");
  if (discountPct > policy.maxAutoDiscountPct) exceptionCodes.push("DISCOUNT_ABOVE_AUTO_LIMIT");
  if (grossMarginPct != null && grossMarginPct < policy.minimumMarginPct) exceptionCodes.push("MARGIN_BELOW_MINIMUM");
  if (product.cost == null) exceptionCodes.push("MARGIN_NOT_VERIFIABLE");

  return {
    sku: product.sku,
    description: product.description,
    quantity,
    stockAvailable: product.stock,
    stockSufficient: quantity <= product.stock,
    sourceCurrency: product.currency,
    currency: targetCurrency,
    listUnitPrice: money(listUnitPrice),
    quotedUnitPrice: money(quotedUnitPrice),
    subtotal: money(subtotal),
    tax: money(tax),
    total: money(total),
    discountPct,
    grossMarginPct,
    snapshotAgeHours: Number(snapshotAgeHours.toFixed(2)),
    requiresApproval: exceptionCodes.length > 0,
    exceptionCodes,
  };
}

export function defaultPolicyFromEnv(env = process.env): CommercialPolicy {
  return CommercialPolicySchema.parse({
    defaultCurrency: env.DEFAULT_CURRENCY ?? "USD",
    igvRate: Number(env.IGV_RATE ?? 0.18),
    maxAutoDiscountPct: Number(env.MAX_AUTO_DISCOUNT_PCT ?? 8),
    minimumMarginPct: Number(env.MINIMUM_MARGIN_PCT ?? 22),
    quoteValidityDays: Number(env.QUOTE_VALIDITY_DAYS ?? 7),
    sapStaleAfterHours: Number(env.SAP_STALE_AFTER_HOURS ?? 24),
  });
}
