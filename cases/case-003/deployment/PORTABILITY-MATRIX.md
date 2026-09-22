# Portability matrix

## Components

| Component | State | Portable primitive | Notes |
|---|---|---|---|
| n8n | workflows, credentials, executions | pinned Docker image + DB/volume | keep encryption key stable |
| n8n internal DB | runtime metadata | PostgreSQL preferred; SQLite supported for current single-instance runtime | never confuse with CASE-003 business DB |
| CASE-003 business DB | suppliers, invoices, identities, verification, audit | PostgreSQL schema | current certified adapter is Supabase/PostgREST |
| Kapso/WhatsApp | external provider | HMAC/API credentials + webhook URL | provider binding is persisted in CASE-003 DB |
| SMTP | external transport | n8n SMTP credential | reachability depends on hosting network |
| HTTPS mail API | external transport | HTTP/n8n provider node | preferred on platforms where SMTP egress is blocked |
| TLS/ingress | public edge | Railway domain or Caddy/Nginx | webhook URL must be stable |
| backups | operational | DB dumps + volume snapshot + secret escrow | restore drill required |

## Platform comparison

| Requirement | Railway | VPS / cloud VM | Local Linux |
|---|---|---|---|
| Docker | managed build/runtime | install Docker Engine + Compose | install Docker Engine + Compose |
| public TLS | Railway domain/custom domain | Caddy/Nginx/Traefik | optional for local |
| persistent filesystem | Railway Volume | Docker named volume / host disk | Docker named volume |
| n8n internal PostgreSQL | Railway Postgres or external | Compose Postgres or managed | Compose Postgres |
| outbound HTTPS | expected | depends on firewall | host network |
| outbound SMTP | blocked in the observed Railway runtime | provider/firewall dependent | host/network dependent |
| backups | volume + DB backup | filesystem + pg_dump | filesystem + pg_dump |
| horizontal scale | use PostgreSQL/Redis before queue mode | PostgreSQL/Redis | usually unnecessary |

## Certified vs portable

`portable` means the repository contains enough contracts/artifacts to reproduce the design.

`certified` means that exact deployment path has real evidence.

Current evidence proves a Railway+n8n+Supabase+Kapso path through Gate 9. Gate 10 proved challenge creation and credential binding but discovered SMTP egress blockage from Railway.

A VPS/VM deployment is therefore portable but must produce its own deployment evidence before being called certified.

## Recommended choices

### New Railway deployment

Use:

```text
Railway service: n8n
n8n internal DB: managed PostgreSQL
CASE-003 DB: Supabase
mail: HTTPS API
public ingress: Railway domain/custom domain
```

### New VPS/VM deployment

Use:

```text
Docker Compose
Caddy
n8n pinned version
PostgreSQL for n8n internal state
Supabase for CASE-003 business state
SMTP or HTTPS mail after connectivity probe
```

### Disaster recovery target

A clean Linux VM with Docker should be able to restore the service from:

```text
repository checkout
+ environment/secrets from secret escrow
+ n8n DB backup
+ n8n filesystem/binary-data backup
+ CASE-003 DB backup or intact Supabase project
+ DNS/provider credentials
```
