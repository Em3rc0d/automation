import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { tenantId } from "@/lib/store";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const database = db();
  const tenant = tenantId();
  const [{ data: snapshot, error: snapshotError }, { count: pendingApprovals, error: approvalError }, { count: quotes, error: quoteError }] = await Promise.all([
    database.from("case001_sap_snapshots").select("id,source_file_name,imported_at", { count: "exact" }).eq("tenant_id", tenant).order("imported_at", { ascending: false }).limit(1).maybeSingle(),
    database.from("case001_approval_requests").select("id", { count: "exact", head: true }).eq("tenant_id", tenant).eq("status", "pending"),
    database.from("case001_quotes").select("id", { count: "exact", head: true }).eq("tenant_id", tenant),
  ]);
  if (snapshotError) throw snapshotError;
  if (approvalError) throw approvalError;
  if (quoteError) throw quoteError;

  let productRows = 0;
  if (snapshot?.id) {
    const { count, error } = await database
      .from("case001_product_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant)
      .eq("snapshot_id", snapshot.id);
    if (error) throw error;
    productRows = count ?? 0;
  }

  return NextResponse.json({
    ok: true,
    tenantId: tenant,
    lastSapImport: snapshot ? {
      snapshotId: snapshot.id,
      fileName: snapshot.source_file_name,
      importedAt: snapshot.imported_at,
      productRows,
    } : null,
    pendingApprovals: pendingApprovals ?? 0,
    quotes: quotes ?? 0,
  });
}
