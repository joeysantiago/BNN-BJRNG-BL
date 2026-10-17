<#
.SYNOPSIS
    Optionally (re)creates the database, then starts Thakurg.API and the
    thakurg-web Angular app, one after another, all inside this single terminal window.
.DESCRIPTION
    Run this from the repository root (or just double-click run-bro.bat)
    instead of starting each project individually in its own terminal.

    First asks whether to run App-Database\DatabaseInitializer. That project's own
    drop-and-rebuild prompt needs no services already connected to the database, so it runs in
    the foreground, before any app is started - not as a background job like the apps below.

    Each app is started as a background job. The script waits for an app's
    port to come up (i.e. it has finished building and is actually listening)
    before starting the next one, printing a clear "READY" line as it goes.
    Once all apps are launched, their console output is streamed here,
    prefixed with the app name, so you can watch everything from one window.

    Press Ctrl+C to stop watching logs (the apps themselves are also stopped).
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = $PSScriptRoot

$databaseInitializerProject = Join-Path $root "App-Database\DatabaseInitializer\DatabaseInitializer.csproj"

if (Test-Path $databaseInitializerProject) {
    Write-Host ""
    $runDb = Read-Host "Run the Database Initializer (create/reset the database) before starting the apps? [y/N]"
    if ($runDb -match '^(y|yes)$') {
        Write-Host ""
        Write-Host "Running Database Initializer..." -ForegroundColor Cyan

        # DatabaseInitializer is a plain console app (Host.CreateApplicationBuilder), which resolves
        # its content root - and so appsettings.json/ConnectionStrings - from the process's current
        # working directory, not from wherever --project points. `dotnet run --project` here would
        # inherit this script's own cwd (the repo root) and silently fail to find the MSSQLServer / AzureSQLConnection strings.
        # Running from inside the project's own folder is what actually works.
        # DOTNET_ENVIRONMENT picks appsettings.Development.json (local SQL Server). Set QA / UAT / Live yourself to target those.
        $previousEnvironment = $env:DOTNET_ENVIRONMENT
        if (-not $env:DOTNET_ENVIRONMENT) { $env:DOTNET_ENVIRONMENT = 'Development' }
        Push-Location (Split-Path $databaseInitializerProject -Parent)
        try {
            dotnet run
        }
        finally {
            Pop-Location
            $env:DOTNET_ENVIRONMENT = $previousEnvironment
        }

        Write-Host ""
        Write-Host "Database Initializer finished." -ForegroundColor Cyan
    }
}
else {
    Write-Warning "Database Initializer project not found at $databaseInitializerProject - skipping."
}

$apps = @(
    @{ Name = "Thakurg.API"; Type = "dotnet"; Path = Join-Path $root "App-WebAPI\Thakurg\Thakurg.API\Thakurg.API.csproj"; Port = 7001; Url = "https://localhost:7001/swagger" }
    @{ Name = "thakurg-web"; Type = "npm";    Path = Join-Path $root "App-WebUI";                                          Port = 4200; Url = "http://localhost:4200" }
)

$colors = @{ "Thakurg.API" = "Green"; "thakurg-web" = "Blue" }

function Write-Prefixed {
    param($AppName, $Line)
    $color = $colors[$AppName]
    if (-not $color) { $color = "Gray" }
    Write-Host "[$AppName] " -NoNewline -ForegroundColor $color
    Write-Host $Line
}

function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSec = 180)
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $TimeoutSec) {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conn) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

$jobs = @()

foreach ($app in $apps) {
    if (-not (Test-Path $app.Path)) {
        Write-Warning "Skipping $($app.Name): path not found at $($app.Path)"
        continue
    }

    Write-Host ""
    Write-Prefixed $app.Name "Starting..."

    if ($app.Type -eq "dotnet") {
        $job = Start-Job -Name $app.Name -ScriptBlock {
            param($proj)
            dotnet run --project $proj --launch-profile https
        } -ArgumentList $app.Path
    }
    else {
        $nodeModules = Join-Path $app.Path "node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Prefixed $app.Name "node_modules not found - running npm ci..."
            Push-Location $app.Path
            try {
                npm ci
                if ($LASTEXITCODE -ne 0) { Write-Warning "npm ci exited with code $LASTEXITCODE" }
            }
            finally {
                Pop-Location
            }
        }

        # The dev server renders pages on the server too and calls the API over https://localhost:7001. Node does not trust the
        # ASP.NET Core development certificate (even when Windows does), so allow it for this local dev process only.
        $job = Start-Job -Name $app.Name -ScriptBlock {
            param($dir)
            Set-Location $dir
            $env:NODE_TLS_REJECT_UNAUTHORIZED = '0'
            npm start
        } -ArgumentList $app.Path
    }
    $jobs += $job

    if (Wait-ForPort -Port $app.Port) {
        Write-Prefixed $app.Name "READY -> $($app.Url)"
    }
    else {
        Write-Prefixed $app.Name "did not come up within the timeout - check the streamed logs below for errors."
    }
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " All apps launched. Streaming live logs below (Ctrl+C to stop)." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    while ($true) {
        foreach ($job in $jobs) {
            # Warnings that ng / dotnet write to stderr arrive as error records. With $ErrorActionPreference = 'Stop' they would
            # end this loop and stop every app, so keep going and print them like any other line.
            Receive-Job -Job $job -ErrorAction Continue 2>&1 | ForEach-Object {
                $line = if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_ }
                Write-Prefixed $job.Name $line
            }
        }
        Start-Sleep -Milliseconds 300
    }
}
finally {
    Write-Host ""
    Write-Host "Stopping all apps..." -ForegroundColor Cyan
    $jobs | Stop-Job -ErrorAction SilentlyContinue

    # Stop-Job only kills the PowerShell job wrapper, not the actual "dotnet run" /
    # "npm start" child process it launched, so the real app can be left running and
    # holding its port. Find and kill whatever is still listening on each app's port.
    foreach ($app in $apps) {
        $conns = Get-NetTCPConnection -LocalPort $app.Port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            Write-Prefixed $app.Name "Killing leftover process $($conn.OwningProcess) still holding port $($app.Port)"
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }

    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
}
