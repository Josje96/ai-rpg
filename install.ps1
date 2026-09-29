# Tabletop AI installer for Windows (PowerShell 5.1+).
# Installs Bun if needed, installs dependencies, and sets up .env.
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

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
    Write-Error "Bun installed but not on PATH; open a new terminal and rerun."
}
Write-Host "Using bun $((& bun --version))"

Write-Host "Installing dependencies..."
& bun install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Created .env from .env.example."
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
Write-Host "Done. Start playing with:"
Write-Host "  bun run play"
