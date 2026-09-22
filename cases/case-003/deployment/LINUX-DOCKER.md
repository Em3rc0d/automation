# VPS / VM Linux with Docker Compose

This is the preferred portable self-hosted target.

## Minimum host

Recommended baseline for a small pilot:

```text
Linux: current Ubuntu/Debian LTS class distribution
CPU: 2 vCPU
RAM: 4 GiB
Disk: 30+ GiB SSD
public IPv4/IPv6: as required
DNS: one hostname for n8n
ports inbound: 22 restricted, 80/443 public
```

Actual sizing must be based on execution concurrency, binary payload sizes and retention.

## Install host packages

Install from the vendor-supported Docker repository for your Linux distribution:

```text
Docker Engine
Docker Compose plugin
git
curl
openssl
ca-certificates
postgresql-client
```

Do not install a second unmanaged n8n process through npm on the same host.

## Checkout

```bash
git clone https://github.com/Em3rc0d/automation.git
cd automation
git checkout case-003/s4hana-report-supplier-self-service
cd cases/case-003/deployment
cp .env.example .env
chmod 600 .env
cp Caddyfile.example Caddyfile
```

Fill `.env` locally. Never commit it.

## DNS

Create an A/AAAA record for `N8N_FQDN` pointing to the server.

Wait until DNS resolves before starting Caddy, otherwise certificate issuance can fail.

## Start

```bash
./scripts/preflight.sh
docker compose pull
docker compose up -d
docker compose ps
```

The Compose baseline provides:

```text
Caddy :80/:443
   |
   v
n8n :5678
   |
   v
PostgreSQL (n8n internal DB only)
```

CASE-003 business data remains in Supabase unless you explicitly choose and certify another business-DB profile.

## Firewall

Allow:

```text
22/tcp    only from operator/admin source networks
80/tcp    public for ACME redirect/challenge
443/tcp   public for editor/webhooks
```

Do not expose:

```text
5432/tcp PostgreSQL
5678/tcp n8n direct
```

The sample Compose file does not publish those ports publicly.

## First login

1. Open `https://<N8N_FQDN>/`.
2. Create the owner/admin.
3. Create runtime credentials with the exact stable names defined in `SECRETS-CREDENTIALS.md`.
4. Apply CASE-003 DB migrations.
5. Render/import CASE-003 workflows.
6. Verify webhooks.
7. Run smoke tests.
8. Only then point Kapso/provider traffic to the new endpoint.

## SMTP

A VPS/VM may allow 465/587, but do not assume it. Probe without credentials:

```bash
timeout 8 openssl s_client -connect smtp.gmail.com:465 -servername smtp.gmail.com </dev/null
timeout 8 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/587'
```

If the provider/firewall blocks SMTP, use HTTPS mail transport or a separate mail worker. Do not weaken firewall policy simply to make Gate 10 pass.

## Reboot behavior

The Compose services use `restart: unless-stopped`. Validate after a real host reboot:

```bash
sudo reboot
# reconnect
docker compose ps
curl -fsS https://$N8N_FQDN/ >/dev/null
```

A deployment is not portable until it survives reboot and restore drills.
