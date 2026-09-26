#!/usr/bin/env node
import { mkdir, readdir, rename, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runLiveBundle } from "./run_live.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      args[arg.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

async function ensure(path) {
  await mkdir(path, { recursive: true });
}

export async function processSpool({
  bundle,
  spool,
  runner = runLiveBundle,
  confirmed = false,
  asOf = new Date().toISOString(),
} = {}) {
  if (!confirmed) throw new Error("event spool live side effects require explicit confirmation");
  const root = resolve(spool);
  const inbox = join(root, "inbox");
  const processed = join(root, "processed");
  const failed = join(root, "failed");
  const evidence = join(root, "evidence");
  await Promise.all([ensure(inbox), ensure(processed), ensure(failed), ensure(evidence)]);

  const files = (await readdir(inbox)).filter((name) => name.endsWith(".json")).sort();
  const results = [];
  for (const name of files) {
    const source = join(inbox, name);
    const evidencePath = join(evidence, `${name}.result.json`);
    try {
      const result = await runner({
        bundle,
        eventPath: source,
        asOf,
        evidencePath,
        confirmed: true,
      });
      const success = result?.evidence?.success !== false;
      const target = join(success ? processed : failed, name);
      await rename(source, target);
      results.push({ file: name, status: success ? "processed" : "failed", evidencePath });
    } catch (error) {
      const errorEvidence = {
        schemaVersion: 1,
        evidenceType: "EVENT_SPOOL_FAILURE",
        file: name,
        error: error?.message ?? String(error),
      };
      await writeFile(evidencePath, JSON.stringify(errorEvidence, null, 2) + "\n", "utf8");
      await rename(source, join(failed, name));
      results.push({ file: name, status: "failed", evidencePath, error: errorEvidence.error });
    }
  }
  return { scanned: files.length, results };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.bundle || !args.spool) {
    throw new Error("usage: run_event_spool.mjs --bundle <dir> --spool <dir> --confirm-live-side-effects YES");
  }
  if (args["confirm-live-side-effects"] !== "YES") {
    throw new Error("refusing event spool side effects; pass --confirm-live-side-effects YES");
  }
  const result = await processSpool({
    bundle: args.bundle,
    spool: args.spool,
    confirmed: true,
    asOf: args["as-of"] ?? new Date().toISOString(),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.results.some((item) => item.status === "failed")) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 2;
  });
}
