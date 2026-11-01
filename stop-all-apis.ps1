<#
.SYNOPSIS
    Stops every service started by run-all-apis.ps1 / run-bro.bat (Thakurg.API, thakurg-web).
.DESCRIPTION
    Run this before using App-Database\DatabaseInitializer to drop/rebuild a database.
    DatabaseInitializer's drop-and-rebuild prompt ("Database 'X' already exists. Drop and
    rebuild it? [y/N]") can fail or leave the running APIs holding stale connections if they're
    still up and connected to that database, so stop them first.

    Asks for confirmation, then finds whatever is listening on each service's port and stops it.
    Safe to run even if some (or none) of the services are currently running.
#>

$ErrorActionPreference = 'Stop'

$apps = @(
    @{ Name = "Thakurg.API"; Port = 7001 }
    @{ Name = "thakurg-web"; Port = 4200 }
)

Write-Host ""
Write-Host "This will stop all running thakurg.com services:" -ForegroundColor Cyan
foreach ($app in $apps) {
    Write-Host ("  - {0,-16} (port {1})" -f $app.Name, $app.Port)
}
Write-Host ""
Write-Host "Do this before recreating the database with App-Database\DatabaseInitializer," -ForegroundColor DarkGray
Write-Host "so the drop-and-rebuild prompt isn't fighting active connections from these services." -ForegroundColor DarkGray
Write-Host ""

$answer = Read-Host "Stop them now? [y/N]"
if ($answer -notmatch '^(y|yes)$') {
    Write-Host "Cancelled - nothing was stopped." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
$stoppedAny = $false

foreach ($app in $apps) {
    $conns = Get-NetTCPConnection -LocalPort $app.Port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host "[$($app.Name)] not running (nothing listening on port $($app.Port))" -ForegroundColor DarkGray
        continue
    }

    $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $pids) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        $procName = if ($proc) { $proc.ProcessName } else { "pid $processId" }
        Write-Host "[$($app.Name)] stopping $procName (pid $processId) on port $($app.Port)" -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        $stoppedAny = $true
    }
}

Write-Host ""
if ($stoppedAny) {
    Write-Host "Done. You can now run App-Database\DatabaseInitializer safely." -ForegroundColor Green
}
else {
    Write-Host "Nothing was running - already safe to run App-Database\DatabaseInitializer." -ForegroundColor Green
}
