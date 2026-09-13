import { GoogleGenAI } from "@google/genai";
import { QuoteIntentSchema, type QuoteIntent } from "./domain";

const MAX_MESSAGE_CHARS = 4000;

export function aiProvider() {
  const configured = process.env.CASE001_AI_PROVIDER?.toLowerCase();
  if (configured === "mock" || configured === "gemini") return configured;
  return process.env.CASE001_MODE === "mock" ? "mock" : "gemini";
}

export function messagingProvider() {
  const configured = process.env.CASE001_MESSAGING_PROVIDER?.toLowerCase();
  if (configured === "local" || configured === "kapso") return configured;
  return process.env.CASE001_MODE === "mock" || process.env.CASE001_MODE === "poc" ? "local" : "kapso";
}

export async function interpretWhatsAppMessage(text: string): Promise<QuoteIntent> {
  const normalizedText = text.trim().slice(0, MAX_MESSAGE_CHARS);
  if (!normalizedText) return QuoteIntentSchema.parse({ intent: "other", usePreviousQuoteAsReference: false });

  if (aiProvider() === "mock") {
    const qtyMatch = normalizedText.match(/\b(\d+(?:\.\d+)?)\b/);
    const qty = qtyMatch ? Number(qtyMatch[1]) : undefined;
    const isAccept = /\b(acepto|ok|procede|confirmo)\b/i.test(normalizedText);
    const isReject = /\b(no gracias|rechazo|no procede|descartamos)\b/i.test(normalizedText);
    const isRevision = /\b(cambia|cambiar|mejora|mejorar|descuento|en soles|en dolares|en dólares|en vez de|si llevo|si compro)\b/i.test(normalizedText);
    const usesPrevious = /mismo|misma|últim|ultima|anterior/i.test(normalizedText) || isRevision;
    const skuReference = normalizedText.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/i)?.[0];
    return QuoteIntentSchema.parse({
      intent: isAccept ? "quote_accept" : isReject ? "quote_reject" : isRevision ? "quote_revision" : "quote_request",
      quantity: qty,
      productReference: usesPrevious ? undefined : skuReference ?? normalizedText,
      usePreviousQuoteAsReference: usesPrevious,
      requestedDiscountPct: Number(normalizedText.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] ?? NaN) || undefined,
      requestedCurrency: /soles|\bpen\b/i.test(normalizedText) ? "PEN" : /d[oó]lares|\busd\b/i.test(normalizedText) ? "USD" : undefined,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required when CASE001_AI_PROVIDER=gemini.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You normalize WhatsApp quotation messages for a salesperson. Return ONLY valid JSON matching this shape:\n{\n  "intent": "quote_request" | "quote_revision" | "quote_accept" | "quote_reject" | "other",\n  "quantity"?: number,\n  "productReference"?: string,\n  "customerReference"?: string,\n  "requestedDiscountPct"?: number,\n  "requestedCurrency"?: "PEN" | "USD",\n  "usePreviousQuoteAsReference": boolean\n}\nRules:\n- Never calculate prices, tax, margin, FX or totals.\n- Never invent a missing product, quantity, discount or commercial term.\n- A request to change quantity/product/discount/currency/terms for an already discussed quote is quote_revision.\n- If the customer refers to "same as last time" or equivalent, set usePreviousQuoteAsReference=true and do not invent the SKU.\nMessage: ${JSON.stringify(normalizedText)}`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });
  const raw = response.text;
  if (!raw) throw new Error("Gemini returned an empty response.");
  return QuoteIntentSchema.parse(JSON.parse(raw));
}

export type NormalizedInboundMessage = {
  providerMessageId: string;
  from: string;
  text: string;
  receivedAt: string;
};

export function normalizeKapsoWebhook(payload: unknown): NormalizedInboundMessage | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, any>;

  // Accept a simple normalized Kapso fixture plus a common Meta-style envelope.
  // The exact Kapso production webhook contract remains provider-bound configuration.
  if (p.message?.id && p.message?.from && typeof p.message?.text === "string") {
    return {
      providerMessageId: String(p.message.id),
      from: String(p.message.from),
      text: p.message.text.slice(0, MAX_MESSAGE_CHARS),
      receivedAt: p.message.timestamp ? new Date(Number(p.message.timestamp) * 1000).toISOString() : new Date().toISOString(),
    };
  }

  const msg = p.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (msg?.id && msg?.from && msg?.text?.body) {
    return {
      providerMessageId: String(msg.id),
      from: String(msg.from),
      text: String(msg.text.body).slice(0, MAX_MESSAGE_CHARS),
      receivedAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
    };
  }
  return null;
}

export async function sendWhatsAppText(to: string, body: string): Promise<{ providerMessageId: string }> {
  if (messagingProvider() === "local") {
    return { providerMessageId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` };
  }

  const apiKey = process.env.KAPSO_API_KEY;
  const url = process.env.KAPSO_SEND_MESSAGE_URL;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey || !url || !phoneNumberId) {
    throw new Error("KAPSO_API_KEY, KAPSO_SEND_MESSAGE_URL and KAPSO_PHONE_NUMBER_ID are required when CASE001_MESSAGING_PROVIDER=kapso.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ phone_number_id: phoneNumberId, to, type: "text", text: { body } }),
  });
  if (!response.ok) throw new Error(`Kapso send failed with HTTP ${response.status}.`);
  const data = (await response.json()) as any;
  const id = data.id ?? data.message_id ?? data.messages?.[0]?.id;
  if (!id) throw new Error("Kapso send succeeded but returned no provider message id.");
  return { providerMessageId: String(id) };
}
