# 10 — LICENSE_CHECKED

Candidates here have a documented legal/provenance decision.

## Required manifest fields

- license status;
- commercial use: YES / NO / UNKNOWN / CONDITIONAL;
- redistribution: YES / NO / UNKNOWN / CONDITIONAL;
- attribution requirements;
- evidence URLs/files;
- provenance caveats;
- decision: `ALLOW_ADAPT`, `REFERENCE_ONLY`, or `REJECT`.

## Important rule

A repository-level license does not automatically prove that every aggregated workflow was authored under that license.

For aggregation repositories, inspect the workflow's actual provenance or treat it as `REFERENCE_ONLY` until evidence exists.

## Exit gate → INSPECTED

Only `ALLOW_ADAPT` workflows advance as code candidates.

`REFERENCE_ONLY` can remain indexed for ideas but cannot become a copied commercial baseline.
