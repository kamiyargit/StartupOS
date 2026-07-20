# Shared post-deploy checks for kartin + cuty-platform safety.

function Get-VpsSshOutput {
    param([Parameter(Mandatory)][string]$RemoteCommand)

    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $out = & ssh @script:VpsSshOpts $script:VpsSshRemote $RemoteCommand 2>&1
        return [PSCustomObject]@{
            Output = ($out | Out-String).Trim()
            ExitCode = [int]$LASTEXITCODE
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Wait-VpsExpensesAppHealthy {
    param(
        [string]$ContainerName = 'kartin-app',
        [int]$MaxAttempts = 24,
        [int]$SleepSeconds = 5
    )

    for ($i = 1; $i -le $MaxAttempts; $i++) {
        $result = Get-VpsSshOutput "docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}' ${ContainerName} 2>/dev/null"
        $health = $result.Output.Trim()
        if (-not $health) { $health = 'unknown' }
        Write-Host "  app health: $health" -ForegroundColor DarkGray
        if ($health -eq 'healthy') { return $true }
        if ($health -eq 'unhealthy') { return $false }
        Start-Sleep -Seconds $SleepSeconds
    }
    return $false
}

function Test-CutyPlatformNginxRunning {
    param([string]$NginxContainer = 'cuty-nginx-prod')

    $result = Get-VpsSshOutput "docker inspect -f '{{.State.Running}}' ${NginxContainer} 2>/dev/null"
    return ($result.ExitCode -eq 0 -and $result.Output -eq 'true')
}

function Invoke-CutyPlatformNginxReload {
    param(
        [string]$VpsExpensesPath = '/opt/kartin',
        [string]$CutyPlatformPath = '/opt/cuty-platform'
    )

    $cmd = @"
cp ${VpsExpensesPath}/nginx/expenses.cuty.center.conf ${CutyPlatformPath}/nginx/conf.d/expenses.cuty.center.conf && \
cd ${CutyPlatformPath} && \
docker compose -f docker-compose.prod.yml exec -T nginx nginx -t && \
docker compose -f docker-compose.prod.yml restart nginx
"@
    return (Invoke-VpsSsh $cmd -ShowOutput)
}

function Write-CutyPlatformSafetyCheck {
    param(
        [string]$CutyPlatformPath = '/opt/cuty-platform',
        [string]$MainHost = 'cuty.center',
        [string]$NginxContainer = 'cuty-nginx-prod'
    )

    Write-Host "Verifying cuty-platform is intact (no stack restart, nginx only) ..." -ForegroundColor Yellow

    if (-not (Test-CutyPlatformNginxRunning -NginxContainer $NginxContainer)) {
        Write-Host "[WARN] ${NginxContainer} is not running. Expenses may work internally but public TLS routing needs Cuty nginx." -ForegroundColor Yellow
        return
    }

    $nginxTest = Get-VpsSshOutput "cd ${CutyPlatformPath} && docker compose -f docker-compose.prod.yml exec -T nginx nginx -t 2>&1"
    if ($nginxTest.ExitCode -eq 0) {
        Write-Host "[OK]   Cuty nginx config test passed" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Cuty nginx -t failed:" -ForegroundColor Yellow
        Write-Host $nginxTest.Output -ForegroundColor DarkGray
    }

    $mainProbe = Get-VpsSshOutput "docker exec ${NginxContainer} wget -qO- --timeout=8 --header='Host: ${MainHost}' http://127.0.0.1/ 2>&1 | head -c 120"
    if ($mainProbe.ExitCode -eq 0 -and $mainProbe.Output.Length -gt 0) {
        Write-Host "[OK]   ${MainHost} still responds via cuty-nginx" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Could not probe ${MainHost} from cuty-nginx (site may use HTTPS redirect only)" -ForegroundColor Yellow
    }

    $expProbe = Get-VpsSshOutput "docker exec ${NginxContainer} wget -qO- --timeout=8 --header='Host: expenses.cuty.center' http://kartin-proxy/login 2>&1 | head -c 120"
    if ($expProbe.ExitCode -eq 0 -and $expProbe.Output.Length -gt 0) {
        Write-Host "[OK]   expenses.cuty.center reachable from cuty-nginx" -ForegroundColor Green
    } else {
        Write-Host "[WARN] expenses.cuty.center probe from cuty-nginx failed" -ForegroundColor Yellow
        Write-Host "       Ensure kartin-proxy is on cuty-platform_cuty-network" -ForegroundColor DarkGray
    }
}
