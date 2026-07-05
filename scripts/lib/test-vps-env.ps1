# Parse and validate a docker-compose .env file (production secrets).
# Used by repair/upload scripts instead of fragile remote shell greps.

function ConvertFrom-DotEnv {
    param([string]$Text)

    $vars = [ordered]@{}
    foreach ($rawLine in ($Text -split "`r?`n")) {
        $line = $rawLine.TrimEnd()
        if (-not $line -or $line.StartsWith('#')) { continue }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) { continue }

        $key = $line.Substring(0, $eq).Trim()
        $val = $line.Substring($eq + 1).Trim()

        if ($val.Length -ge 2 -and $val.StartsWith('"') -and $val.EndsWith('"')) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        $vars[$key] = $val
    }
    return $vars
}

function Test-DotEnvHasUnquotedHash {
    param(
        [string]$Text,
        [string]$Key
    )

    foreach ($rawLine in ($Text -split "`r?`n")) {
        $line = $rawLine.TrimEnd()
        if ($line -notmatch "^${Key}=(.+)$") { continue }
        $rhs = $Matches[1]
        if ($rhs.StartsWith('"')) { return $false }
        if ($rhs -match '#') { return $true }
    }
    return $false
}

function Test-VpsExpensesEnv {
    param(
        [string]$EnvText,
        [string]$Label = '.env'
    )

    $errors = [System.Collections.Generic.List[string]]::new()
    $vars = ConvertFrom-DotEnv -Text $EnvText

    if ($vars.Contains('DATABASE_URL')) {
        $errors.Add('Remove DATABASE_URL from .env - built at container start (docker/entrypoint.prod.sh)')
    }

    $required = @(
        @{ Key = 'POSTGRES_PASSWORD'; Min = 8 },
        @{ Key = 'AUTH_SECRET'; Min = 32 },
        @{ Key = 'ADMIN_PASSWORD'; Min = 8 }
    )

    foreach ($item in $required) {
        $key = $item.Key
        $min = $item.Min

        if (Test-DotEnvHasUnquotedHash -Text $EnvText -Key $key) {
            $errors.Add("${key} contains # outside double quotes (docker truncates at #)")
            continue
        }

        if (-not $vars.Contains($key)) {
            $errors.Add("Missing ${key}=")
            continue
        }

        $val = [string]$vars[$key]
        if ([string]::IsNullOrWhiteSpace($val)) {
            $errors.Add("${key} is empty")
            continue
        }

        if ($val.Length -lt $min) {
            $errors.Add("${key} is too short ($($val.Length) chars, need ${min}+)")
            continue
        }

        if ($val -match '^(change-me|CHANGE_ME|CHANGEME|your-|replace-with-)') {
            $errors.Add("${key} still uses a placeholder value")
        }
    }

    return [PSCustomObject]@{
        Ok = ($errors.Count -eq 0)
        Errors = $errors
        Vars = $vars
        Label = $Label
    }
}

function Write-VpsExpensesEnvCheck {
    param($Result)

    if ($Result.Ok) {
        Write-Host "[OK]   $($Result.Label) secrets valid" -ForegroundColor Green
        Write-Host "       POSTGRES_PASSWORD ($($Result.Vars.POSTGRES_PASSWORD.Length) chars)" -ForegroundColor DarkGray
        Write-Host "       AUTH_SECRET ($($Result.Vars.AUTH_SECRET.Length) chars)" -ForegroundColor DarkGray
        Write-Host "       ADMIN_PASSWORD ($($Result.Vars.ADMIN_PASSWORD.Length) chars)" -ForegroundColor DarkGray
        return
    }

    Write-Host "[FAIL] $($Result.Label) validation:" -ForegroundColor Red
    foreach ($err in $Result.Errors) {
        Write-Host "       - $err" -ForegroundColor Red
    }
}

function Get-RemoteEnvFile {
    param(
        [string]$RemotePath,
        [string]$RemoteHost,
        [string]$RemoteUser,
        [string[]]$SshOpts
    )

    $remote = "${RemoteUser}@${RemoteHost}"
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $content = & ssh @SshOpts $remote "cat $RemotePath" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Cannot read ${RemotePath} on VPS (exit $LASTEXITCODE)."
        }
        return ($content | Out-String)
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Assert-VpsExpensesEnv {
    param(
        [string]$EnvText,
        [string]$Label = '.env'
    )

    $result = Test-VpsExpensesEnv -EnvText $EnvText -Label $Label
    Write-VpsExpensesEnvCheck -Result $result
    if (-not $result.Ok) {
        throw "Invalid ${Label} on VPS."
    }
    return $result
}
