import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { messagingProvider } from "@/lib/providers";
import { processInboundMessage } from "@/lib/workflow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (messagingProvider() !== "local") {
    return NextResponse.json({ error: "local_messaging_not_enabled" }, { status: 409 });
  }

  try {
    const body = await request.json();
    const phone = String(body?.phone ?? "").trim();
    const text = String(body?.text ?? "").trim();
    if (!phone || phone.length > 32 || !text || text.length > 4000) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const result = await processInboundMessage({
      providerMessageId: body?.providerMessageId ? String(body.providerMessageId) : `poc-${randomUUID()}`,
      from: phone,
      text,
      receivedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, proofLevel: "LOCAL_POC_ONLY", result });
  } catch (error) {
    console.error("case001.poc.message.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "poc_message_failed" }, { status: 500 });
  }
}
