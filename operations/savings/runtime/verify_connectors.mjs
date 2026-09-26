#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createGoogleWorkspaceAdapter } from "../../../connectors/savings/google-workspace/factory.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg.startsWith("--")) {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`missing value for ${arg}`);
      args[arg.slice(2)] = value;
      i += 1;
    }
  }
  return args;
}

export async function verifyBundle({
  bundle,
  env = process.env,
  fetchFn = globalThis.fetch,
  checkedAt = new Date().toISOString(),
  evidencePath = null,
} = {}) {
  const bundlePath = resolve(bundle);
  const bindingsPath = resolve(bundlePath, "connector-bindings.json");
  const doc = await readJson(bindingsPath);
  const bindings = doc.bindings ?? [];
  if (!bindings.length) throw new Error("bundle has no connector bindings");

  const results = [];
  for (const binding of bindings) {
    const capability = binding.capability;
    if (!binding.provider || !binding.credentialRef || binding.status === "unbound") {
      binding.status = "unbound";
      binding.verification = null;
      results.push({
        capability,
        provider: binding.provider ?? null,
        status: "FAIL",
        error: "connector is not bound",
      });
      continue;
    }

    try {
      const adapter = createGoogleWorkspaceAdapter(binding, { env, fetchFn });
      if (typeof adapter.healthCheck !== "function") {
        throw new Error(`provider adapter lacks healthCheck(): ${binding.provider}`);
      }
      const health = await adapter.healthCheck();
      if (!health?.ok) throw new Error("provider healthcheck returned ok=false");
      binding.status = "verified";
      results.push({
        capability,
        provider: binding.provider,
        status: "PASS",
        health,
      });
    } catch (error) {
      binding.status = "degraded";
      binding.verification = null;
      results.push({
        capability,
        provider: binding.provider,
        status: "FAIL",
        error: error?.customerSafeMessage ?? error?.message ?? String(error),
        code: error?.code ?? null,
      });
    }
  }

  const allPassed = results.every((item) => item.status === "PASS");
  const output = evidencePath
    ? resolve(evidencePath)
    : resolve(bundlePath, "evidence", "connector-verification.json");
  const evidenceRef = relative(bundlePath, output).replaceAll("\\", "/");
  const evidence = {
    schemaVersion: 1,
    evidenceType: "LIVE_CONNECTOR_HEALTHCHECK",
    productionDryRun: false,
    checkedAt,
    allPassed,
    results,
  };

  for (const binding of bindings) {
    const result = results.find((item) => item.capability === binding.capability);
    if (result?.status === "PASS") {
      binding.verification = {
        checkedAt,
        evidenceRef,
        provider: binding.provider,
      };
    }
  }

  await writeJson(output, evidence);
  await writeJson(bindingsPath, doc);
  return { allPassed, evidencePath: output, evidenceRef, results };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.bundle) throw new Error("usage: verify_connectors.mjs --bundle <installation-dir> [--out evidence.json]");
  const result = await verifyBundle({
    bundle: args.bundle,
    evidencePath: args.out ?? null,
  });
  if (args.json) {
    console.log(JSON.stringify({
      allPassed: result.allPassed,
      evidenceRef: result.evidenceRef,
      results: result.results,
    }, null, 2));
  } else {
    console.log(result.allPassed ? "CONNECTORS VERIFIED" : "CONNECTOR VERIFICATION FAILED");
    for (const item of result.results) {
      console.log(`${item.status}\t${item.capability}\t${item.provider ?? "-"}${item.error ? `\t${item.error}` : ""}`);
    }
    console.log(`evidence=${result.evidenceRef}`);
  }
  if (!result.allPassed) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 2;
  });
}
