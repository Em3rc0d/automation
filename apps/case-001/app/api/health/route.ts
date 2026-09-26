import { NextResponse } from "next/server";
import { aiProvider, messagingProvider } from "@/lib/providers";
import { databaseHealth, persistenceBackend } from "@/lib/persistence/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const database = await databaseHealth();
    return NextResponse.json({
      ok: true,
      proofLevel: "LOCAL_POC_ONLY",
      notProduction: true,
      mode: process.env.CASE001_MODE ?? "poc",
      persistence: persistenceBackend(),
      ai: aiProvider(),
      messaging: messagingProvider(),
      database,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      proofLevel: "LOCAL_POC_ONLY",
      error: error instanceof Error ? error.message : "database_unavailable",
    }, { status: 503 });
  }
}
