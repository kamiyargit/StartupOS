# Deploy Kartin to VPS (`expenses.cuty.center`)

> **Note:** Self-hosted VPS deployment is temporarily disabled for the Kartin SaaS launch (`ENABLE_SELF_HOSTED=false` by default). This guide remains for future use when self-hosting is re-enabled.

This app runs as an **isolated Docker stack** beside Cuty Platform — it does not replace or restart the main platform containers.

## Isolation (no conflicts)

| Item | Cuty Platform | StartupOS (this app) |
|------|---------------|----------------------|
| VPS path | `/opt/cuty-platform` | `/opt/kartin` |
| Compose project | `cuty-platform` | `kartin` |
| Public ports | `80`, `443` (cuty-nginx) | **none** on host |
| Subdomain | cuty.center, api.*, admin.*, … | **expenses.cuty.center** only |
| DB | cuty-postgres-prod | kartin-db (separate volume) |
| Proxy container | cuty-nginx-prod | kartin-proxy (internal + cuty network) |

TLS terminates on **Cuty nginx**. This stack exposes HTTP only on the shared Docker network (`cuty-platform_cuty-network`).

## Prerequisites

1. **Cuty Platform** prod stack running on the VPS (`cuty-nginx-prod` on 80/443).
2. **DNS**: `expenses.cuty.center` → VPS IP (same as other `*.cuty.center` records).
3. **SSL**: Uses existing Cuty nginx certs (`nginx/ssl/` on platform path).
4. **Docker Desktop** running on your Windows PC for local image build.
5. **SSH** access to the VPS (`ssh` / `scp` in PATH).

## First-time VPS setup

```bash
ssh root@YOUR_VPS
mkdir -p /opt/kartin
```

From your PC (create the directory first — `scp` cannot create parent folders):

```powershell
ssh root@YOUR_VPS "mkdir -p /opt/kartin"
scp env.production.expenses.example root@YOUR_VPS:/opt/kartin/.env
ssh root@YOUR_VPS "nano /opt/kartin/.env"
```

Set at minimum:

- `POSTGRES_PASSWORD` — strong password
- `AUTH_SECRET` — long random string (32+ chars)
- `ADMIN_PASSWORD` — strong admin login password
- `NEXTAUTH_URL=https://expenses.cuty.center`

## Deploy from Windows

**Double-click:** `scripts\run-deploy.bat`

**Or PowerShell:**

```powershell
.\scripts\build-and-deploy-to-vps.ps1
```

**Steps only:**

```powershell
.\scripts\prepare-deploy.ps1
.\scripts\build-for-vps.ps1
$env:VPS_HOST = "YOUR_VPS_IP"
$env:VPS_USER = "root"
.\scripts\upload-and-deploy.ps1
```

Optional env vars:

- `VPS_PATH` — default `/opt/kartin`
- `CUTY_PLATFORM_PATH` — default `/opt/cuty-platform`
- `VPS_SSH_KEY` — path to SSH private key

Flags:

- `-ReDownloadPackages` — force fresh pnpm install in Docker build
- `-SkipNginxUpdate` — deploy app only, do not copy nginx config / restart cuty-nginx

## What the upload script does

1. Uploads image tarball + compose to `/opt/kartin`
2. Loads images and runs `docker compose -f docker-compose.prod.yml up -d`
3. Copies `nginx/expenses.cuty.center.conf` → `/opt/cuty-platform/nginx/conf.d/`
4. Runs `nginx -t` and restarts **only** the Cuty nginx container

It does **not** run `docker system prune` on the VPS (unlike the main platform deploy script).

## Cuty Platform safety

Deploy scripts are designed **not** to break the main Cuty stack:

| Action | cuty-platform | kartin |
|--------|---------------|---------------|
| `docker compose up` | Never run by these scripts | Only `/opt/kartin` |
| `docker system prune` | Never run | Never run |
| DB / app containers | Never restarted | Recreated on deploy |
| Nginx | **Only** `nginx -t` + restart `nginx` container | Internal proxy only |
| Config files | Adds **one** file: `nginx/conf.d/expenses.cuty.center.conf` | Own compose + `.env` |

If `nginx -t` fails after copying the expenses config, the reload command aborts and **existing Cuty routes stay as they were**.

After deploy/repair, scripts probe `cuty.center` and `expenses.cuty.center` from inside `cuty-nginx-prod`.

## Verify

```bash
# On VPS
cd /opt/kartin && docker compose -f docker-compose.prod.yml ps
curl -sI https://expenses.cuty.center | head -5
```

Login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

## Backup

```bash
cd /opt/kartin
docker compose -f docker-compose.prod.yml exec db pg_dump -U kartin kartin > backup.sql
```

## Troubleshooting

**403 Forbidden pulling `node:22-alpine` (Docker Hub blocked)**

The build script auto-pulls via Iranian mirrors. If it still fails:

1. Add to your local `.env` (used during `build-for-vps.ps1`):

```env
NODE_IMAGE=docker.iranserver.com/library/node:22-alpine
NPM_REGISTRY=https://npm.iranserver.com/repository/npm/
```

2. Or configure Docker Desktop registry mirrors (`Settings` → `Docker Engine`):

```json
{
  "registry-mirrors": [
    "https://docker.iranserver.com",
    "https://docker.arvancloud.ir",
    "https://registry.docker.ir"
  ]
}
```

Restart Docker Desktop, then retry `.\scripts\build-and-deploy-to-vps.ps1`.

**502 on expenses.cuty.center**

Quick fix (no image rebuild):

```powershell
$env:VPS_HOST = "YOUR_VPS_IP"
$env:VPS_USER = "root"
.\scripts\repair-expenses-on-vps.ps1
```

Common causes: missing `POSTGRES_PASSWORD` / `AUTH_SECRET` in `/opt/kartin/.env`, app crash on `prisma db push` (fixed with `--skip-generate` in entrypoint), or Cuty nginx not routing to `kartin-proxy`.

**502 on expenses.cuty.center (manual checks)**

- `docker compose -f docker-compose.prod.yml ps` in `/opt/kartin` — all services up?
- `docker network inspect cuty-platform_cuty-network` — is `kartin-proxy` attached?
- `docker logs kartin-app --tail 50`

**Missing .env**

```powershell
scp env.production.expenses.example root@VPS:/opt/kartin/.env
```

**Nginx config not applied**

```bash
cp /opt/kartin/nginx/expenses.cuty.center.conf /opt/cuty-platform/nginx/conf.d/
cd /opt/cuty-platform && docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml restart nginx
```

**Local dev** still uses port `5568` via `docker compose up` — production does not bind that port on the VPS host.

## Cloud installation (control + tenant planes)

StartupOS Cloud splits the same codebase into two deployments:

| Plane | Host | `STARTUPOS_PLANE` | Database |
|-------|------|-------------------|----------|
| Control | `setup.kartin.ir` | `control` | `DATABASE_URL_CONTROL` |
| Tenant | `{slug}.kartin.ir` | `tenant` | per-tenant `DATABASE_URL` |

Copy [`env.cloud.example`](env.cloud.example) and set:

- `DATABASE_URL_CONTROL` — control-plane registry (organizations, provisioning jobs)
- `TENANT_DATABASE_URL_TEMPLATE` — e.g. `postgresql://user:pass@db:5432/kartin_{slug}`
- `PROVISIONING_SECRET` — optional header `x-provisioning-secret` for provision API
- `SMS_PROVIDER=kavenegar` + `KAVENEGAR_API_KEY` in production; `dev` locally (OTP visible at `/api/dev/sms/latest`)

**DNS / nginx**

- `setup.kartin.ir` → control-plane container (setup wizard only)
- `*.kartin.ir` → tenant router (Host header → tenant stack)

**Local dev**

```bash
docker compose up db app control
# Tenant app:  http://localhost:5568
# Setup portal: http://localhost:5569/setup
```

Cloud tenant containers skip auto-seed on boot (`STARTUPOS_MODE=cloud`); Super Admin is created via the setup wizard provision step.
