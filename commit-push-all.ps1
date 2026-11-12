<#
.SYNOPSIS
    Shows the changed files of every branch folder (worktree), asks once for a commit message,
    then commits and pushes every branch that has changes - without opening each folder.
.DESCRIPTION
    Run it from any branch folder (or double-click commit-push-all.bat).

    1. Finds every worktree or clone of this repository: banni-linux, Matrix, every Features/App/* branch and Mojito
       (see App-Document/branch-guide.md). Folders are found in thakurg (banni-linux) and inside thakurg-branches, as git
       worktrees or as separate clones of the same GitHub repository.
    2. Lists, per branch, the modified / added / deleted / renamed / new files, and any commits that are
       committed but not yet pushed.
    3. Lets you pick the branches (Enter = all), asks for one generic commit message and a final y/N.
    4. In each picked folder: git add -A, git commit -m "<message>", git push to the branch's own upstream.

    Branches are handled in release order: Matrix, Features/App/*, banni-linux, then the rest.
    The old stub branches (main, master, base, old-master) are never touched.
    Nothing is committed or pushed until you type the message and answer y.

    This script does not merge Matrix into the feature branches - that still follows the release
    order in App-Document/branch-guide.md.
.PARAMETER Message
    Commit message to use instead of being asked for one. You are still asked to confirm.
.PARAMETER NoPush
    Commit only; do not push.
.EXAMPLE
    .\commit-push-all.ps1
.EXAMPLE
    .\commit-push-all.ps1 -NoPush
#>
param(
    [string]$Message,
    [switch]$NoPush
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

function Get-ChangeLabel([string]$Code) {
    switch -regex ($Code) {
        'U|AA|DD' { return 'Conflict' }
        '\?\?'    { return 'New     ' }
        'R'       { return 'Renamed ' }
        'A'       { return 'Added   ' }
        'D'       { return 'Deleted ' }
        'M'       { return 'Modified' }
        default   { return $Code.PadRight(8) }
    }
}

# ---- 1. Find every worktree folder ----------------------------------------------------------------

$commonDir = (& git -C $PSScriptRoot rev-parse --path-format=absolute --git-common-dir 2>$null)
if (-not $commonDir) {
    Write-Host "This folder is not inside the thakurg git repository." -ForegroundColor Red
    exit 1
}
$commonDir = Get-NormalPath $commonDir

# The same GitHub repository, written one way, so a separate clone of it counts as one of the branch folders.
function Get-RemoteKey([string]$Path) {
    $url = (& git -C $Path remote get-url origin 2>$null) | Select-Object -First 1
    if (-not $url) { return '' }
    return $url.Trim().TrimEnd('/').ToLowerInvariant() -replace '\.git$', ''
}

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
    $worktrees += [pscustomobject]@{ Path = $top.Replace('/', '\'); Branch = $branch }
}

$worktrees = $worktrees | Sort-Object @{ Expression = { Get-BranchOrder $_.Branch } }, Branch

# ---- 2. Collect changes per branch ----------------------------------------------------------------

$rows = @()
foreach ($wt in $worktrees) {
    $status = Invoke-Git $wt.Path @('status', '--porcelain=v1', '-uall')
    $files = @($status.Output | Where-Object { $_ })
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
    $conflicts = @($files | Where-Object { $_.Substring(0, 2) -match 'U|AA|DD' })
    $rows += [pscustomobject]@{
        Path      = $wt.Path
        Branch    = $wt.Branch
        Files     = $files
        Upstream  = $upstream
        Ahead     = $ahead
        Behind    = $behind
        Conflicts = $conflicts.Count
    }
}

Write-Host ""
Write-Host "==================== Changes per branch ====================" -ForegroundColor Cyan
$actionable = @()
foreach ($row in $rows) {
    $hasWork = ($row.Files.Count -gt 0) -or ($row.Ahead -gt 0 -and -not $NoPush)
    $header = "{0}  ({1})" -f $row.Branch, $row.Path
    if (-not $hasWork) {
        Write-Host ""
        Write-Host "   $header" -ForegroundColor DarkGray
        Write-Host "      nothing to commit or push" -ForegroundColor DarkGray
        continue
    }
    $actionable += $row
    $number = $actionable.Count
    Write-Host ""
    Write-Host ("[{0}] {1}" -f $number, $header) -ForegroundColor Yellow
    foreach ($file in $row.Files) {
        $code = $file.Substring(0, 2)
        $label = Get-ChangeLabel $code
        $color = 'Gray'
        if ($label -eq 'Conflict') { $color = 'Red' }
        Write-Host ("      {0}  {1}" -f $label, $file.Substring(3)) -ForegroundColor $color
    }
    if ($row.Ahead -gt 0) { Write-Host ("      + {0} commit(s) already committed, not pushed yet" -f $row.Ahead) -ForegroundColor Green }
    if ($row.Behind -gt 0) { Write-Host ("      ! {0} commit(s) behind {1} - push will be rejected until you pull" -f $row.Behind, $row.Upstream) -ForegroundColor Red }
    if (-not $row.Upstream) { Write-Host "      ! no upstream yet - will push with -u origin $($row.Branch)" -ForegroundColor DarkYellow }
    if ($row.Conflicts -gt 0) { Write-Host "      ! unresolved conflicts - this branch will be skipped" -ForegroundColor Red }
}
Write-Host ""

if ($actionable.Count -eq 0) {
    Write-Host "Every branch is clean and pushed. Nothing to do." -ForegroundColor Green
    exit 0
}

# ---- 3. Pick branches, message, confirm -----------------------------------------------------------

$selection = Read-Host "Branches to commit/push - Enter = all [1-$($actionable.Count)], or numbers like 1,3 (q = quit)"
if ($selection -eq 'q') { exit 0 }
$picked = @()
if ([string]::IsNullOrWhiteSpace($selection)) {
    $picked = $actionable
} else {
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
$picked = @($picked | Where-Object { $_.Conflicts -eq 0 })
if ($picked.Count -eq 0) {
    Write-Host "No branch left to process." -ForegroundColor Yellow
    exit 0
}

$needsCommit = @($picked | Where-Object { $_.Files.Count -gt 0 })
if ($needsCommit.Count -gt 0) {
    while ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = Read-Host "Commit message (used for every branch)"
    }
}

Write-Host ""
Write-Host "About to:" -ForegroundColor Cyan
foreach ($row in $picked) {
    $steps = @()
    if ($row.Files.Count -gt 0) { $steps += "commit $($row.Files.Count) file(s)" }
    if (-not $NoPush) { $steps += "push" }
    Write-Host ("   {0,-26} {1}" -f $row.Branch, ($steps -join ' + '))
}
if ($needsCommit.Count -gt 0) { Write-Host "   message: $Message" }
$confirm = Read-Host "Proceed? (y/N)"
if ($confirm -notmatch '^(y|yes)$') {
    Write-Host "Cancelled. Nothing was committed or pushed." -ForegroundColor Yellow
    exit 0
}

# ---- 4. Commit and push ----------------------------------------------------------------------------

$results = @()
foreach ($row in $picked) {
    Write-Host ""
    Write-Host "---- $($row.Branch) ----" -ForegroundColor Cyan
    $result = 'ok'
    if ($row.Files.Count -gt 0) {
        & git -C $row.Path add -A
        & git -C $row.Path commit -m $Message
        if ($LASTEXITCODE -ne 0) {
            $results += [pscustomobject]@{ Branch = $row.Branch; Result = 'commit FAILED' }
            continue
        }
        $result = 'committed'
    }
    if (-not $NoPush) {
        if ($row.Upstream) {
            $slash = $row.Upstream.IndexOf('/')
            $remote = $row.Upstream.Substring(0, $slash)
            $remoteBranch = $row.Upstream.Substring($slash + 1)
            & git -C $row.Path push $remote "HEAD:$remoteBranch"
        } else {
            & git -C $row.Path push -u origin $row.Branch
        }
        if ($LASTEXITCODE -ne 0) { $result = "$result, push FAILED" } else { $result = "$result, pushed" }
    }
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
