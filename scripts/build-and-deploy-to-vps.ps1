# One-shot: build prod image locally, then upload to VPS and start cuty-expenses stack.
# Run by double-clicking run-deploy.bat or: .\scripts\build-and-deploy-to-vps.ps1
#   .\scripts\build-and-deploy-to-vps.ps1 -ReDownloadPackages
#   .\scripts\build-and-deploy-to-vps.ps1 -SkipNginxUpdate
# If VPS_HOST/VPS_USER are not set, you will be prompted. SSH password is asked once during upload/deploy.
# Prerequisite: Docker Desktop (or Docker daemon) must be running.
param(
    [switch]$ReDownloadPackages,
    [switch]$NoCache,
    [switch]$SkipNginxUpdate
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Stop-DeployOnFailure {
    param(
        [int]$ExitCode,
        [string]$StepLabel,
        [string]$StepName
    )
    if ($ExitCode -eq 0) { return }
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  DEPLOY FAILED - $StepName" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  $StepLabel failed (exit code $ExitCode)." -ForegroundColor Red
    Write-Host "  Deploy stopped; later steps were not run." -ForegroundColor Red
    Write-Host ""
    exit $ExitCode
}

$null = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Docker is not running or not reachable." -ForegroundColor Red
    Write-Host "Start Docker Desktop, wait until it is ready, then run this script again." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

if (-not $env:VPS_HOST) {
    Write-Host ""
    Write-Host "VPS connection (leave blank to use default):" -ForegroundColor Cyan
    $env:VPS_HOST = Read-Host "VPS host or IP (e.g. 185.252.86.211)"
    if (-not $env:VPS_HOST) { Write-Error "VPS_HOST is required." }
}
if (-not $env:VPS_USER) {
    $defaultUser = "root"
    $env:VPS_USER = Read-Host "SSH user [default: $defaultUser]"
    if (-not $env:VPS_USER) { $env:VPS_USER = $defaultUser }
}
if (-not $env:VPS_PATH) {
    $defaultPath = "/opt/cuty-expenses"
    $entered = Read-Host "Expenses app path on server [default: $defaultPath]"
    $env:VPS_PATH = if ($entered) { $entered.Trim() } else { $defaultPath }
}
if (-not $env:CUTY_PLATFORM_PATH) {
    $defaultPlatform = "/opt/cuty-platform"
    $entered = Read-Host "Cuty platform path on server [default: $defaultPlatform]"
    $env:CUTY_PLATFORM_PATH = if ($entered) { $entered.Trim() } else { $defaultPlatform }
}
if ($env:VPS_PATH -notmatch '^/') {
    Write-Error "VPS_PATH must start with / (e.g. /opt/cuty-expenses). Got: $($env:VPS_PATH)"
}

Write-Host ""
Write-Host "=== Cuty Expenses deploy (expenses.cuty.center) ===" -ForegroundColor Cyan
Write-Host "  App path      : $($env:VPS_PATH)" -ForegroundColor DarkGray
Write-Host "  Platform path : $($env:CUTY_PLATFORM_PATH)" -ForegroundColor DarkGray
Write-Host ""

Write-Host "=== Step 0: Preflight checks ===" -ForegroundColor Green
& (Join-Path $ScriptDir "prepare-deploy.ps1")
Stop-DeployOnFailure -ExitCode $LASTEXITCODE -StepLabel "Step 0 (preflight checks)" -StepName "Preflight"

Write-Host "=== Step 1: Building production image ===" -ForegroundColor Green
$buildArgs = @{}
if ($ReDownloadPackages) { $buildArgs['ReDownloadPackages'] = $true }
if ($NoCache) { $buildArgs['NoCache'] = $true }
& (Join-Path $ScriptDir "build-for-vps.ps1") @buildArgs
Stop-DeployOnFailure -ExitCode $LASTEXITCODE -StepLabel "Step 1 (production image build)" -StepName "Build"

Write-Host ""
Write-Host "=== Step 2: Uploading and deploying to VPS ===" -ForegroundColor Green
Write-Host "SSH password will be asked once at the start of this step for $($env:VPS_USER)@$($env:VPS_HOST)." -ForegroundColor Yellow
Write-Host ""
$uploadArgs = @{}
if ($SkipNginxUpdate) { $uploadArgs['SkipNginxUpdate'] = $true }
$uploadExitCode = 0
& (Join-Path $ScriptDir "upload-and-deploy.ps1") @uploadArgs
if ($null -ne $LASTEXITCODE) { $uploadExitCode = $LASTEXITCODE }
Stop-DeployOnFailure -ExitCode $uploadExitCode -StepLabel 'Step 2 (upload and deploy)' -StepName 'Upload and Deploy'

Write-Host ""
Write-Host "Deploy finished successfully." -ForegroundColor Green
Write-Host "  https://expenses.cuty.center" -ForegroundColor Cyan
Write-Host "Uploaded Docker tarball was removed from the VPS ($($env:VPS_PATH)) to save disk space." -ForegroundColor DarkGray
Write-Host "Local copy is still in dist\ (delete manually if you want to reclaim space on this PC)." -ForegroundColor DarkGray
