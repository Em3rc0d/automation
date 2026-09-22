# Observability and incidents

## Minimum operational signals

### n8n

Track:

```text
service up/down
deploy status
workflow execution failures
webhook HTTP status
execution latency
execution backlog/concurrency
disk/volume usage
DB availability
credential/authentication failures
```

n8n provides a security audit through `n8n audit`. Run it after material configuration changes and periodically in production.

### CASE-003

Track durable database decisions rather than relying only on n8n logs:

```text
provider message received
duplicate/replay decision
AUTH_REQUIRED / VERIFICATION_REQUIRED
challenge created
delivery sent/failed
verification success/failure/expiry
membership/permission creation
invoice lookup decision
```

Never put raw OTP or full trusted-contact destinations in observability data.

## Logging

Production logs should include:

```text
timestamp
environment
workflow ID
execution/trace ID
decision
safe error category
provider message ID where appropriate
masked subject/destination where needed
```

Do not log:

```text
credential payloads
authorization headers
API keys
N8N_ENCRYPTION_KEY
raw OTP
full supplier email
full personal test email
SAP source rows that are not necessary for diagnosis
```

## Incident classes

### Provider ingress down

Check DNS/TLS, public webhook path, active workflow, HMAC credential binding, provider subscription and replay ledger.

### Supabase/RPC down

Check HTTPS reachability, publishable key class, RPC header credential and database function existence. Do not substitute a service-role secret into client-facing flows.

### n8n DB/storage pressure

Pause non-critical workflows, inspect pruning/volume usage, back up before deleting execution data.

### Mail failure

Classify separately:

```text
network egress
DNS
TLS
authentication
sender policy
recipient rejection
provider API quota
internal Gate-10 error
```

The Railway Gate-10 evidence is an example of a network-egress failure, not an authentication failure.

## Evidence discipline

Every certification or incident closure should answer:

```text
what changed
which commit/deployment
which database migration
what was tested
what remained unchanged
what failed
what was cleaned up
what remains uncertified
```
