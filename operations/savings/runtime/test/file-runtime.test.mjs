import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { FileAuditControlPlane, FileIdempotencyStore } from "../file-runtime.mjs";

test("file idempotency survives a new store instance", async () => {
  const root = await mkdtemp(join(tmpdir(), "file-idempotency-"));
  const first = new FileIdempotencyStore({ dir: root });
  assert.equal(first.claim("tenant:wf:entity").claimed, true);
  first.complete("tenant:wf:entity", { status: "completed", value: 1 });

  const second = new FileIdempotencyStore({ dir: root });
  const claim = second.claim("tenant:wf:entity");
  assert.equal(claim.claimed, false);
  assert.equal(claim.existing.state, "completed");
  assert.equal(claim.existing.result.value, 1);
});

test("file audit control plane writes append-only JSONL evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "file-audit-"));
  const cp = new FileAuditControlPlane({ dir: root });
  const run = cp.createRun({
    tenantId: "t",
    automationInstanceId: "wf",
    workflowKey: "X",
    traceId: "trace",
    startedAt: "2026-09-25T00:00:00Z",
  });
  cp.finishRun(run.id, { status: "succeeded", finishedAt: "2026-09-25T00:01:00Z" });
  const lines = (await readFile(join(root, "control-plane.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].action, "execution_run.created");
  assert.equal(lines[1].action, "execution_run.finished");
});
