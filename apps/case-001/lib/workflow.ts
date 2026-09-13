import { requestQuoteApproval } from "./approvals";
import { calculateQuote, defaultPolicyFromEnv } from "./domain";
import { interpretWhatsAppMessage, sendWhatsAppText } from "./providers";
import {
  createQuote,
  findCustomerByPhone,
  findProduct,
  hasInboundMessage,
  lastOpenQuote,
  lastReferenceQuote,
  markQuoteSent,
  persistInboundMessage,
  persistOutboundMessage,
  setQuoteTerminalByPhone,
} from "./store";

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(value);
}

function quoteText(result: ReturnType<typeof calculateQuote>) {
  return [
    `Cotización preparada: ${result.description}`,
    `Cantidad: ${result.quantity}`,
    `Precio unitario: ${formatMoney(result.quotedUnitPrice, result.currency)}`,
    `Subtotal: ${formatMoney(result.subtotal, result.currency)}`,
    `IGV: ${formatMoney(result.tax, result.currency)}`,
    `Total: ${formatMoney(result.total, result.currency)}`,
    `Stock según último snapshot SAP: ${result.stockAvailable}`,
  ].join("\n");
}

export async function processInboundMessage(input: {
  providerMessageId: string;
  from: string;
  text: string;
  receivedAt: string;
}) {
  if (await hasInboundMessage(input.providerMessageId)) return { status: "duplicate" as const };
  await persistInboundMessage({ providerMessageId: input.providerMessageId, phone: input.from, body: input.text, receivedAt: input.receivedAt });

  const intent = await interpretWhatsAppMessage(input.text);
  if (intent.intent === "quote_accept" || intent.intent === "quote_reject") {
    const terminal = intent.intent === "quote_accept" ? "accepted" : "rejected";
    const quoteId = await setQuoteTerminalByPhone(input.from, terminal);
    const body = quoteId
      ? terminal === "accepted"
        ? "Perfecto. Registré la aceptación de la cotización."
        : "Entendido. Registré que esta cotización no continúa."
      : "No encontré una cotización activa asociada a este número.";
    const sent = await sendWhatsAppText(input.from, body);
    await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: input.from, body, quoteId: quoteId ?? undefined });
    return { status: terminal, quoteId };
  }

  const activeQuote = intent.intent === "quote_revision" ? await lastOpenQuote(input.from) : null;
  const referenceQuote = intent.usePreviousQuoteAsReference || intent.intent === "quote_revision"
    ? activeQuote ?? await lastReferenceQuote(input.from)
    : null;
  const referenceLine = referenceQuote?.case001_quote_lines?.[0];

  const quantity = intent.quantity ?? (intent.intent === "quote_revision" ? Number(referenceLine?.quantity) || undefined : undefined);
  if (!quantity) return { status: "needs_human", reason: "MISSING_QUANTITY" as const };

  const customer = await findCustomerByPhone(input.from);
  const productReference = intent.productReference ?? referenceLine?.sku;
  if (!productReference) return { status: "needs_human", reason: "MISSING_PRODUCT_REFERENCE" as const };

  let product = await findProduct(productReference);
  if (!product && referenceLine?.sku) product = await findProduct(referenceLine.sku);
  if (!product) return { status: "needs_human", reason: "PRODUCT_AMBIGUOUS_OR_NOT_FOUND" as const };

  const requestedDiscountPct = intent.requestedDiscountPct ?? customer?.usual_discount_pct ?? referenceQuote?.discount_pct ?? 0;
  const requestedCurrency = intent.requestedCurrency ?? customer?.preferred_currency ?? referenceQuote?.currency ?? product.currency;
  const fxRate = requestedCurrency && product.currency && requestedCurrency !== product.currency
    ? Number(process.env.CASE001_FIXED_FX_RATE || 0) || undefined
    : undefined;

  const calculation = calculateQuote({
    product,
    quantity,
    discountPct: Number(requestedDiscountPct),
    requestedCurrency,
    fxRate,
    policy: defaultPolicyFromEnv(),
  });

  const parentQuoteId = intent.intent === "quote_revision" && activeQuote ? String(activeQuote.id) : undefined;
  const version = parentQuoteId ? Number(activeQuote?.version ?? 1) + 1 : 1;
  const quoteId = await createQuote({
    phone: input.from,
    intent,
    calculation,
    sourceSnapshotId: product.snapshotId,
    parentQuoteId,
    version,
  });

  if (calculation.requiresApproval) {
    const approvalId = await requestQuoteApproval({ quoteId, reasons: calculation.exceptionCodes });
    return {
      status: "awaiting_approval" as const,
      quoteId,
      approvalId,
      exceptions: calculation.exceptionCodes,
      calculation,
    };
  }

  const body = quoteText(calculation);
  const sent = await sendWhatsAppText(input.from, body);
  await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: input.from, body, quoteId });
  await markQuoteSent(quoteId);
  return { status: "sent" as const, quoteId, version, calculation };
}
