import { NextRequest, NextResponse } from "next/server";
import { aiProvider, messagingProvider } from "@/lib/providers";
import { persistenceBackend, query } from "@/lib/persistence/database";
import { tenantId } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const tenant = tenantId();
    const [snapshotResult, pendingResult, quoteCountResult, recentQuotesResult, recentMessagesResult, recentProductsResult] = await Promise.all([
      query<any>(`
        select id, source_file_name, imported_at
        from public.case001_sap_snapshots
        where tenant_id = $1
        order by imported_at desc
        limit 1
      `, [tenant]),
      query<{ count: string }>("select count(*)::text as count from public.case001_approval_requests where tenant_id = $1 and status = 'pending'", [tenant]),
      query<{ count: string }>("select count(*)::text as count from public.case001_quotes where tenant_id = $1", [tenant]),
      query<any>(`
        select id, version, status, currency, total, discount_pct, requires_approval, exception_codes, created_at, sent_at
        from public.case001_quotes
        where tenant_id = $1
        order by created_at desc
        limit 10
      `, [tenant]),
      query<any>(`
        select id, provider_message_id, phone, direction, body, quote_id, occurred_at
        from public.case001_messages
        where tenant_id = $1
        order by occurred_at desc
        limit 20
      `, [tenant]),
      query<any>(`
        select sku, description, stock, unit_of_measure, base_price, cost, currency, imported_at
        from public.case001_product_snapshot_latest
        where tenant_id = $1
        order by sku asc
        limit 20
      `, [tenant]),
    ]);

    const snapshot = snapshotResult.rows[0] ?? null;
    let productRows = 0;
    if (snapshot?.id) {
      const countResult = await query<{ count: string }>(
        "select count(*)::text as count from public.case001_product_snapshots where tenant_id = $1 and snapshot_id = $2",
        [tenant, snapshot.id],
      );
      productRows = Number(countResult.rows[0]?.count ?? 0);
    }

    return NextResponse.json({
      ok: true,
      proofLevel: "LOCAL_POC_ONLY",
      notProduction: true,
      tenantId: tenant,
      runtime: {
        mode: process.env.CASE001_MODE ?? "poc",
        persistence: persistenceBackend(),
        ai: aiProvider(),
        messaging: messagingProvider(),
      },
      lastSapImport: snapshot ? {
        snapshotId: snapshot.id,
        fileName: snapshot.source_file_name,
        importedAt: snapshot.imported_at,
        productRows,
      } : null,
      pendingApprovals: Number(pendingResult.rows[0]?.count ?? 0),
      quotes: Number(quoteCountResult.rows[0]?.count ?? 0),
      recentQuotes: recentQuotesResult.rows,
      recentMessages: recentMessagesResult.rows,
      recentProducts: recentProductsResult.rows,
    });
  } catch (error) {
    console.error("case001.status.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false, error: "status_failed" }, { status: 500 });
  }
}
