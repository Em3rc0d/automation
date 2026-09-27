import { NextRequest, NextResponse } from "next/server";
import { normalizeKapsoWebhook } from "@/lib/providers";
import { processInboundMessage } from "@/lib/workflow";

export async function POST(request: NextRequest) {
  try {
    const expected = process.env.KAPSO_WEBHOOK_SECRET;
    if (expected) {
      const supplied = request.headers.get("x-webhook-secret");
      if (supplied !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const message = normalizeKapsoWebhook(payload);
    if (!message) return NextResponse.json({ ignored: true });

    const result = await processInboundMessage(message);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("case001.kapso.webhook.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "webhook_processing_failed" }, { status: 500 });
  }
}
