import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabaseForTests, query } from "../lib/persistence/database";
import { persistSapSnapshot } from "../lib/importer";
import { parseHistoricalWorkbook, persistHistoricalQuotes } from "../lib/history-importer";
import { processInboundMessage } from "../lib/workflow";
import { decideApproval, listPendingApprovals } from "../lib/approvals";
import { runQuoteFollowups } from "../lib/followups";
import { findProduct, getQuoteById } from "../lib/store";
import { buildQuotePdf } from "../lib/pdf";

const enabled = Boolean(process.env.DATABASE_URL);

describe.runIf(enabled)("CASE-001 PostgreSQL local PoC", () => {
  const tenant = "ci-case-001-poc";

  beforeAll(async () => {
    process.env.CASE001_TENANT_ID = tenant;
    process.env.CASE001_MODE = "mock";
    process.env.CASE001_AI_PROVIDER = "mock";
    process.env.CASE001_MESSAGING_PROVIDER = "local";
    process.env.CASE001_SELLER_PHONE = "";
    process.env.SAP_STALE_AFTER_HOURS = "24";
    process.env.MAX_AUTO_DISCOUNT_PCT = "8";
    process.env.MINIMUM_MARGIN_PCT = "22";
    process.env.FOLLOWUP_AFTER_HOURS = "12";
    process.env.FOLLOWUP_MAX_ATTEMPTS = "1";

    await query("delete from public.case001_approval_requests where tenant_id = $1", [tenant]);
    await query("delete from public.case001_messages where tenant_id = $1", [tenant]);
    await query("delete from public.case001_quote_lines where quote_id in (select id from public.case001_quotes where tenant_id = $1)", [tenant]);
    await query("delete from public.case001_quotes where tenant_id = $1", [tenant]);
    await query("delete from public.case001_product_snapshots where tenant_id = $1", [tenant]);
    await query("delete from public.case001_sap_snapshots where tenant_id = $1", [tenant]);
    await query("delete from public.case001_customers where tenant_id = $1", [tenant]);
  });

  afterAll(async () => {
    await closeDatabaseForTests();
  });

  it("imports an immutable SAP snapshot idempotently", async () => {
    const input = {
      fileName: "ci-sap.csv",
      fileSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      rows: [
        {
          sku: "EPOX-7000-GRIS",
          description: "Epoxico Industrial 7000 Gris",
          stock: 84,
          unit_of_measure: "GAL",
          base_price: 100,
          cost: 65,
          currency: "USD",
        },
        {
          sku: "EPOX-7000-AZUL",
          description: "Epoxico Industrial 7000 Azul",
          stock: 42,
          unit_of_measure: "GAL",
          base_price: 105,
          cost: 68,
          currency: "USD",
        },
      ],
    };
    const first = await persistSapSnapshot(input);
    const duplicate = await persistSapSnapshot(input);
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.snapshotId).toBe(first.snapshotId);
  });

  it("resolves descriptive products deterministically and refuses ambiguity", async () => {
    const blue = await findProduct("epóxico azul");
    expect(blue?.sku).toBe("EPOX-7000-AZUL");
    expect(await findProduct("industrial")).toBeNull();
  });

  it("runs quote, duplicate-event and acceptance flow against PostgreSQL", async () => {
    const first = await processInboundMessage({
      providerMessageId: "ci-inbound-001",
      from: "+51911111111",
      text: "Cotizame 10 EPOX-7000-GRIS",
      receivedAt: new Date().toISOString(),
    });
    expect(first.status).toBe("sent");

    const duplicate = await processInboundMessage({
      providerMessageId: "ci-inbound-001",
      from: "+51911111111",
      text: "Cotizame 10 EPOX-7000-GRIS",
      receivedAt: new Date().toISOString(),
    });
    expect(duplicate.status).toBe("duplicate");

    const accepted = await processInboundMessage({
      providerMessageId: "ci-inbound-002",
      from: "+51911111111",
      text: "Acepto",
      receivedAt: new Date().toISOString(),
    });
    expect(accepted.status).toBe("accepted");

    const result = await query<{ status: string }>(
      "select status from public.case001_quotes where tenant_id = $1 and customer_phone = $2 order by created_at desc limit 1",
      [tenant, "+51911111111"],
    );
    expect(result.rows[0]?.status).toBe("accepted");
  });

  it("creates a linked quote revision and marks the previous version revised", async () => {
    const initial = await processInboundMessage({
      providerMessageId: "ci-revision-001",
      from: "+51933333333",
      text: "Cotizame 10 EPOX-7000-GRIS",
      receivedAt: new Date().toISOString(),
    });
    expect(initial.status).toBe("sent");

    const revision = await processInboundMessage({
      providerMessageId: "ci-revision-002",
      from: "+51933333333",
      text: "Cambia a 20",
      receivedAt: new Date().toISOString(),
    });
    expect(revision.status).toBe("sent");
    if (revision.status === "sent") expect(revision.version).toBe(2);

    const versions = await query<{ version: number; status: string; parent_quote_id: string | null }>(`
      select version, status, parent_quote_id
      from public.case001_quotes
      where tenant_id = $1 and customer_phone = $2
      order by version asc
    `, [tenant, "+51933333333"]);
    expect(versions.rows.map((row) => row.status)).toEqual(["revised", "sent"]);
    expect(Number(versions.rows[1]?.version)).toBe(2);
    expect(versions.rows[1]?.parent_quote_id).toBeTruthy();
  });

  it("imports historical context but recalculates from the current SAP snapshot", async () => {
    const csv = [
      "quote_ref,quote_date,customer_phone,customer_name,company_name,customer_type,currency,subtotal,tax_total,total,discount_pct,status,sku,description,quantity,list_unit_price,quoted_unit_price",
      "HIST-CI-001,2026-09-10T12:00:00.000Z,+51955555555,Cliente Demo,ABC SAC,B2B,USD,90,16.2,106.2,10,accepted,EPOX-7000-GRIS,Epoxico Industrial 7000 Gris,1,100,90",
    ].join("\n");
    const parsed = parseHistoricalWorkbook(new TextEncoder().encode(csv).buffer as ArrayBuffer);
    expect(parsed.rejected).toEqual([]);
    const imported = await persistHistoricalQuotes(parsed.accepted);
    expect(imported.imported).toBe(1);

    const result = await processInboundMessage({
      providerMessageId: "ci-history-001",
      from: "+51955555555",
      text: "Dame 5 del mismo que la vez pasada",
      receivedAt: new Date().toISOString(),
    });
    expect(result.status).toBe("sent");
    if (result.status !== "sent") throw new Error("Expected history-backed quote to be sent.");
    expect(result.calculation.sku).toBe("EPOX-7000-GRIS");
    expect(result.calculation.listUnitPrice).toBe(100);
    expect(result.calculation.discountPct).toBe(10);
  });

  it("routes policy exceptions to approval and sends only after explicit approval", async () => {
    const result = await processInboundMessage({
      providerMessageId: "ci-inbound-003",
      from: "+51922222222",
      text: "Cotizame 10 EPOX-7000-GRIS con 12% de descuento",
      receivedAt: new Date().toISOString(),
    });
    expect(result.status).toBe("awaiting_approval");
    if (result.status !== "awaiting_approval") throw new Error("Expected pending approval.");
    expect(result.exceptions).toContain("DISCOUNT_ABOVE_AUTO_LIMIT");

    const pending = await listPendingApprovals();
    expect(pending.some((approval) => approval.id === result.approvalId)).toBe(true);
    const decision = await decideApproval({ approvalId: result.approvalId, decision: "approved", decidedBy: "ci-operator" });
    expect(decision.status).toBe("approved_and_sent");

    const quote = await getQuoteById(result.quoteId);
    expect(quote?.status).toBe("sent");
  });

  it("sends one local follow-up inside the inbound-message window", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    const result = await processInboundMessage({
      providerMessageId: "ci-followup-001",
      from: "+51966666666",
      text: "Cotizame 2 EPOX-7000-GRIS",
      receivedAt: new Date("2026-09-13T11:00:00.000Z").toISOString(),
    });
    expect(result.status).toBe("sent");
    if (result.status !== "sent") throw new Error("Expected sent quote for follow-up test.");
    await query("update public.case001_quotes set sent_at = $1 where tenant_id = $2 and id = $3", [new Date("2026-09-12T23:00:00.000Z").toISOString(), tenant, result.quoteId]);

    const followups = await runQuoteFollowups(now);
    expect(followups).toContainEqual({ quoteId: result.quoteId, status: "sent", attempt: 1 });
    const quote = await getQuoteById(result.quoteId);
    expect(Number(quote?.follow_up_count)).toBe(1);
  });

  it("requires a template instead of free-form follow-up outside the window", async () => {
    const now = new Date("2026-09-13T12:00:00.000Z");
    const result = await processInboundMessage({
      providerMessageId: "ci-followup-old-001",
      from: "+51977777777",
      text: "Cotizame 2 EPOX-7000-GRIS",
      receivedAt: new Date("2026-09-12T05:00:00.000Z").toISOString(),
    });
    expect(result.status).toBe("sent");
    if (result.status !== "sent") throw new Error("Expected sent quote for old follow-up test.");
    await query("update public.case001_quotes set sent_at = $1 where tenant_id = $2 and id = $3", [new Date("2026-09-12T06:00:00.000Z").toISOString(), tenant, result.quoteId]);

    const followups = await runQuoteFollowups(now);
    expect(followups).toContainEqual({ quoteId: result.quoteId, status: "template_required" });
    const quote = await getQuoteById(result.quoteId);
    expect(quote?.follow_up_template_required_at).toBeTruthy();
  });

  it("renders a stored quote as a PDF", async () => {
    const result = await processInboundMessage({
      providerMessageId: "ci-pdf-001",
      from: "+51944444444",
      text: "Cotizame 2 EPOX-7000-AZUL",
      receivedAt: new Date().toISOString(),
    });
    expect(result.status).toBe("sent");
    if (result.status !== "sent") throw new Error("Expected a sent quote for PDF test.");
    const quote = await getQuoteById(result.quoteId);
    const pdf = await buildQuotePdf(quote);
    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe("%PDF");
  });
});
