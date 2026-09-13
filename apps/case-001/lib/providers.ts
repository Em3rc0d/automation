import { GoogleGenAI } from "@google/genai";
import { QuoteIntentSchema, type QuoteIntent } from "./domain";

export async function interpretWhatsAppMessage(text: string): Promise<QuoteIntent> {
  if (process.env.CASE001_MODE === "mock") {
    const qty = Number(text.match(/\b(\d+(?:\.\d+)?)\b/)?.[1] ?? 1);
    return QuoteIntentSchema.parse({
      intent: /acepto|ok|procede/i.test(text) ? "quote_accept" : /no gracias|rechazo/i.test(text) ? "quote_reject" : "quote_request",
      quantity: qty,
      productReference: text,
      usePreviousQuoteAsReference: /mismo|misma|últim|ultima|anterior/i.test(text),
      requestedCurrency: /soles|pen/i.test(text) ? "PEN" : /d[oó]lares|usd/i.test(text) ? "USD" : undefined,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required in live mode.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `You normalize WhatsApp quotation messages for a salesperson. Return ONLY valid JSON matching this shape:\n{\n  "intent": "quote_request|quote_revision|quote_accept|quote_reject|other",\n  "quantity"?: number,\n  "productReference"?: string,\n  "customerReference"?: string,\n  "requestedDiscountPct"?: number,\n  "requestedCurrency"?: "PEN|USD",\n  "usePreviousQuoteAsReference": boolean\n}\nNever calculate prices, tax, margin or totals. Message: ${JSON.stringify(text)}`;

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

  // Accept a simple normalized Kapso fixture plus the common Meta-style envelope.
  if (p.message?.id && p.message?.from && typeof p.message?.text === "string") {
    return {
      providerMessageId: String(p.message.id),
      from: String(p.message.from),
      text: p.message.text,
      receivedAt: p.message.timestamp ? new Date(Number(p.message.timestamp) * 1000).toISOString() : new Date().toISOString(),
    };
  }

  const msg = p.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (msg?.id && msg?.from && msg?.text?.body) {
    return {
      providerMessageId: String(msg.id),
      from: String(msg.from),
      text: String(msg.text.body),
      receivedAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
    };
  }
  return null;
}

export async function sendWhatsAppText(to: string, body: string): Promise<{ providerMessageId: string }> {
  if (process.env.CASE001_MODE === "mock") {
    return { providerMessageId: `mock-${Date.now()}` };
  }

  const apiKey = process.env.KAPSO_API_KEY;
  const url = process.env.KAPSO_SEND_MESSAGE_URL;
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!apiKey || !url || !phoneNumberId) {
    throw new Error("KAPSO_API_KEY, KAPSO_SEND_MESSAGE_URL and KAPSO_PHONE_NUMBER_ID are required in live mode.");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ phone_number_id: phoneNumberId, to, type: "text", text: { body } }),
  });
  if (!response.ok) throw new Error(`Kapso send failed: ${response.status} ${await response.text()}`);
  const data = (await response.json()) as any;
  return { providerMessageId: String(data.id ?? data.message_id ?? data.messages?.[0]?.id ?? "unknown") };
}
