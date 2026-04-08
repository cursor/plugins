# Run after `git pull` / merge: re-apply composed manifests into Cursor's plugin cache.
# Install once from repo root:
#   powershell -ExecutionPolicy Bypass -File scripts/install-git-post-merge-hook.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$HookDir = Join-Path $RepoRoot ".git\hooks"
$HookPath = Join-Path $HookDir "post-merge"

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  Write-Error "Run this from a git clone of cursor-plugins-upstream (no .git found)."
}

$Node = "node"
$Script = Join-Path $RepoRoot "scripts\run-after-cursor-update.mjs"

$RootSh = ($RepoRoot -replace '\\', '/')
$HookBody = @"
#!/bin/sh
# cursor-plugins-upstream: refresh local Cursor cache after pull
cd "$RootSh" || exit 1
node scripts/run-after-cursor-update.mjs || exit 1
"@

New-Item -ItemType Directory -Force -Path $HookDir | Out-Null
Set-Content -Path $HookPath -Value $HookBody -Encoding utf8

# Git for Windows: ensure hook is executable not required on Windows; use bash if present
Write-Host "Wrote $HookPath"
Write-Host "On Windows, Git often runs hooks via sh—verify hook runs after your next git pull."
