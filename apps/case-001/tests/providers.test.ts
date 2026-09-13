import { afterEach, describe, expect, it } from "vitest";
import { interpretWhatsAppMessage, normalizeKapsoWebhook } from "../lib/providers";

describe("normalizeKapsoWebhook", () => {
  it("normalizes the pilot Kapso fixture envelope", () => {
    const message = normalizeKapsoWebhook({
      message: { id: "wamid.1", from: "51999900001", text: "Cotizame 10 galones", timestamp: 1789272000 },
    });
    expect(message).toMatchObject({ providerMessageId: "wamid.1", from: "51999900001", text: "Cotizame 10 galones" });
  });

  it("normalizes a Meta-style WhatsApp envelope", () => {
    const message = normalizeKapsoWebhook({
      entry: [{ changes: [{ value: { messages: [{ id: "wamid.2", from: "51999900002", timestamp: "1789272000", text: { body: "Acepto" } }] } }] }],
    });
    expect(message).toMatchObject({ providerMessageId: "wamid.2", from: "51999900002", text: "Acepto" });
  });

  it("ignores payloads with no supported inbound text message", () => {
    expect(normalizeKapsoWebhook({ event: "delivery" })).toBeNull();
  });
});

describe("local PoC semantic mock", () => {
  afterEach(() => {
    delete process.env.CASE001_AI_PROVIDER;
    delete process.env.CASE001_MODE;
  });

  it("treats an initial quotation with a discount as a quote request", async () => {
    process.env.CASE001_AI_PROVIDER = "mock";
    const intent = await interpretWhatsAppMessage("Cotizame 10 EPOX-7000-GRIS con 12% de descuento");
    expect(intent).toMatchObject({
      intent: "quote_request",
      quantity: 10,
      productReference: "EPOX-7000-GRIS",
      requestedDiscountPct: 12,
      usePreviousQuoteAsReference: false,
    });
  });

  it("requires an explicit change cue before classifying a revision", async () => {
    process.env.CASE001_AI_PROVIDER = "mock";
    const intent = await interpretWhatsAppMessage("Cambia a 20 y mejora a 7% de descuento");
    expect(intent.intent).toBe("quote_revision");
    expect(intent.usePreviousQuoteAsReference).toBe(true);
    expect(intent.quantity).toBe(20);
    expect(intent.requestedDiscountPct).toBe(7);
  });
});
