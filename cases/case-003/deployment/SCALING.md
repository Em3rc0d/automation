# Scaling

CASE-003 should remain single-runtime until measured load justifies complexity.

## Stage 1 — single n8n instance

Use:

```text
one n8n instance
PostgreSQL internal DB
CASE-003 Supabase business DB
execution pruning
persistent binary/file storage where needed
```

This is sufficient for the pilot unless metrics prove otherwise.

## Stage 2 — vertical scaling

Increase CPU/RAM and tune execution retention before adding distributed components.

Measure:

```text
executions/minute
p50/p95 duration
concurrent executions
memory high-water mark
DB connection usage
binary-data volume
provider webhook latency
```

## Stage 3 — queue mode

Only after load evidence.

n8n queue mode introduces Redis and workers. All n8n components must share the same encryption key and compatible n8n version. The n8n internal DB must be PostgreSQL-class, not a shared SQLite file.

Conceptual shape:

```text
public ingress
    |
main/webhook n8n
    |
 Redis queue
    |
 n8n workers
    |
 n8n PostgreSQL
```

CASE-003 business truth remains outside that execution topology.

Queue mode is **not currently certified** for CASE-003. It requires new concurrency, replay, webhook and restore tests.

## Binary data

If workflows begin moving significant binary payloads, filesystem persistence becomes an operational constraint. n8n supports external binary-data storage on eligible self-hosted plans; check current n8n licensing/features before depending on it.

## Multi-region

Out of current MK1 scope. Do not add multi-region databases, active-active n8n or cross-region queues without a measured requirement and new certification plan.
