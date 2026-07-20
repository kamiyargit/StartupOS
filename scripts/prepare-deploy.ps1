# Pre-flight checks before build/upload/deploy. Run from repo root: .\scripts\prepare-deploy.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== StartupOS - deploy preflight ===" -ForegroundColor Cyan
Write-Host ""

$ok = $true

$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Docker is not running. Start Docker Desktop and retry." -ForegroundColor Red
    $ok = $false
} else {
    Write-Host "[OK]   Docker daemon is reachable" -ForegroundColor Green
}

foreach ($path in @(
    "docker-compose.prod.yml",
    "docker/Dockerfile",
    "docker/nginx.conf",
    "nginx/expenses.cuty.center.conf",
    "pnpm-lock.yaml"
)) {
    if (Test-Path $path) {
        Write-Host "[OK]   $path" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Missing $path" -ForegroundColor Red
        $ok = $false
    }
}

if (Test-Path ".env") {
    Write-Host "[OK]   Local .env exists (optional for build-time compose substitution)" -ForegroundColor Green
} else {
    Write-Host "[INFO] No local .env - build still works; runtime secrets live on VPS at /opt/kartin/.env" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Isolation reminders:" -ForegroundColor DarkGray
Write-Host "  VPS path     : /opt/kartin (NOT /opt/cuty-platform)" -ForegroundColor DarkGray
Write-Host "  Subdomain    : expenses.cuty.center" -ForegroundColor DarkGray
Write-Host "  Docker stack : kartin (no host 80/443; joins cuty-platform network for TLS nginx only)" -ForegroundColor DarkGray
Write-Host ""

if (-not $ok) {
    Write-Host "Fix the failures above, then run:" -ForegroundColor Red
    Write-Host "  .\scripts\build-for-vps.ps1"
    exit 1
}

Write-Host "Ready to build. Next steps:" -ForegroundColor Cyan
Write-Host "  1. .\scripts\build-for-vps.ps1"
Write-Host "  2. `$env:VPS_HOST = 'YOUR_IP'; `$env:VPS_USER = 'root'; .\scripts\upload-and-deploy.ps1"
Write-Host "  Or one-shot: .\scripts\build-and-deploy-to-vps.ps1"
Write-Host ""
Write-Host "First deploy: copy env.production.expenses.example to /opt/kartin/.env on the VPS." -ForegroundColor DarkGray
Write-Host ""
