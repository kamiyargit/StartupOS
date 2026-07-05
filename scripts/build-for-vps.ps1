# Build production Docker image locally and save to a tarball for VPS upload.
# Run from repo root: .\scripts\build-for-vps.ps1
#   .\scripts\build-for-vps.ps1 -ReDownloadPackages   # force fresh pnpm download
#   .\scripts\build-for-vps.ps1 -NoCache              # force full rebuild
# Output: dist\cuty-expenses-images.tar
param(
    [switch]$ReDownloadPackages,
    [switch]$NoCache
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "docker-compose.prod.yml"))) {
    Write-Error "Repo root (with docker-compose.prod.yml) not found."
    exit 1
}
Set-Location $Root

$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

function Format-Elapsed {
    param([TimeSpan]$Span)
    if ($Span.TotalMinutes -ge 1) {
        return '{0}m {1:D2}s' -f [int][Math]::Floor($Span.TotalMinutes), $Span.Seconds
    }
    return '{0}s' -f [int]$Span.TotalSeconds
}

$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Docker is not running or not reachable." -ForegroundColor Red
    Write-Host "Start Docker Desktop, wait until it is ready, then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$ComposeCmd = "docker compose"
try {
    & docker compose version 2>$null | Out-Null
} catch {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        $ComposeCmd = "docker-compose"
    } else {
        Write-Error "docker compose or docker-compose not found."
        exit 1
    }
}

$ProjectName = "cuty-expenses"
$OutDir = Join-Path $Root "dist"
$TarPath = Join-Path $OutDir "cuty-expenses-images.tar"
$AppImage = "cuty-expenses-app:latest"

$envFileArg = @()
if (Test-Path (Join-Path $Root ".env")) {
    $envFileArg = @("--env-file", ".env")
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cuty Expenses - Production Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Image    : $AppImage" -ForegroundColor White
Write-Host "  Project  : $ProjectName" -ForegroundColor White
Write-Host "  Subdomain: expenses.cuty.center" -ForegroundColor White
Write-Host ""
Write-Host "(Warnings about POSTGRES_PASSWORD etc. are OK - those are for runtime on the server.)" -ForegroundColor DarkGray
Write-Host ""

function Ensure-NodeAlpineImage {
    $target = 'node:22-alpine'
    docker image inspect $target 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] $target already local" -ForegroundColor DarkGray
        return $true
    }

    $candidates = @()
    if ($env:NODE_IMAGE -and $env:NODE_IMAGE -ne $target) {
        $candidates += $env:NODE_IMAGE
    }
    $candidates += @(
        'docker.arvancloud.ir/library/node:22-alpine',
        'docker.iranserver.com/library/node:22-alpine',
        'docker.haiocloud.com/library/node:22-alpine',
        'registry.docker.ir/library/node:22-alpine',
        'node:22-alpine'
    )

    Write-Host "  Pulling $target (Docker Hub often blocked - trying Iranian mirrors)..." -ForegroundColor Yellow
    foreach ($src in $candidates) {
        Write-Host "    trying $src ..." -ForegroundColor DarkGray
        docker pull $src 2>&1 | Out-Host
        if ($LASTEXITCODE -eq 0) {
            if ($src -ne $target) {
                docker tag $src $target 2>&1 | Out-Null
            }
            Write-Host "  [OK] $target ready (from $src)" -ForegroundColor Green
            return $true
        }
    }

    Write-Host "  [FAIL] Could not pull $target from any mirror." -ForegroundColor Red
    Write-Host "  Set NODE_IMAGE=docker.arvancloud.ir/library/node:22-alpine in .env" -ForegroundColor Yellow
    Write-Host "  Or add registry-mirrors in Docker Desktop (see DEPLOY_VPS.md)" -ForegroundColor Yellow
    return $false
}

if (-not (Ensure-NodeAlpineImage)) {
    exit 1
}
Write-Host ""

function Invoke-ComposeBuild {
    param([switch]$NoCacheBuild)
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    $composeArgs = @('-p', $ProjectName, '-f', 'docker-compose.prod.yml') + $envFileArg + @('build')
    if ($NoCacheBuild) { $composeArgs += '--no-cache' }
    $composeArgs += 'app'

    if ($ComposeCmd -eq 'docker compose') {
        & docker compose @composeArgs 2>&1 | ForEach-Object { Write-Host $_ }
    } else {
        & docker-compose @composeArgs 2>&1 | ForEach-Object { Write-Host $_ }
    }
    $code = $LASTEXITCODE

    $ErrorActionPreference = $prevEap
    return $code
}

$buildTimer = [System.Diagnostics.Stopwatch]::StartNew()
$noCache = $ReDownloadPackages.IsPresent -or $NoCache.IsPresent
$buildCode = Invoke-ComposeBuild -NoCacheBuild:$noCache
$buildTimer.Stop()

if ($buildCode -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED after $(Format-Elapsed $buildTimer.Elapsed)" -ForegroundColor Red
    Write-Host "  If Docker Hub returned 403, set in .env:" -ForegroundColor Yellow
    Write-Host "    NODE_IMAGE=docker.arvancloud.ir/library/node:22-alpine" -ForegroundColor Yellow
    Write-Host "    NPM_REGISTRY=https://npm.iranserver.com/repository/npm/" -ForegroundColor Yellow
    exit 1
}

docker image inspect $AppImage 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build did not produce $AppImage" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  OK: app image built in $(Format-Elapsed $buildTimer.Elapsed)" -ForegroundColor Green

Write-Host ""
Write-Host "Saving images to tarball..." -ForegroundColor Yellow
$saveTimer = [System.Diagnostics.Stopwatch]::StartNew()
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$imagesToSave = @($AppImage)
foreach ($base in @('postgres:16-alpine', 'nginx:alpine')) {
    docker image inspect $base 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $imagesToSave += $base
    }
}

$ErrorActionPreference = 'Continue'
& docker save $imagesToSave -o $TarPath
$saveExit = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
$saveTimer.Stop()

if ($saveExit -ne 0 -or -not (Test-Path $TarPath) -or (Get-Item $TarPath).Length -eq 0) {
    Write-Error "Could not save tarball: $TarPath"
    exit 1
}

$tarSize = [Math]::Round((Get-Item $TarPath).Length / 1MB, 1)
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Build time : $(Format-Elapsed $buildTimer.Elapsed)" -ForegroundColor White
Write-Host "  Tarball    : $TarPath (${tarSize} MB)" -ForegroundColor White
if ($imagesToSave.Count -lt 3) {
    Write-Host '  Note       : postgres/nginx not in tarball - VPS will pull via ensure-prod-base-images.sh' -ForegroundColor DarkGray
}
Write-Host ""
Write-Host '  Next: .\scripts\upload-and-deploy.ps1' -ForegroundColor Cyan
Write-Host '  Or:   .\scripts\build-and-deploy-to-vps.ps1' -ForegroundColor Cyan
Write-Host ""
