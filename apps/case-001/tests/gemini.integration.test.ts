import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { interpretWhatsAppMessage } from "../lib/providers";

const enabled = Boolean(process.env.GEMINI_API_KEY);

describe.runIf(enabled)("CASE-001 Gemini semantic integration", () => {
  const previousProvider = process.env.CASE001_AI_PROVIDER;

  beforeAll(() => {
    process.env.CASE001_AI_PROVIDER = "gemini";
  });

  afterAll(() => {
    if (previousProvider == null) delete process.env.CASE001_AI_PROVIDER;
    else process.env.CASE001_AI_PROVIDER = previousProvider;
  });

  it("extracts a normal quote request without calculating commercial values", async () => {
    const intent = await interpretWhatsAppMessage("Cotízame 30 galones del epóxico azul.");
    expect(intent.intent).toBe("quote_request");
    expect(intent.quantity).toBe(30);
    expect(intent.productReference).toBeTruthy();
  });

  it("recognizes an explicit prior-quote reference", async () => {
    const intent = await interpretWhatsAppMessage("Dame 40 del mismo azul que cotizamos la vez pasada.");
    expect(intent.intent).toBe("quote_request");
    expect(intent.quantity).toBe(40);
    expect(intent.usePreviousQuoteAsReference).toBe(true);
  });

  it("recognizes a requested discount as data, not arithmetic authority", async () => {
    const intent = await interpretWhatsAppMessage("Cotízame 10 EPOX-7000-GRIS con 7% de descuento.");
    expect(intent.intent).toBe("quote_request");
    expect(intent.quantity).toBe(10);
    expect(intent.requestedDiscountPct).toBe(7);
  });
});
