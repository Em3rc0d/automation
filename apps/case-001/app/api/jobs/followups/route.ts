import { NextRequest, NextResponse } from "next/server";
import { runQuoteFollowups } from "@/lib/followups";

export async function POST(request: NextRequest) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  if (!expected || request.headers.get("x-admin-token") !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const results = await runQuoteFollowups();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("case001.followups.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "followup_job_failed" }, { status: 500 });
  }
}
