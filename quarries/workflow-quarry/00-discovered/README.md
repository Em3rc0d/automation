# 00 — DISCOVERED

Raw intake area for external/internal workflow candidates.

A candidate enters here when we have enough information to identify and retrieve it, but **no trust decision has been made**.

## Required before entry

- source URL;
- source repository/site/template ID where applicable;
- retrieval date;
- artifact hash;
- basic category/domain;
- provenance note;
- manifest created.

## Allowed contents

- original JSON snapshot when retrieval/copyright terms permit keeping a research copy;
- otherwise a metadata-only manifest pointing to the external source;
- setup notes/screenshots/text snippets written by us;
- no secrets.

## Exit gate → LICENSE_CHECKED

A maintainer must review:
- actual license terms;
- provenance/aggregation chain;
- commercial-use rights;
- redistribution rights;
- attribution obligations;
- whether we may adapt code or only use it as a conceptual reference.

If provenance/license cannot support adaptation, mark `REFERENCE_ONLY` or `REJECT` rather than promoting silently.
