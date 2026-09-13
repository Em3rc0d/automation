import { calculateQuote, defaultPolicyFromEnv } from "./domain";
import { interpretWhatsAppMessage, sendWhatsAppText } from "./providers";
import { requestQuoteApproval } from "./approvals";
import {
  createQuote,
  findCustomerByPhone,
  findProduct,
  hasInboundMessage,
  lastAcceptedOrSentQuote,
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
      ? terminal === "accepted" ? "Perfecto. Registré la aceptación de la cotización." : "Entendido. Registré que esta cotización no continúa."
      : "No encontré una cotización activa asociada a este número.";
    const sent = await sendWhatsAppText(input.from, body);
    await persistOutboundMessage({ providerMessageId: sent.providerMessageId, phone: input.from, body, quoteId: quoteId ?? undefined });
    return { status: terminal, quoteId };
  }

  if (!intent.quantity) return { status: "needs_human", reason: "MISSING_QUANTITY" as const };

  const customer = await findCustomerByPhone(input.from);
  const previous = intent.usePreviousQuoteAsReference ? await lastAcceptedOrSentQuote(input.from) : null;
  const productReference = intent.productReference ?? previous?.case001_quote_lines?.[0]?.sku;
  if (!productReference) return { status: "needs_human", reason: "MISSING_PRODUCT_REFERENCE" as const };

  let product = await findProduct(productReference);
  if (!product && previous?.case001_quote_lines?.[0]?.sku) product = await findProduct(previous.case001_quote_lines[0].sku);
  if (!product) return { status: "needs_human", reason: "PRODUCT_AMBIGUOUS_OR_NOT_FOUND" as const };

  const requestedDiscountPct = intent.requestedDiscountPct ?? customer?.usual_discount_pct ?? previous?.discount_pct ?? 0;
  const requestedCurrency = intent.requestedCurrency ?? customer?.preferred_currency ?? previous?.currency ?? product.currency;
  const fxRate = requestedCurrency && product.currency && requestedCurrency !== product.currency
    ? Number(process.env.CASE001_FIXED_FX_RATE || 0) || undefined
    : undefined;

  const calculation = calculateQuote({
    product,
    quantity: intent.quantity,
    discountPct: Number(requestedDiscountPct),
    requestedCurrency,
    fxRate,
    policy: defaultPolicyFromEnv(),
  });

  const quoteId = await createQuote({ phone: input.from, intent, calculation, sourceSnapshotId: product.snapshotId });

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
  return { status: "sent" as const, quoteId, calculation };
}
