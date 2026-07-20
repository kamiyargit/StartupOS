# Fix 502 on expenses.cuty.center without a full image rebuild (compose + nginx only).
# For app image changes, run upload-and-deploy.ps1 after build-for-vps.ps1.
# Usage: .\scripts\repair-expenses-on-vps.ps1
param(
    [switch]$SkipNginxUpdate
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

. (Join-Path $PSScriptRoot 'lib\vps-ssh.ps1')
. (Join-Path $PSScriptRoot 'lib\test-vps-env.ps1')
. (Join-Path $PSScriptRoot 'lib\verify-vps-deploy.ps1')

$VPS_HOST = $env:VPS_HOST
$VPS_USER = $env:VPS_USER
$VPS_PATH = if ($env:VPS_PATH) { $env:VPS_PATH } else { "/opt/kartin" }
$CUTY_PLATFORM_PATH = if ($env:CUTY_PLATFORM_PATH) { $env:CUTY_PLATFORM_PATH } else { "/opt/cuty-platform" }
$CUTY_NETWORK = if ($env:CUTY_DOCKER_NETWORK) { $env:CUTY_DOCKER_NETWORK } else { "cuty-platform_cuty-network" }
$VPS_SSH_KEY = $env:VPS_SSH_KEY

if (-not $VPS_HOST) {
    $VPS_HOST = Read-Host "VPS host or IP"
    if (-not $VPS_HOST) { Write-Error "VPS_HOST is required." }
}
if (-not $VPS_USER) {
    $VPS_USER = Read-Host "SSH user [default: root]"
    if (-not $VPS_USER) { $VPS_USER = "root" }
}

function Invoke-Remote {
    param([string]$Command, [string]$Label)
    if ($Label) { Write-Host $Label -ForegroundColor DarkGray }
    $code = Invoke-VpsSsh $Command -ShowOutput
    return $code
}

try {
    Initialize-VpsSshSession -VpsHost $VPS_HOST -VpsUser $VPS_USER -SshKey $VPS_SSH_KEY

    Write-Host ""
    Write-Host "=== Repair expenses.cuty.center on ${VPS_HOST} ===" -ForegroundColor Cyan
    Write-Host ""

    Assert-VpsExitCode (Invoke-VpsSsh "test -f ${VPS_PATH}/.env") "Missing ${VPS_PATH}/.env on VPS."

    Write-Host "Uploading latest compose + nginx configs ..." -ForegroundColor Yellow
    Assert-VpsExitCode (Invoke-VpsScp "docker-compose.prod.yml" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/") "Failed to upload compose."
    Assert-VpsExitCode (Invoke-VpsScp "docker/nginx.conf" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/docker/") "Failed to upload internal nginx."
    Assert-VpsExitCode (Invoke-VpsScp "docker/entrypoint.prod.sh" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/docker/") "Failed to upload entrypoint."
    Assert-VpsExitCode (Invoke-VpsScp "nginx/expenses.cuty.center.conf" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/nginx/") "Failed to upload cuty nginx snippet."

    Write-Host "Checking required .env secrets (reading ${VPS_PATH}/.env) ..." -ForegroundColor Yellow
    $envText = Get-RemoteEnvFile -RemotePath "${VPS_PATH}/.env" -RemoteHost $VPS_HOST -RemoteUser $VPS_USER -SshOpts $script:VpsSshOpts
    try {
        $null = Assert-VpsExpensesEnv -EnvText $envText -Label "${VPS_PATH}/.env"
    } catch {
        Write-Host ""
        Write-Host "Fix ${VPS_PATH}/.env on the VPS, then rerun this script." -ForegroundColor Yellow
        Write-Host "  ssh ${VPS_USER}@${VPS_HOST} nano ${VPS_PATH}/.env" -ForegroundColor DarkGray
        throw
    }
    $null = Invoke-VpsSsh "sed -i 's/\r$//' ${VPS_PATH}/.env ${VPS_PATH}/docker/entrypoint.prod.sh && chmod +x ${VPS_PATH}/docker/entrypoint.prod.sh"

    Write-Host "Restarting kartin stack ..." -ForegroundColor Yellow
    $upCode = Invoke-Remote "cd ${VPS_PATH} && docker compose -f docker-compose.prod.yml up -d --pull never --force-recreate" "docker compose up -d ..."
    if ($upCode -ne 0) {
        Write-Host "docker compose up failed (exit $upCode). App logs:" -ForegroundColor Red
        Invoke-VpsSsh "docker logs kartin-app --tail 80" -ShowOutput | Out-Host
        exit 1
    }

    Write-Host "Ensuring proxy is on ${CUTY_NETWORK} ..." -ForegroundColor Yellow
    Invoke-Remote "docker network connect ${CUTY_NETWORK} kartin-proxy 2>/dev/null || true" "network connect (idempotent)"

    Write-Host "Waiting for app health (up to 2 min) ..." -ForegroundColor Yellow
    if (-not (Wait-VpsExpensesAppHealthy)) {
        Write-Host "App did not become healthy. App logs:" -ForegroundColor Red
        Invoke-VpsSsh "docker logs kartin-app --tail 80" -ShowOutput | Out-Host
        exit 1
    }

    if (-not $SkipNginxUpdate) {
        if (-not (Test-CutyPlatformNginxRunning)) {
            Write-Host "[WARN] cuty-nginx-prod not running - skipping nginx route install." -ForegroundColor Yellow
        } else {
            Write-Host "Installing Cuty nginx route for expenses.cuty.center (additive only) ..." -ForegroundColor Yellow
            $ngxCode = Invoke-CutyPlatformNginxReload -VpsExpensesPath $VPS_PATH -CutyPlatformPath $CUTY_PLATFORM_PATH
            if ($ngxCode -ne 0) {
                Write-Host "[WARN] Cuty nginx reload failed - existing cuty-platform routes unchanged until nginx -t passes." -ForegroundColor Yellow
            }
        }
    }

    Write-CutyPlatformSafetyCheck -CutyPlatformPath $CUTY_PLATFORM_PATH

    Write-Host ""
    Write-Host "Repair finished. Test: https://expenses.cuty.center/login" -ForegroundColor Green
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    Close-VpsSshSession
}
