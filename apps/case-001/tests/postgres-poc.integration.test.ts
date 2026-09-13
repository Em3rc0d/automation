import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDatabaseForTests, query } from "../lib/persistence/database";
import { persistSapSnapshot } from "../lib/importer";
import { processInboundMessage } from "../lib/workflow";
import { listPendingApprovals } from "../lib/approvals";

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
      rows: [{
        sku: "EPOX-7000-GRIS",
        description: "Epoxico Industrial 7000 Gris",
        stock: 84,
        unit_of_measure: "GAL",
        base_price: 100,
        cost: 65,
        currency: "USD",
      }],
    };
    const first = await persistSapSnapshot(input);
    const duplicate = await persistSapSnapshot(input);
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.snapshotId).toBe(first.snapshotId);
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

  it("routes policy exceptions to approval instead of auto-sending", async () => {
    const result = await processInboundMessage({
      providerMessageId: "ci-inbound-003",
      from: "+51922222222",
      text: "Cotizame 10 EPOX-7000-GRIS con 12% de descuento",
      receivedAt: new Date().toISOString(),
    });
    expect(result.status).toBe("awaiting_approval");
    if (result.status === "awaiting_approval") {
      expect(result.exceptions).toContain("DISCOUNT_ABOVE_AUTO_LIMIT");
    }
    const pending = await listPendingApprovals();
    expect(pending.some((approval) => approval.id === (result.status === "awaiting_approval" ? result.approvalId : ""))).toBe(true);
  });
});
