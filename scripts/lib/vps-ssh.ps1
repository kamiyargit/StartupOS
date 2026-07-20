# Shared SSH/SCP helpers for VPS deploy scripts.
# Password auth: prompted once, then reused via SSH_ASKPASS (Windows) or ControlMaster (Unix).

$script:VpsSshMultiplexEnabled = $false
$script:VpsSshRemote = $null
$script:VpsSshControlPath = $null
$script:VpsSshOpts = @()
$script:VpsScpOpts = @()
$script:VpsAskPassDir = $null

function Test-VpsWindows {
    return ($IsWindows -eq $true) -or ($env:OS -eq 'Windows_NT')
}

function Get-VpsSshBaseOpts {
    param([string]$SshKey)

    $opts = @(
        '-o', 'ConnectTimeout=10',
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'ServerAliveInterval=15',
        '-o', 'ServerAliveCountMax=40'
    )
    if ($SshKey -and (Test-Path $SshKey)) {
        $opts += @('-i', $SshKey)
    }
    return $opts
}

function Invoke-VpsSshQuiet {
    param([string[]]$SshArguments)

    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        & ssh @SshArguments *> $null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

function Test-VpsSshPasswordless {
    param(
        [string[]]$BaseOpts,
        [string]$Remote
    )

    $batchArgs = $BaseOpts + @('-o', 'BatchMode=yes', $Remote, 'echo cuty-ssh-ok')
    return (Invoke-VpsSshQuiet -SshArguments $batchArgs) -eq 0
}

function Enable-VpsSshAskPass {
    param([string]$Password)

    $script:VpsAskPassDir = Join-Path $env:TEMP "kartin-ssh-$([Guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Force -Path $script:VpsAskPassDir | Out-Null

    $pwFile = Join-Path $script:VpsAskPassDir 'password.txt'
    [System.IO.File]::WriteAllText($pwFile, $Password)

    $askPassPs1 = Join-Path $script:VpsAskPassDir 'askpass.ps1'
    @"
`$path = Join-Path `$PSScriptRoot 'password.txt'
Write-Output ([System.IO.File]::ReadAllText(`$path))
"@ | Set-Content -Path $askPassPs1 -Encoding UTF8

    $askPassCmd = Join-Path $script:VpsAskPassDir 'askpass.cmd'
    @"
@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$askPassPs1"
"@ | Set-Content -Path $askPassCmd -Encoding ASCII

    $env:SSH_ASKPASS = $askPassCmd
    $env:SSH_ASKPASS_REQUIRE = 'force'
}

function Disable-VpsSshAskPass {
    Remove-Item Env:SSH_ASKPASS -ErrorAction SilentlyContinue
    Remove-Item Env:SSH_ASKPASS_REQUIRE -ErrorAction SilentlyContinue
    if ($script:VpsAskPassDir -and (Test-Path $script:VpsAskPassDir)) {
        Remove-Item -Recurse -Force $script:VpsAskPassDir -ErrorAction SilentlyContinue
        $script:VpsAskPassDir = $null
    }
}

function Read-VpsSshPassword {
    param([string]$Remote)

    Write-Host ''
    Write-Host "SSH password for ${Remote} (entered once, reused for all upload/remote commands):" -ForegroundColor Cyan
    $secure = Read-Host -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Test-VpsSshMaster {
    param([string[]]$BaseOpts)

    $checkArgs = $BaseOpts + @('-o', "ControlPath=$($script:VpsSshControlPath)", '-O', 'check', $script:VpsSshRemote)
    return (Invoke-VpsSshQuiet -SshArguments $checkArgs) -eq 0
}

function Initialize-VpsSshMultiplex {
    param([string[]]$BaseOpts)

    $mux = @(
        '-o', 'ControlMaster=auto',
        '-o', "ControlPath=$($script:VpsSshControlPath)",
        '-o', 'ControlPersist=2h'
    )
    $script:VpsSshOpts = $BaseOpts + $mux
    $script:VpsScpOpts = $BaseOpts + $mux

    if (Test-VpsSshMaster -BaseOpts $BaseOpts) {
        $script:VpsSshMultiplexEnabled = $true
        Write-Host '  Reusing existing SSH session.' -ForegroundColor DarkGray
        return $true
    }

    Write-Host ''
    Write-Host "Opening SSH session to $($script:VpsSshRemote) (enter password once if prompted)..." -ForegroundColor Cyan

    $masterOpts = $BaseOpts + @(
        '-o', 'ControlMaster=yes',
        '-o', "ControlPath=$($script:VpsSshControlPath)",
        '-o', 'ControlPersist=2h',
        $script:VpsSshRemote,
        'echo cuty-ssh-ok'
    )
    $null = & ssh @masterOpts 2>&1

    if ($LASTEXITCODE -eq 0) {
        $script:VpsSshMultiplexEnabled = $true
        return $true
    }

    return $false
}

function Initialize-VpsSshSession {
    param(
        [Parameter(Mandatory)]
        [string]$VpsHost,
        [Parameter(Mandatory)]
        [string]$VpsUser,
        [string]$SshKey
    )

    $script:VpsSshRemote = "${VpsUser}@${VpsHost}"
    $base = Get-VpsSshBaseOpts -SshKey $SshKey
    $script:VpsSshOpts = $base
    $script:VpsScpOpts = $base
    $script:VpsSshMultiplexEnabled = $false

    if (Test-VpsSshPasswordless -BaseOpts $base -Remote $script:VpsSshRemote) {
        Write-Host "  SSH key auth OK for $($script:VpsSshRemote)." -ForegroundColor DarkGray
        return
    }

    if (Test-VpsWindows) {
        $password = Read-VpsSshPassword -Remote $script:VpsSshRemote
        Enable-VpsSshAskPass -Password $password

        $null = & ssh @base $script:VpsSshRemote 'echo cuty-ssh-ok' 2>&1
        if ($LASTEXITCODE -ne 0) {
            Disable-VpsSshAskPass
            throw "SSH connection to $($script:VpsSshRemote) failed."
        }

        Write-Host '  SSH password saved for this deploy (reused automatically).' -ForegroundColor Green
        return
    }

    $sshDir = Join-Path $env:HOME '.ssh'
    if (-not $sshDir) { $sshDir = Join-Path $env:USERPROFILE '.ssh' }
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
    }
    $script:VpsSshControlPath = Join-Path $sshDir 'kartin-deploy-%C'

    if (Initialize-VpsSshMultiplex -BaseOpts $base) {
        return
    }

    Write-Host '[WARN] SSH multiplexing unavailable; falling back to one-time password entry.' -ForegroundColor Yellow
    $script:VpsSshOpts = $base
    $script:VpsScpOpts = $base

    $password = Read-VpsSshPassword -Remote $script:VpsSshRemote
    Enable-VpsSshAskPass -Password $password

    $null = & ssh @base $script:VpsSshRemote 'echo cuty-ssh-ok' 2>&1
    if ($LASTEXITCODE -ne 0) {
        Disable-VpsSshAskPass
        throw "SSH connection to $($script:VpsSshRemote) failed."
    }

    Write-Host '  SSH password saved for this deploy (reused automatically).' -ForegroundColor Green
}

function Close-VpsSshSession {
    Disable-VpsSshAskPass

    if (-not $script:VpsSshMultiplexEnabled -or -not $script:VpsSshRemote) {
        return
    }

    $exitArgs = @('-o', "ControlPath=$($script:VpsSshControlPath)", '-O', 'exit', $script:VpsSshRemote)
    Invoke-VpsSshQuiet -SshArguments $exitArgs | Out-Null
    $script:VpsSshMultiplexEnabled = $false
}

function Invoke-VpsSsh {
    param(
        [Parameter(Mandatory)][string]$RemoteCommand,
        [switch]$ShowOutput
    )

    if ($ShowOutput) {
        & ssh @script:VpsSshOpts $script:VpsSshRemote $RemoteCommand
    } else {
        $null = & ssh @script:VpsSshOpts $script:VpsSshRemote $RemoteCommand 2>&1
    }
    return [int]$LASTEXITCODE
}

function Invoke-VpsScp {
    [CmdletBinding()]
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$ScpArguments)

    $null = & scp @script:VpsScpOpts @ScpArguments 2>&1
    return [int]$LASTEXITCODE
}

function Assert-VpsExitCode {
    param(
        [object]$ExitCode,
        [string]$Message
    )

    $code = if ($ExitCode -is [array]) { [int]($ExitCode[-1]) } else { [int]$ExitCode }
    if ($code -ne 0) {
        throw $Message
    }
}
