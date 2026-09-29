# Tabletop AI installer for Windows (PowerShell 5.1+).
# Three ways to run it, all doing the same thing:
#   powershell -c "irm https://raw.githubusercontent.com/Josje96/ai-rpg/main/install.ps1 | iex"
#   powershell -ExecutionPolicy Bypass -File install.ps1        # from a downloaded copy
#   ./install.ps1                                               # from inside a clone
# Installs Bun if needed, installs dependencies, and sets up .env.
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/Josje96/ai-rpg"
$cloned = $false

# Find the project. Running as a file inside a checkout? Install there.
# Piped in from irm|iex ($PSScriptRoot is empty)? Clone it first.
$src = $null
if ($PSScriptRoot -and (Test-Path "$PSScriptRoot\package.json")) {
    $src = $PSScriptRoot
} elseif (Test-Path ".\package.json") {
    $src = (Get-Location).Path
}
if (-not $src) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "git is required to fetch the game (https://git-scm.com)."
    }
    $dest = if ($env:TABLETOP_AI_DIR) { $env:TABLETOP_AI_DIR } else { Join-Path $env:USERPROFILE "ai-rpg" }
    if (Test-Path (Join-Path $dest ".git")) {
        Write-Host "Updating $dest..."
        git -C $dest pull --ff-only
    } else {
        Write-Host "Cloning Tabletop AI into $dest..."
        git clone --depth 1 $RepoUrl $dest
    }
    $src = $dest
    $cloned = $true
}
Set-Location $src

function Test-Bun {
    try {
        $version = (& bun --version) 2>$null
        if (-not $version) { return $false }
        $parts = $version.Split(".")
        if ([int]$parts[0] -gt 1) { return $true }
        if ([int]$parts[0] -eq 1 -and [int]$parts[1] -ge 2) { return $true }
        return $false
    } catch {
        return $false
    }
}

if (-not (Test-Bun)) {
    Write-Host "Installing Bun 1.2+..."
    Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression
    # Make bun visible in this session without a shell restart.
    $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
}
if (-not (Test-Bun)) {
    throw "Bun installed but not on PATH; open a new terminal and rerun."
}
Write-Host "Using bun $((& bun --version))"

Write-Host "Installing dependencies..."
& bun install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example."
    # Read-Host goes to the console, so it is safe even when the script is piped in.
    $key = Read-Host "Paste your OpenRouter API key (Enter to skip and edit .env later)"
    if ($key) {
        (Get-Content .env) -replace '^OPENROUTER_API_KEY=$', "OPENROUTER_API_KEY=$key" | Set-Content .env
        Write-Host "Key saved to .env."
    }
} else {
    Write-Host ".env already exists; leaving it alone."
}

Write-Host "Sanity check: typecheck..."
& bunx tsc --noEmit
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done."
if ($cloned) {
    Write-Host "The game lives in $src. Play with:"
    Write-Host "  cd $src"
    Write-Host "  bun run play"
} else {
    Write-Host "Start playing with:"
    Write-Host "  bun run play"
}
