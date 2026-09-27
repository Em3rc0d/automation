import { NextRequest, NextResponse } from "next/server";
import { parseHistoricalWorkbook, persistHistoricalQuotes } from "@/lib/history-importer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  const supplied = request.headers.get("x-admin-token");
  if (!expected || supplied !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file_required" }, { status: 400 });
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) return NextResponse.json({ error: "unsupported_file_type" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

    const parsed = parseHistoricalWorkbook(await file.arrayBuffer());
    if (!parsed.accepted.length) {
      return NextResponse.json({ error: "no_valid_rows", rejected: parsed.rejected, total: parsed.total }, { status: 422 });
    }
    const result = await persistHistoricalQuotes(parsed.accepted);
    return NextResponse.json({
      ok: true,
      ...result,
      acceptedRows: parsed.accepted.length,
      rejectedRows: parsed.rejected,
      totalRows: parsed.total,
    });
  } catch (error) {
    console.error("case001.history.import.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "history_import_failed" }, { status: 500 });
  }
}
