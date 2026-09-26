import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

import { MemoryControlPlane } from "../../../runtime/savings-p0/src/stores.js";

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function hashKey(key) {
  return createHash("sha256").update(String(key)).digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function atomicWriteJson(path, value) {
  ensureDir(dirname(path));
  const tmp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
  renameSync(tmp, path);
}

export class FileIdempotencyStore {
  constructor({ dir } = {}) {
    if (!dir) throw new TypeError("FileIdempotencyStore dir is required");
    this.dir = dir;
    ensureDir(dir);
  }

  pathFor(key) {
    return join(this.dir, `${hashKey(key)}.json`);
  }

  claim(key) {
    const path = this.pathFor(key);
    try {
      const fd = openSync(path, "wx", 0o600);
      const entry = {
        state: "in_progress",
        keyHash: hashKey(key),
        claimedAt: new Date().toISOString(),
      };
      writeFileSync(fd, JSON.stringify(entry, null, 2) + "\n", "utf8");
      closeSync(fd);
      return { claimed: true, entry };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = readJson(path);
      return { claimed: false, existing };
    }
  }

  complete(key, result) {
    atomicWriteJson(this.pathFor(key), {
      state: "completed",
      keyHash: hashKey(key),
      completedAt: new Date().toISOString(),
      result,
    });
  }

  release(key) {
    const path = this.pathFor(key);
    if (existsSync(path)) unlinkSync(path);
  }

  get(key) {
    const path = this.pathFor(key);
    return existsSync(path) ? readJson(path) : undefined;
  }
}

export class FileAuditControlPlane extends MemoryControlPlane {
  constructor({ dir } = {}) {
    if (!dir) throw new TypeError("FileAuditControlPlane dir is required");
    super({ idFactory: () => randomUUID() });
    this.dir = dir;
    ensureDir(dir);
    this.logPath = join(dir, "control-plane.jsonl");
  }

  append(action, payload) {
    appendFileSync(
      this.logPath,
      JSON.stringify({ recordedAt: new Date().toISOString(), action, payload }) + "\n",
      { encoding: "utf8", mode: 0o600 },
    );
  }

  createRun(args) {
    const value = super.createRun(args);
    this.append("execution_run.created", value);
    return value;
  }

  finishRun(runId, changes) {
    const value = super.finishRun(runId, changes);
    this.append("execution_run.finished", value);
    return value;
  }

  emitExecutionEvent(event) {
    super.emitExecutionEvent(event);
    this.append("execution_event", this.executionEvents.at(-1));
  }

  upsertProcessRecord(record) {
    const value = super.upsertProcessRecord(record);
    this.append("process_record.upserted", value);
    return value;
  }

  emitSavingsEvent(event) {
    const value = super.emitSavingsEvent(event);
    this.append("savings_event", value);
    return value;
  }

  createIncident(incident) {
    const value = super.createIncident(incident);
    this.append("incident.created", value);
    return value;
  }
}
