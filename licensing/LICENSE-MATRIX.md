# License and Commercial Reuse Matrix

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

This is an engineering gate, not legal advice. Exact customer/commercial terms must be rechecked before production because licenses and vendor terms can change.

| Resource | Observed license/terms | Allowed baseline posture |
|---|---|---|
| Our original control-plane code/docs | project-owned | normal proprietary/open decision later |
| n8n | Sustainable Use / commercial licensing applies | use as runtime only under a deployment model confirmed compatible with current n8n terms; do not assume client-hosting/embedding is free |
| Activepieces OSS portions | MIT outside EE/commercial areas per project notices | mine connector architecture/code only when exact file/package license is compatible |
| invoice2data | MIT | strong reusable/reference candidate with attribution/license preserved |
| Docling | MIT codebase; model licenses can differ | code/reference allowed subject to exact component/model license |
| docTR | Apache-2.0 | reusable/reference candidate with notices preserved |
| Chatwoot core | MIT with enterprise directory split | API/integration/reference preferred; verify exact files before reuse |
| ERPNext/Frappe ecosystem | GPLv3 components | integrate via APIs/reference patterns; do not copy GPL code into proprietary modules without accepting obligations |
| Twenty | AGPL/commercial split | integration/reference unless exact component license supports intended reuse |
| Formbricks | AGPL/commercial restrictions | integration/reference; no casual white-label/code copying |
| Cal.com | open/commercial split depending components/features | integration/reference; verify exact package/files before reuse |
| External n8n template aggregators | repository license may not prove per-template provenance | raw redistribution blocked until provenance/license cohort is established |
| n8n.io community templates | platform/template terms and original provenance must be checked per artifact | pattern mining is allowed; raw redistribution/copy into approved library requires rights verification |

## n8n commercial gate

Current n8n guidance states that hosting/managing client workflows and credentials in our own instance can require an Enterprise/commercial license, while embedding/white-label use can require an Embed license. Consulting on a client's own instance is treated differently. Authority to recheck before launch:

- https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- https://docs.n8n.io/sustainable-use-license/

Therefore ADR-0002 does **not** mean “n8n is free for our business model.” It means n8n is the preferred initial engine **conditional on a compliant commercial deployment**.

## Promotion gate

Before any external artifact reaches `APPROVED_BASELINE`, its manifest must state:
- source URL/repository;
- exact source commit/blob/hash when available;
- observed license;
- provenance confidence;
- whether raw code was copied, adapted or only used as conceptual evidence;
- attribution/notices required;
- redistribution/commercial-use decision;
- reviewer/date.

Unknown/incompatible items remain preserved in `no-pass-verified/`; they are never deleted simply because they cannot be shipped.
