# MK1 Static Rehearsal Surfaces

Status: **LOCAL DEMO SURFACE / NOT PRODUCTION UI**

The MK1 rehearsal already writes client/operator JSON projections. This renderer converts those files into static HTML that can be opened directly from disk.

No server, framework, npm dependency, CDN or paid hosting is required.

## Generate rehearsal evidence

```bash
python tools/savings/rehearse_pilot.py \
  --out .local/mk1-rehearsal \
  --json
```

## Render

```bash
python tools/savings/render_rehearsal_html.py \
  --input .local/mk1-rehearsal
```

Generated:

```text
.local/mk1-rehearsal/
├── index.html
├── client-portal.html
├── operator-console.html
├── report-manifest.json
└── source/
    ├── client-portal.json
    ├── operator-console.json
    └── summary.json
```

## Boundary

These pages prove presentation shape only. They do not provide:
- authentication;
- tenant RLS;
- production persistence;
- live provider state;
- client acceptance.

The renderer refuses inputs that do not explicitly carry `productionClaim=false`.


## Integrity verification

The renderer snapshots the three source projections and hashes both source + rendered files with SHA-256.

```bash
python tools/savings/render_rehearsal_html.py \
  --input .local/mk1-rehearsal \
  --verify \
  --json
```

The manifest is evidence of file integrity, not a digital signature or client approval.
