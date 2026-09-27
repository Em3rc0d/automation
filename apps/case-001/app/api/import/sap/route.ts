import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseSapWorkbook, persistSapSnapshot } from "@/lib/importer";

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

    const buffer = await file.arrayBuffer();
    const fileSha256 = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
    const parsed = parseSapWorkbook(buffer);
    if (!parsed.accepted.length) {
      return NextResponse.json({ error: "no_valid_rows", ...parsed }, { status: 422 });
    }
    const snapshot = await persistSapSnapshot({ fileName: file.name, fileSha256, rows: parsed.accepted });
    return NextResponse.json({
      ok: true,
      ...snapshot,
      accepted: parsed.accepted.length,
      rejected: parsed.rejected,
      total: parsed.total,
    });
  } catch (error) {
    console.error("case001.sap.import.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "import_failed" }, { status: 500 });
  }
}
