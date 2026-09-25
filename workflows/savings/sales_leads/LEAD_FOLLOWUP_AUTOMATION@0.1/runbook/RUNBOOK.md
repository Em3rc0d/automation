# Runbook — Lead Follow-up

Monitor source freshness, number of open leads scanned, due stages, messages sent, missing contacts, do-not-contact exclusions, provider retries, incidents and variable cost.

Common failures:
1. lead source connector stale;
2. message provider unavailable;
3. missing/invalid contact;
4. follow-up anchor timestamp missing;
5. status/consent not synchronized;
6. stage configuration changed incompatibly;
7. stage state persisted but outbound result uncertain.

Operator response: inspect tenant + lead + stage + trace → preserve consent guard → repair connector/config → replay with the same stage idempotency key → verify exactly one outbound action and one counted SavingsEvent.
