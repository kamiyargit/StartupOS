# Upload built tarball + compose files to VPS, then load images and start kartin stack.
# Does NOT prune or restart cuty-platform containers (isolated deploy).
# Set $env:VPS_HOST, $env:VPS_USER; optional: $env:VPS_PATH (default /opt/kartin), $env:CUTY_PLATFORM_PATH (default /opt/cuty-platform).
# Run from repo root: .\scripts\upload-and-deploy.ps1
#   .\scripts\upload-and-deploy.ps1 -SkipNginxUpdate   # skip cuty-platform nginx reload
param(
    [switch]$SkipNginxUpdate
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

. (Join-Path $PSScriptRoot 'lib\vps-ssh.ps1')
. (Join-Path $PSScriptRoot 'lib\test-vps-env.ps1')
. (Join-Path $PSScriptRoot 'lib\verify-vps-deploy.ps1')

$OutDir = if ($env:OUT_DIR) { $env:OUT_DIR } else { Join-Path $Root "dist" }
$TarName = "kartin-images.tar"
$TarPath = Join-Path $OutDir $TarName

$VPS_HOST = $env:VPS_HOST
$VPS_USER = $env:VPS_USER
$VPS_PATH = if ($env:VPS_PATH) { $env:VPS_PATH } else { "/opt/kartin" }
$CUTY_PLATFORM_PATH = if ($env:CUTY_PLATFORM_PATH) { $env:CUTY_PLATFORM_PATH } else { "/opt/cuty-platform" }
$VPS_SSH_KEY = $env:VPS_SSH_KEY

if (-not $VPS_HOST) {
    Write-Host ""
    $VPS_HOST = Read-Host "VPS host or IP (e.g. 185.252.86.211)"
    if (-not $VPS_HOST) { Write-Error "VPS_HOST is required." }
}
if (-not $VPS_USER) {
    $VPS_USER = Read-Host "SSH user [default: root]"
    if (-not $VPS_USER) { $VPS_USER = "root" }
}

if ($VPS_PATH -notmatch '^/') {
    Write-Host ""
    Write-Host "VPS_PATH must be an absolute path (e.g. /opt/kartin), not '$VPS_PATH'." -ForegroundColor Red
    exit 1
}

$Remote = "${VPS_USER}@${VPS_HOST}"

if (-not (Test-Path $TarPath)) {
    Write-Error "Tarball not found: $TarPath. Run .\scripts\build-for-vps.ps1 first."
}
if (-not (Test-Path "docker-compose.prod.yml")) {
    Write-Error "Not found: docker-compose.prod.yml"
}
if (-not (Test-Path "docker/nginx.conf")) {
    Write-Error "Not found: docker/nginx.conf"
}
if (-not (Test-Path "nginx/expenses.cuty.center.conf")) {
    Write-Error "Not found: nginx/expenses.cuty.center.conf"
}

$deployExitCode = 0

try {
    Initialize-VpsSshSession -VpsHost $VPS_HOST -VpsUser $VPS_USER -SshKey $VPS_SSH_KEY

    Write-Host ""
    Write-Host "Deploy target : ${VPS_PATH} (kartin stack)" -ForegroundColor Cyan
    Write-Host "Cuty platform : ${CUTY_PLATFORM_PATH} (nginx only - expenses.cuty.center)" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Checking server has .env at ${VPS_PATH}/.env ..."
    Assert-VpsExitCode (Invoke-VpsSsh "test -f ${VPS_PATH}/.env") "Missing ${VPS_PATH}/.env on the VPS."

    Write-Host "Checking Cuty prod Docker network exists ..."
    $netCheck = Invoke-VpsSsh "docker network inspect cuty-platform_cuty-network >/dev/null 2>&1 || docker network inspect cuty-network >/dev/null 2>&1"
    if ($netCheck -ne 0) {
        Write-Host "[WARN] cuty-platform Docker network not found. Start Cuty prod stack first:" -ForegroundColor Yellow
        Write-Host "  cd ${CUTY_PLATFORM_PATH} && docker compose -f docker-compose.prod.yml up -d" -ForegroundColor Yellow
        $cont = Read-Host "Continue anyway? (y/N)"
        if ($cont -notmatch '^[yY]') { exit 1 }
    }

    Assert-VpsExitCode (Invoke-VpsSsh "mkdir -p ${VPS_PATH}/docker ${VPS_PATH}/nginx") "Failed to create ${VPS_PATH} on VPS."

    $tarSizeMb = [Math]::Round((Get-Item $TarPath).Length / 1MB, 1)
    Write-Host "Uploading tarball (${tarSizeMb} MB) to ${Remote}:${VPS_PATH} ..." -ForegroundColor DarkGray
    Assert-VpsExitCode (Invoke-VpsScp $TarPath "${Remote}:${VPS_PATH}/") "Failed to upload tarball."

    Assert-VpsExitCode (Invoke-VpsScp "docker-compose.prod.yml" "${Remote}:${VPS_PATH}/") "Failed to upload compose file."
    Assert-VpsExitCode (Invoke-VpsScp "docker/nginx.conf" "${Remote}:${VPS_PATH}/docker/") "Failed to upload internal nginx config."
    Assert-VpsExitCode (Invoke-VpsScp "docker/entrypoint.prod.sh" "${Remote}:${VPS_PATH}/docker/") "Failed to upload entrypoint."
    Assert-VpsExitCode (Invoke-VpsScp "nginx/expenses.cuty.center.conf" "${Remote}:${VPS_PATH}/nginx/") "Failed to upload cuty nginx snippet."
    Assert-VpsExitCode (Invoke-VpsScp "docker/ensure-prod-base-images.sh" "${Remote}:${VPS_PATH}/") "Failed to upload ensure-prod-base-images.sh."

    Write-Host "Validating ${VPS_PATH}/.env on VPS ..."
    $envText = Get-RemoteEnvFile -RemotePath "${VPS_PATH}/.env" -RemoteHost $VPS_HOST -RemoteUser $VPS_USER -SshOpts $script:VpsSshOpts
    $null = Assert-VpsExpensesEnv -EnvText $envText -Label "${VPS_PATH}/.env"
    $null = Invoke-VpsSsh "sed -i 's/\r$//' ${VPS_PATH}/.env ${VPS_PATH}/docker/entrypoint.prod.sh && chmod +x ${VPS_PATH}/docker/entrypoint.prod.sh"

    function Invoke-RemoteShell {
        param(
            [string]$Command,
            [string]$Status
        )
        if ($Status) {
            Write-Host $Status -ForegroundColor DarkGray
        }
        $code = Invoke-VpsSsh "cd ${VPS_PATH} && ${Command}" -ShowOutput
        Assert-VpsExitCode $code "Remote command failed (exit $code): $Command"
    }

    Write-Host ""
    Write-Host "Loading images and starting kartin containers (isolated - no cuty-platform prune)..." -ForegroundColor Green
    Invoke-RemoteShell "sed -i 's/\r$//' ensure-prod-base-images.sh && sh ensure-prod-base-images.sh" "Ensuring postgres:16-alpine and nginx:alpine on VPS..."
    Invoke-RemoteShell "docker load -i ${TarName}" "Loading app image from tarball..."
    Invoke-RemoteShell "docker compose -f docker-compose.prod.yml up -d --no-build --pull never --force-recreate" "Starting kartin stack..."

    Write-Host "Ensuring proxy is on cuty-platform Docker network ..." -ForegroundColor DarkGray
    $null = Invoke-VpsSsh "docker network connect cuty-platform_cuty-network kartin-proxy 2>/dev/null || docker network connect cuty-network kartin-proxy 2>/dev/null || true"

    Write-Host "Waiting for app to become healthy (up to 2 min) ..." -ForegroundColor DarkGray
    if (-not (Wait-VpsExpensesAppHealthy)) {
        Invoke-VpsSsh "docker logs kartin-app --tail 50" -ShowOutput | Out-Host
        throw "kartin-app did not become healthy. Check logs above."
    }

    if (-not $SkipNginxUpdate) {
        if (-not (Test-CutyPlatformNginxRunning)) {
            Write-Host "[WARN] cuty-nginx-prod not running - skip nginx route install." -ForegroundColor Yellow
        } elseif ((Invoke-VpsSsh "test -d ${CUTY_PLATFORM_PATH}/nginx/conf.d") -eq 0) {
            Write-Host ""
            Write-Host "Installing expenses.cuty.center into Cuty nginx (additive - does not change other subdomains)..." -ForegroundColor Green
            $code = Invoke-CutyPlatformNginxReload -VpsExpensesPath $VPS_PATH -CutyPlatformPath $CUTY_PLATFORM_PATH
            if ($code -ne 0) {
                Write-Host "[WARN] Could not reload cuty-nginx. Existing cuty-platform routes are unchanged until nginx -t passes." -ForegroundColor Yellow
                Write-Host "  cp ${VPS_PATH}/nginx/expenses.cuty.center.conf ${CUTY_PLATFORM_PATH}/nginx/conf.d/" -ForegroundColor Yellow
                Write-Host "  cd ${CUTY_PLATFORM_PATH} && docker compose -f docker-compose.prod.yml exec nginx nginx -t" -ForegroundColor Yellow
            } else {
                Write-Host "  Cuty nginx reloaded with expenses.cuty.center" -ForegroundColor Green
            }
        } else {
            Write-Host "[WARN] ${CUTY_PLATFORM_PATH}/nginx/conf.d not found - copy nginx/expenses.cuty.center.conf manually." -ForegroundColor Yellow
        }
    }

    Write-CutyPlatformSafetyCheck -CutyPlatformPath $CUTY_PLATFORM_PATH

    Write-Host ""
    Write-Host "Removing uploaded tarball on VPS to free disk..." -ForegroundColor DarkGray
    Invoke-RemoteShell "rm -f ${TarName} && df -h / | tail -1"

    Write-Host ""
    Write-Host "Deploy finished." -ForegroundColor Green
    Write-Host "  URL   : https://expenses.cuty.center (after DNS A record + SSL on Cuty nginx)" -ForegroundColor Cyan
    Write-Host "  Check : ssh ${Remote} 'cd ${VPS_PATH} && docker compose -f docker-compose.prod.yml ps'" -ForegroundColor DarkGray
} catch {
    if ($_.Exception.Message -match '^Missing .+\.env on the VPS\.$') {
        Write-Host ""
        Write-Host $_.Exception.Message -ForegroundColor Red
        Write-Host "First-time setup:" -ForegroundColor Yellow
        Write-Host "  ssh ${Remote} 'mkdir -p ${VPS_PATH}'"
        Write-Host "  scp env.production.expenses.example ${Remote}:${VPS_PATH}/.env"
        Write-Host "  ssh ${Remote} 'nano ${VPS_PATH}/.env'  # set POSTGRES_PASSWORD, AUTH_SECRET, ADMIN_PASSWORD"
        Write-Host ""
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    $deployExitCode = 1
} finally {
    Close-VpsSshSession
}

exit $deployExitCode
