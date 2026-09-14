import { NextRequest, NextResponse } from "next/server";
import { decideApproval, listPendingApprovals } from "@/lib/approvals";

function authorized(request: NextRequest) {
  const expected = process.env.CASE001_ADMIN_TOKEN;
  return Boolean(expected && request.headers.get("x-admin-token") === expected);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ approvals: await listPendingApprovals() });
  } catch (error) {
    console.error("case001.approvals.list.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "approval_list_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (!body?.approvalId || !["approved", "rejected"].includes(body?.decision)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const result = await decideApproval({
      approvalId: String(body.approvalId),
      decision: body.decision,
      decidedBy: String(body.decidedBy ?? "pilot-seller"),
      reason: body.reason ? String(body.reason) : undefined,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("case001.approvals.decision.failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "approval_decision_failed" }, { status: 500 });
  }
}
