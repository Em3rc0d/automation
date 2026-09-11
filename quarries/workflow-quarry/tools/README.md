# Workflow Quarry Tools

These tools mine large external n8n corpora without confusing discovery with approval.

## `index_workflow_corpus.py`

Standard-library-only bulk indexer. It recursively scans `*.json`, preserves malformed/non-n8n files in the output inventory, and emits:

- `candidates.jsonl` — one metadata record per JSON file;
- `summary.json` — corpus counts, domain distribution, common node types and risk findings.

It does **not** approve, delete, harden, execute, or publish external workflow code.

### Example

```bash
python quarries/workflow-quarry/tools/index_workflow_corpus.py \
  --source-dir quarries/workflow-quarry/.external-cache/utsav \
  --source-id utsav-donda-n8n-workflows \
  --source-url https://github.com/Utsav-Donda/N8N-Workflows \
  --source-commit 65fe4656b9590128f96bea844f6f74ce24d9e4e9 \
  --license-status MIT \
  --output-dir quarries/workflow-quarry/mined/utsav-donda-n8n-workflows
```

### Extracted fields

- source/provenance inputs;
- relative path + SHA-256;
- parse status;
- workflow name/id/active;
- node count + node types;
- trigger types;
- credential types;
- community/non-core nodes;
- domain tags;
- P0/P1/P2 heuristic;
- AI/HTTP presence;
- side-effect node types;
- hardcoded URLs/emails/Google Sheet IDs;
- placeholders;
- conservative findings such as TLS verification disabled, exported credential references, error trigger, wait/follow-up pattern, workflow static data, possible literal secrets.

### Important

The index is a **discovery accelerator**, not a security scanner and not a legal opinion. Every P0/P1 candidate still passes:

`DISCOVERED → LICENSE_CHECKED → INSPECTED → HARDENED → TESTED → APPROVED_BASELINE`.

Any candidate that fails remains preserved under `no-pass-verified/` with its evidence and re-entry condition.

### Raw corpus policy

External repositories should be cloned/downloaded into `.external-cache/`, which is gitignored. The public repository stores our metadata, findings and original implementations; it does not blindly mirror external copyrighted workflow code.
