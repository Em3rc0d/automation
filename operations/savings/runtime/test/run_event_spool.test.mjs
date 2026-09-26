import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { processSpool } from "../run_event_spool.mjs";

test("event spool processes JSON events exactly once by moving them out of inbox", async () => {
  const root = await mkdtemp(join(tmpdir(), "event-spool-"));
  const inbox = join(root, "inbox");
  await mkdir(inbox, { recursive: true });
  await writeFile(join(inbox, "event-001.json"), JSON.stringify({ request: { id: "r1" } }));

  let calls = 0;
  const runner = async ({ eventPath, evidencePath }) => {
    calls += 1;
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    assert.equal(event.request.id, "r1");
    await writeFile(evidencePath, JSON.stringify({ success: true }));
    return { evidence: { success: true } };
  };

  const first = await processSpool({
    bundle: "/tmp/bundle",
    spool: root,
    runner,
    confirmed: true,
    asOf: "2026-09-25T12:00:00Z",
  });
  const second = await processSpool({
    bundle: "/tmp/bundle",
    spool: root,
    runner,
    confirmed: true,
    asOf: "2026-09-25T12:00:00Z",
  });

  assert.equal(first.scanned, 1);
  assert.equal(first.results[0].status, "processed");
  assert.equal(second.scanned, 0);
  assert.equal(calls, 1);
  assert.deepEqual(await readdir(join(root, "inbox")), []);
  assert.deepEqual(await readdir(join(root, "processed")), ["event-001.json"]);
});

test("event spool quarantines failures instead of retrying blindly in the same pass", async () => {
  const root = await mkdtemp(join(tmpdir(), "event-spool-fail-"));
  const inbox = join(root, "inbox");
  await mkdir(inbox, { recursive: true });
  await writeFile(join(inbox, "event-bad.json"), "{}");

  const result = await processSpool({
    bundle: "/tmp/bundle",
    spool: root,
    runner: async () => { throw new Error("simulated provider failure"); },
    confirmed: true,
  });

  assert.equal(result.results[0].status, "failed");
  assert.deepEqual(await readdir(join(root, "failed")), ["event-bad.json"]);
  const evidence = JSON.parse(await readFile(join(root, "evidence", "event-bad.json.result.json"), "utf8"));
  assert.equal(evidence.evidenceType, "EVENT_SPOOL_FAILURE");
});
