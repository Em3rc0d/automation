import { describe, expect, it } from "vitest";
import { normalizeKapsoWebhook } from "../lib/providers";

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
