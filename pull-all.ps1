<#
.SYNOPSIS
    Fetches and pulls every branch folder (worktree or clone) in one go - without opening each folder.
.DESCRIPTION
    Run it from any branch folder (or double-click pull-all.bat).

    1. Finds every branch folder of this repository the same way commit-push-all.ps1 does: thakurg (banni-linux) and every folder
       inside thakurg-branches (Matrix, Features/App/*, Mojito), as git worktrees or separate clones of the same GitHub repository.
    2. Fetches each one and shows, per branch, how many commits it is behind / ahead of its upstream and any local changes.
    3. Lets you pick the branches (Enter = all that are behind) and asks a final y/N.
    4. In each picked folder: git pull --ff-only from the branch's own upstream.

    Only fast-forward pulls: no merge commits are made. A branch that has its own unpushed commits AND new commits on the server
    (diverged) is skipped and reported - sort it out by hand. Local uncommitted changes are kept; if a pulled file clashes with
    one of them, git refuses that pull and nothing in that folder changes.

    Branches are handled in release order: Matrix, Features/App/*, banni-linux, then the rest.
    The old stub branches (main, master, base, old-master) are never touched.
.PARAMETER Yes
    Pull every branch that is behind without asking.
.EXAMPLE
    .\pull-all.ps1
.EXAMPLE
    .\pull-all.ps1 -Yes
#>
param(
    [switch]$Yes
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$neverTouch = @('main', 'master', 'base', 'old-master')

function Invoke-Git([string]$Path, [string[]]$GitArgs) {
    $output = & git -C $Path -c core.quotepath=false @GitArgs 2>$null
    return @{ Output = @($output); Code = $LASTEXITCODE }
}

function Get-NormalPath([string]$Path) {
    return [System.IO.Path]::GetFullPath($Path.Replace('/', '\')).TrimEnd('\').ToLowerInvariant()
}

function Get-BranchOrder([string]$Branch) {
    if ($Branch -eq 'Matrix') { return 0 }
    if ($Branch -like 'Features/App/*') { return 1 }
    if ($Branch -eq 'banni-linux') { return 2 }
    return 3
}

# The same GitHub repository, written one way, so a separate clone of it counts as one of the branch folders.
function Get-RemoteKey([string]$Path) {
    $url = (& git -C $Path remote get-url origin 2>$null) | Select-Object -First 1
    if (-not $url) { return '' }
    return $url.Trim().TrimEnd('/').ToLowerInvariant() -replace '\.git$', ''
}

# ---- 1. Find every worktree folder ----------------------------------------------------------------

$commonDir = (& git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir 2>$null)
if (-not $commonDir) {
    Write-Host "This folder is not inside the thakurg git repository." -ForegroundColor Red
    exit 1
}
$commonDir = Get-NormalPath $commonDir

# Layout: <root>\thakurg (banni-linux) and <root>\thakurg-branches\<one folder per branch>. Each folder may be a worktree or its own clone.
$hereFolder = (& git -C $PSScriptRoot rev-parse --show-toplevel 2>$null).Replace('/', '\')
$hereParent = Split-Path $hereFolder -Parent
if ((Split-Path $hereParent -Leaf) -ieq 'thakurg-branches') { $rootFolder = Split-Path $hereParent -Parent } else { $rootFolder = $hereParent }
$mainFolder = Join-Path $rootFolder 'thakurg'
$branchesFolder = Join-Path $rootFolder 'thakurg-branches'
$remoteKey = Get-RemoteKey $hereFolder

$candidates = New-Object System.Collections.Generic.List[string]
foreach ($line in (& git -C $PSScriptRoot worktree list --porcelain 2>$null)) {
    if ($line -like 'worktree *') { $candidates.Add($line.Substring(9)) }
}
$candidates.Add($hereFolder)
$candidates.Add($mainFolder)
if (Test-Path $branchesFolder) {
    Get-ChildItem $branchesFolder -Directory | ForEach-Object { $candidates.Add($_.FullName) }
}

$seen = @{}
$worktrees = @()
foreach ($candidate in $candidates) {
    if (-not (Test-Path $candidate)) { continue }
    $top = (& git -C $candidate rev-parse --show-toplevel 2>$null)
    $common = (& git -C $candidate rev-parse --path-format=absolute --git-common-dir 2>$null)
    if (-not $top -or -not $common) { continue }
    $sameRepo = (Get-NormalPath $common) -eq $commonDir
    if (-not $sameRepo -and $remoteKey) { $sameRepo = (Get-RemoteKey $top) -eq $remoteKey }
    if (-not $sameRepo) { continue }
    $key = Get-NormalPath $top
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $branch = (& git -C $top branch --show-current 2>$null)
    if (-not $branch) {
        Write-Host "Skipping $top (detached HEAD, no branch)." -ForegroundColor DarkYellow
        continue
    }
    if ($neverTouch -contains $branch) { continue }
    $worktrees += [pscustomobject]@{ Path = $top.Replace('/', '\'); Branch = $branch; Common = (Get-NormalPath $common) }
}

$worktrees = $worktrees | Sort-Object @{ Expression = { Get-BranchOrder $_.Branch } }, Branch

# ---- 2. Fetch and compare -------------------------------------------------------------------------

Write-Host ""
Write-Host "Fetching..." -ForegroundColor Cyan
# Worktrees share one .git, so fetch once per repository (each separate clone has its own).
$fetched = @{}
foreach ($wt in $worktrees) {
    if ($fetched.ContainsKey($wt.Common)) { continue }
    $fetched[$wt.Common] = $true
    & git -C $wt.Path fetch --all --prune --quiet
    if ($LASTEXITCODE -ne 0) { Write-Host "   fetch FAILED in $($wt.Path)" -ForegroundColor Red }
}

$rows = @()
foreach ($wt in $worktrees) {
    $upstream = (Invoke-Git $wt.Path @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')).Output | Select-Object -First 1
    $ahead = 0
    $behind = 0
    if ($upstream) {
        $counts = (Invoke-Git $wt.Path @('rev-list', '--left-right', '--count', "$upstream...HEAD")).Output | Select-Object -First 1
        if ($counts) {
            $parts = $counts -split '\s+'
            $behind = [int]$parts[0]
            $ahead = [int]$parts[1]
        }
    }
    $files = @((Invoke-Git $wt.Path @('status', '--porcelain=v1')).Output | Where-Object { $_ })
    $rows += [pscustomobject]@{
        Path     = $wt.Path
        Branch   = $wt.Branch
        Upstream = $upstream
        Ahead    = $ahead
        Behind   = $behind
        Dirty    = $files.Count
    }
}

Write-Host ""
Write-Host "==================== Branches ====================" -ForegroundColor Cyan
$actionable = @()
foreach ($row in $rows) {
    $header = "{0}  ({1})" -f $row.Branch, $row.Path
    $notes = @()
    if ($row.Dirty -gt 0) { $notes += "$($row.Dirty) local change(s), kept" }
    if ($row.Ahead -gt 0) { $notes += "$($row.Ahead) commit(s) not pushed" }

    if (-not $row.Upstream) {
        Write-Host ""
        Write-Host "   $header" -ForegroundColor DarkGray
        Write-Host "      no upstream - skipped" -ForegroundColor DarkYellow
        continue
    }
    if ($row.Behind -eq 0) {
        Write-Host ""
        Write-Host "   $header" -ForegroundColor DarkGray
        $line = "      up to date with $($row.Upstream)"
        if ($notes.Count -gt 0) { $line = "$line ($($notes -join ', '))" }
        Write-Host $line -ForegroundColor DarkGray
        continue
    }
    if ($row.Ahead -gt 0) {
        Write-Host ""
        Write-Host "   $header" -ForegroundColor Red
        Write-Host ("      diverged: {0} behind and {1} ahead of {2} - skipped, pull/merge it by hand" -f $row.Behind, $row.Ahead, $row.Upstream) -ForegroundColor Red
        continue
    }
    $actionable += $row
    Write-Host ""
    Write-Host ("[{0}] {1}" -f $actionable.Count, $header) -ForegroundColor Yellow
    Write-Host ("      {0} new commit(s) on {1}" -f $row.Behind, $row.Upstream) -ForegroundColor Green
    foreach ($c in (Invoke-Git $row.Path @('log', '--oneline', '--no-decorate', '-n', '5', "HEAD..$($row.Upstream)")).Output) {
        Write-Host "         $c" -ForegroundColor Gray
    }
    if ($row.Behind -gt 5) { Write-Host "         ..." -ForegroundColor Gray }
    if ($notes.Count -gt 0) { Write-Host "      ! $($notes -join ', ')" -ForegroundColor DarkYellow }
}
Write-Host ""

if ($actionable.Count -eq 0) {
    Write-Host "Every branch is up to date. Nothing to pull." -ForegroundColor Green
    exit 0
}

# ---- 3. Pick branches, confirm ---------------------------------------------------------------------

$picked = $actionable
if (-not $Yes) {
    $selection = Read-Host "Branches to pull - Enter = all [1-$($actionable.Count)], or numbers like 1,3 (q = quit)"
    if ($selection -eq 'q') { exit 0 }
    if (-not [string]::IsNullOrWhiteSpace($selection)) {
        $picked = @()
        foreach ($part in ($selection -split '[,\s]+' | Where-Object { $_ })) {
            $index = 0
            if (-not [int]::TryParse($part, [ref]$index) -or $index -lt 1 -or $index -gt $actionable.Count) {
                Write-Host "Invalid choice '$part'. Nothing was done." -ForegroundColor Red
                exit 1
            }
            $picked += $actionable[$index - 1]
        }
        $picked = $picked | Sort-Object Path -Unique | Sort-Object @{ Expression = { Get-BranchOrder $_.Branch } }, Branch
    }
    Write-Host ""
    Write-Host "About to fast-forward:" -ForegroundColor Cyan
    foreach ($row in $picked) { Write-Host ("   {0,-26} +{1} commit(s) from {2}" -f $row.Branch, $row.Behind, $row.Upstream) }
    $confirm = Read-Host "Proceed? (y/N)"
    if ($confirm -notmatch '^(y|yes)$') {
        Write-Host "Cancelled. Nothing was pulled." -ForegroundColor Yellow
        exit 0
    }
}

# ---- 4. Pull ---------------------------------------------------------------------------------------

$results = @()
foreach ($row in @($picked)) {
    Write-Host ""
    Write-Host "---- $($row.Branch) ----" -ForegroundColor Cyan
    & git -C $row.Path pull --ff-only
    if ($LASTEXITCODE -ne 0) { $result = 'pull FAILED (see above)' } else { $result = "pulled +$($row.Behind)" }
    $results += [pscustomobject]@{ Branch = $row.Branch; Result = $result }
}

Write-Host ""
Write-Host "==================== Summary ====================" -ForegroundColor Cyan
foreach ($r in $results) {
    $color = 'Green'
    if ($r.Result -like '*FAILED*') { $color = 'Red' }
    Write-Host ("   {0,-26} {1}" -f $r.Branch, $r.Result) -ForegroundColor $color
}
Write-Host ""
