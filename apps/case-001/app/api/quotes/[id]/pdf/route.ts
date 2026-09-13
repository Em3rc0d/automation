import { NextRequest, NextResponse } from "next/server";
import { buildQuotePdf } from "@/lib/pdf";
import { getQuoteById } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "quote_not_found" }, { status: 404 });

  const bytes = await buildQuotePdf(quote);
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="cotizacion-${id}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
