<#
.SYNOPSIS
    Makes the Android app(s) in one go and asks what to build: debug or production, the all-in-one Thakurg app or the separate
    apps, and which API they talk to.
.DESCRIPTION
    Double-click build-app.bat (or run this script) and answer three questions:

      1. Build type   Debug (installs side by side for testing) or Production (signed release APK, ..\thakurg-Apps\keystore).
      2. Apps         Thakurg all-in-one, every separate app (Creta, Nexon, YouTube, SnapKhata, My Tasks, SnapTracker), both, or a list you type.
      3. API          qa.thakurg.com, uat.thakurg.com, thakurg.com (live) or any other address you type.

    Then it:
      a. builds App-WebUI of the thakurg folder (must be on banni-linux; it never switches branches) with that environment
         (npm run build:qa / build:uat / build:live). For another address it builds the live settings and swaps the API address in the output.
      b. checks the build points at the chosen API, empties thakurg-Apps\thakurg-android\www and copies the build in (without the service worker files),
      c. runs thakurg-android\build.ps1 (cap sync + Gradle) for the chosen apps,
      d. copies every APK to thakurg-Apps\output\<app>-<api>-<debug|release>.apk.

    Nothing is committed and no branch is changed.
    The chosen API must allow the origin https://localhost (Cors:AllowedOrigins), or login fails inside the app.
.PARAMETER Type
    debug or release - skips question 1.
.PARAMETER App
    thakurg, separate, both, or a list such as creta,nexon - skips question 2.
.PARAMETER Api
    qa, uat, live, or a full address such as https://dev.example.com/api - skips question 3.
.PARAMETER Yes
    Do not ask for the final confirmation.
.EXAMPLE
    .\build-app.ps1
.EXAMPLE
    .\build-app.ps1 -Type release -App both -Api live -Yes
#>
param(
    [ValidateSet('', 'debug', 'release')]
    [string]$Type = '',
    [string]$App = '',
    [string]$Api = '',
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$allInOne = 'thakurg'
$separateApps = @('creta', 'nexon', 'youtube', 'khata', 'tasks', 'tracker')
$appNames = @{ thakurg = 'Thakurg (all in one)'; creta = 'Creta audio'; nexon = 'Nexon audio'; youtube = 'YouTube player'; khata = 'SnapKhata'; tasks = 'My Tasks'; tracker = 'SnapTracker' }
$knownApis = [ordered]@{
    qa   = 'https://qa.thakurg.com/api'
    uat  = 'https://uat.thakurg.com/api'
    live = 'https://thakurg.com/api'
}

# Runs a native tool. Windows PowerShell 5.1 turns any stderr line into an error under 'Stop', so judge by exit code only.
function Invoke-Native([string]$What, [scriptblock]$Cmd) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $Cmd 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $prev }
    if ($LASTEXITCODE) { throw "$What failed (exit $LASTEXITCODE)" }
}

function Read-Choice([string]$Question, [string[]]$Options, [int]$Default) {
    Write-Host ""
    Write-Host $Question -ForegroundColor Cyan
    for ($i = 0; $i -lt $Options.Count; $i++) {
        $mark = if ($i + 1 -eq $Default) { ' (Enter)' } else { '' }
        Write-Host ("   [{0}] {1}{2}" -f ($i + 1), $Options[$i], $mark)
    }
    while ($true) {
        $answer = Read-Host "Choice"
        if ($answer -eq 'q') { exit 0 }
        if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
        $n = 0
        if ([int]::TryParse($answer, [ref]$n) -and $n -ge 1 -and $n -le $Options.Count) { return $n }
        Write-Host "Type a number from 1 to $($Options.Count) (q = quit)." -ForegroundColor Yellow
    }
}

function Resolve-AppList([string]$Text) {
    $t = $Text.Trim().ToLowerInvariant()
    if ($t -eq 'thakurg' -or $t -eq 'all-in-one') { return @($allInOne) }
    if ($t -eq 'separate') { return $separateApps }
    if ($t -eq 'both' -or $t -eq 'all') { return @($allInOne) + $separateApps }
    $list = @($t -split '[,\s]+' | Where-Object { $_ } | Select-Object -Unique)
    foreach ($a in $list) {
        if (-not $appNames.ContainsKey($a)) { throw "Unknown app '$a'. Use thakurg, creta, nexon, youtube, khata, tasks or tracker." }
    }
    return $list
}

function Get-ApiTag([string]$Url) {
    foreach ($k in $knownApis.Keys) { if ($knownApis[$k] -eq $Url) { return $k } }
    return ([Uri]$Url).Host -replace '[^A-Za-z0-9.-]', '' -replace '\.', '-'
}

# ---- Folders ---------------------------------------------------------------------------------------

# Layout: <root>\thakurg (banni-linux), <root>\thakurg-branches\..., <root>\thakurg-Apps (Android project and tools).
$hereFolder = (& git -C $PSScriptRoot rev-parse --show-toplevel 2>$null)
if (-not $hereFolder) { throw "This folder is not inside the thakurg git repository." }
$hereParent = Split-Path $hereFolder.Replace('/', '\') -Parent
if ((Split-Path $hereParent -Leaf) -ieq 'thakurg-branches') { $rootFolder = Split-Path $hereParent -Parent } else { $rootFolder = $hereParent }
$source = Join-Path $rootFolder 'thakurg'
$android = Join-Path $rootFolder 'thakurg-Apps\thakurg-android'
$output = Join-Path $rootFolder 'thakurg-Apps\output'
$web = Join-Path $source 'App-WebUI'

if (-not (Test-Path (Join-Path $android 'build.ps1'))) { throw "Android project not found: $android" }
$branch = (& git -C $source branch --show-current).Trim()
if ($branch -ne 'banni-linux') { throw "$source is on '$branch', not 'banni-linux'. Switch it yourself first; this script never changes branches." }

# ---- 1-3. Questions --------------------------------------------------------------------------------

Write-Host ""
Write-Host "==================== Build the Android app ====================" -ForegroundColor Cyan
Write-Host "Web app from: $web ($branch)"

if (-not $Type) {
    $c = Read-Choice "1. Build type?" @('Debug   - for testing (debug key, can be installed over any debug build)', 'Production - signed release APK (keystore in thakurg-Apps\keystore)') 1
    $Type = if ($c -eq 2) { 'release' } else { 'debug' }
}
$release = $Type -eq 'release'

if ($App) {
    $apps = Resolve-AppList $App
} else {
    $c = Read-Choice "2. Which app(s)?" @(
        'Thakurg - all in one (every app in one APK, with the SMS reader)',
        "All separate apps ($($separateApps -join ', '))",
        'Both - Thakurg and every separate app',
        'Let me type the list (e.g. creta,khata)') 1
    switch ($c) {
        1 { $apps = @($allInOne) }
        2 { $apps = $separateApps }
        3 { $apps = @($allInOne) + $separateApps }
        4 {
            while ($true) {
                $typed = Read-Host "Apps (thakurg, creta, nexon, youtube, khata, tasks, tracker)"
                try { $apps = Resolve-AppList $typed; if ($apps.Count -gt 0) { break } } catch { Write-Host $_.Exception.Message -ForegroundColor Yellow }
            }
        }
    }
}

if ($Api) {
    if ($knownApis.Contains($Api.ToLowerInvariant())) { $apiUrl = $knownApis[$Api.ToLowerInvariant()] } else { $apiUrl = $Api }
} else {
    $labels = @($knownApis.Keys | ForEach-Object { "{0,-5} {1}" -f $_.ToUpper(), $knownApis[$_] }) + 'Other - type the address'
    $c = Read-Choice "3. Which API should the app talk to?" $labels 1
    if ($c -le $knownApis.Count) {
        $apiUrl = @($knownApis.Values)[$c - 1]
    } else {
        $apiUrl = ''
        while (-not $apiUrl) {
            $typed = (Read-Host "API address (e.g. https://dev.thakurg.com/api)").Trim()
            if ($typed -notmatch '^https?://') { $typed = "https://$typed" }
            $uri = $null
            if ([Uri]::TryCreate($typed, 'Absolute', [ref]$uri)) { $apiUrl = $typed } else { Write-Host "Not a valid address." -ForegroundColor Yellow }
        }
    }
}
$apiUrl = $apiUrl.TrimEnd('/')
if ($apiUrl -notmatch '^https?://') { throw "API address must start with https:// - got '$apiUrl'." }
$apiTag = Get-ApiTag $apiUrl
$buildConfig = if ($knownApis.Contains($apiTag)) { $apiTag } else { 'live' }

if ($release) {
    $props = Join-Path $rootFolder 'thakurg-Apps\keystore\keystore.properties'
    if (-not (Test-Path $props)) { throw "Production build needs the signing key: $props not found." }
}

$typeLabel = if ($release) { 'Production (signed release)' } else { 'Debug' }
Write-Host ""
Write-Host "About to build:" -ForegroundColor Cyan
Write-Host "   Type : $typeLabel"
Write-Host "   Apps : $(($apps | ForEach-Object { $appNames[$_] }) -join ', ')"
Write-Host "   API  : $apiUrl"
Write-Host "   APKs : $output\<app>-$apiTag-$Type.apk"
if ($apiUrl -match '^http://') { Write-Host "   ! http:// - the app (https://localhost) will block plain-http API calls." -ForegroundColor Yellow }
Write-Host "   The API must allow the origin https://localhost in Cors:AllowedOrigins, or login fails in the app." -ForegroundColor DarkYellow
if (-not $Yes) {
    $confirm = Read-Host "Proceed? (y/N)"
    if ($confirm -notmatch '^(y|yes)$') {
        Write-Host "Cancelled. Nothing was built." -ForegroundColor Yellow
        exit 0
    }
}

# ---- a. Web build ----------------------------------------------------------------------------------

Write-Host ""
Write-Host "---- Web build (npm run build:$buildConfig) ----" -ForegroundColor Cyan
Push-Location $web
try {
    if (-not (Test-Path (Join-Path $web 'node_modules\@angular\core'))) { Invoke-Native 'npm ci' { npm ci --no-audit --no-fund } }
    Invoke-Native "npm run build:$buildConfig" { npm run "build:$buildConfig" }
} finally { Pop-Location }

$dist = Join-Path $web 'dist\thakurg\browser'
if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw "The build did not make $dist\index.html." }

# Another address: the live build with its apiBaseUrl swapped (the string sits once in the bundled environment object).
if (-not $knownApis.Contains($apiTag)) {
    $from = $knownApis['live']
    $changed = 0
    foreach ($file in Get-ChildItem $dist -Recurse -File -Filter *.js) {
        $text = [IO.File]::ReadAllText($file.FullName)
        # The minifier may write the string with ", ' or ` quotes.
        $pattern = 'apiBaseUrl:(["''`])' + [regex]::Escape($from) + '\1'
        if ($text -match $pattern) {
            $text = [regex]::Replace($text, $pattern, { param($m) 'apiBaseUrl:' + $m.Groups[1].Value + $apiUrl + $m.Groups[1].Value })
            [IO.File]::WriteAllText($file.FullName, $text, (New-Object Text.UTF8Encoding $false))
            $changed++
        }
    }
    if ($changed -eq 0) { throw "Could not find apiBaseUrl '$from' in the build to swap it for $apiUrl." }
    Write-Host "API address swapped to $apiUrl in $changed file(s)."
}
if (-not (Select-String -Path (Join-Path $dist '*.js') -Pattern $apiUrl -SimpleMatch -Quiet)) { throw "The build does not point at $apiUrl." }

# ---- b. www = exactly this build ------------------------------------------------------------------

$www = Join-Path $android 'www'
if (-not (Test-Path $www)) { New-Item -ItemType Directory $www | Out-Null }
Get-ChildItem $www -Force | Remove-Item -Recurse -Force
Copy-Item (Join-Path $dist '*') $www -Recurse -Force
foreach ($sw in 'ngsw-worker.js', 'ngsw.json') {
    $file = Join-Path $www $sw
    if (Test-Path $file) { Remove-Item $file -Force }
}
Write-Host "www: $((Get-ChildItem $www -Recurse -File).Count) files ($branch, $apiTag)"

# ---- c. APKs ---------------------------------------------------------------------------------------

# The old APKs are deleted first: Gradle updates them in place, and files removed since (an older build's songs) would stay as dead space.
$apkRoot = Join-Path $android 'android\app\build\outputs\apk'
if (Test-Path $apkRoot) { Remove-Item $apkRoot -Recurse -Force }
Write-Host ""
Write-Host "---- Android build ($($apps -join ', '), $Type) ----" -ForegroundColor Cyan
& (Join-Path $android 'build.ps1') -Release:$release -App $apps

# ---- d. Copy to output -----------------------------------------------------------------------------

if (-not (Test-Path $output)) { New-Item -ItemType Directory $output | Out-Null }
Write-Host ""
Write-Host "==================== APKs ====================" -ForegroundColor Cyan
foreach ($a in $apps) {
    $apk = Get-ChildItem (Join-Path $apkRoot "$a\$Type") -Filter *.apk -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $apk) {
        Write-Host ("   {0,-22} NOT FOUND" -f $appNames[$a]) -ForegroundColor Red
        continue
    }
    $target = Join-Path $output "$a-$apiTag-$Type.apk"
    Copy-Item $apk.FullName $target -Force
    Write-Host ("   {0,-22} {1}" -f $appNames[$a], $target) -ForegroundColor Green
}
Write-Host ""
