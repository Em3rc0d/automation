# Bare-metal Linux deployment

The supported operational recommendation is still Docker, even on a bare-metal server or VM. Native npm/systemd installation creates more host coupling and a larger upgrade surface.

## Preferred layout

```text
/opt/automation/                 git checkout
/opt/automation/cases/case-003/deployment
/var/lib/docker/                 Docker-managed volumes
/etc/automation/                 optional root-only environment/secret references
```

Use `LINUX-DOCKER.md`.

## If containers are prohibited

A native installation is an exception path, not the reference path.

Required responsibilities become yours:

- pin Node.js to a version supported by the pinned n8n release;
- pin the exact n8n package version;
- create a dedicated unprivileged Linux user;
- configure PostgreSQL separately;
- create a systemd service;
- configure TLS/reverse proxy separately;
- persist `N8N_ENCRYPTION_KEY` outside the unit file;
- manage n8n upgrades and Node.js upgrades independently;
- preserve execution/binary data directories;
- reproduce the same environment contract;
- run the same backup/restore and smoke tests.

Example unit shape, with secrets omitted:

```ini
[Unit]
Description=n8n
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
User=n8n
Group=n8n
EnvironmentFile=/etc/automation/n8n.env
WorkingDirectory=/var/lib/n8n
ExecStart=/usr/local/bin/n8n start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

This example is a service shape, not a certification. Validate compatibility with the pinned n8n release before using it in production.

## Why Docker remains the reference

Docker gives the repository a stable unit of deployment:

```text
same image tag
same environment names
same workflow artifacts
same backup contract
same reverse-proxy contract
same smoke tests
```

That makes Railway, a VPS and an on-prem Linux VM differ mainly in networking and storage primitives rather than application installation.
