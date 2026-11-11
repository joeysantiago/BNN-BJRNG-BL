<#
.SYNOPSIS
    Runs only App-Database\DatabaseInitializer (create / reset the database), without starting the API or the web app.
.DESCRIPTION
    Run this from the repository root, or double-click run-db.bat.

    The database type and connection string both come from App-Database\DatabaseInitializer\appsettings.Development.json:
      DatabaseProvider:UseLocalServer = true    -> ConnectionStrings:MSSQLServer        (local SQL Server)
      DatabaseProvider:UseAzureSqlServer = true -> ConnectionStrings:AzureSQLConnection (Azure SQL)
    The chosen connection string is checked first, then the initializer runs with DOTNET_ENVIRONMENT=Development.
    It asks, per app, whether to create its database objects, and whether to drop and rebuild existing ones.
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectFolder = Join-Path $PSScriptRoot "App-Database\DatabaseInitializer"
$settingsFile = Join-Path $projectFolder "appsettings.Development.json"

if (-not (Test-Path (Join-Path $projectFolder "DatabaseInitializer.csproj"))) {
    Write-Warning "Database Initializer project not found at $projectFolder"
    exit 1
}

if (-not (Test-Path $settingsFile)) {
    Write-Warning "Settings file not found at $settingsFile"
    exit 1
}

$settings = Get-Content $settingsFile -Raw | ConvertFrom-Json
$useLocal = [bool]$settings.DatabaseProvider.UseLocalServer
$useAzure = [bool]$settings.DatabaseProvider.UseAzureSqlServer

if ($useLocal -eq $useAzure) {
    Write-Warning "In $settingsFile exactly one of DatabaseProvider:UseLocalServer or DatabaseProvider:UseAzureSqlServer must be true."
    exit 1
}

if ($useAzure) {
    $providerName = "Azure SQL"
    $connectionKey = "AzureSQLConnection"
}
else {
    $providerName = "Local SQL Server"
    $connectionKey = "MSSQLServer"
}

$connectionString = $settings.ConnectionStrings.$connectionKey
if (-not $connectionString) {
    Write-Warning "ConnectionStrings:$connectionKey is empty in $settingsFile"
    exit 1
}

if ($connectionString -match '\{your_password\}|<password>') {
    Write-Warning "ConnectionStrings:$connectionKey in $settingsFile still has the password placeholder. Put the real password in it."
    exit 1
}

try {
    $builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder($connectionString)
}
catch {
    Write-Warning "ConnectionStrings:$connectionKey in $settingsFile is not a valid ADO.NET connection string: $($_.Exception.InnerException.Message)"
    exit 1
}

Write-Host ""
Write-Host "Database type : $providerName (from appsettings.Development.json)" -ForegroundColor Yellow
Write-Host "Server        : $($builder.DataSource)" -ForegroundColor Yellow
Write-Host "Database      : $($builder.InitialCatalog)" -ForegroundColor Yellow
if ($builder.UserID) { Write-Host "User          : $($builder.UserID)" -ForegroundColor Yellow }
if ($useAzure) { Write-Host "A paused free / serverless Azure database can take up to a minute to wake up." -ForegroundColor Gray }

# Environment variables override appsettings, so clear any left in this window from earlier runs; the file decides.
foreach ($name in 'ConnectionStrings__AzureSQLConnection', 'ConnectionStrings__MSSQLServer', 'DatabaseProvider__UseLocalServer', 'DatabaseProvider__UseAzureSqlServer') {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}
$env:DOTNET_ENVIRONMENT = 'Development'

Write-Host ""
Write-Host "Running Database Initializer..." -ForegroundColor Cyan

# The initializer reads appsettings*.json from its current working directory, so it runs from inside its own folder.
Push-Location $projectFolder
try {
    dotnet run
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Database Initializer finished." -ForegroundColor Cyan
