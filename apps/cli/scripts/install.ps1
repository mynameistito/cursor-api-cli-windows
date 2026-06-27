#Requires -Version 5.1
<#
.SYNOPSIS
  Install or update cursor-api on Windows.

.DESCRIPTION
  Downloads the latest release from GitHub, extracts it, adds the install
  directory to your user PATH, and verifies the binary.

.EXAMPLE
  irm https://raw.githubusercontent.com/mynameistito/cursor-api-cli-windows/main/scripts/install.ps1 | iex

.EXAMPLE
  .\install.ps1 -Update
#>
[CmdletBinding()]
param(
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\cursor-api",
  [string]$Version = "latest",
  [switch]$Update,
  [switch]$SkipPath,
  [switch]$SkipUpdateCheck
)

if ($env:CURSOR_API_INSTALL_UPDATE -eq "1") { $Update = $true }

$ErrorActionPreference = "Stop"
$Repo = "mynameistito/cursor-api-cli-windows"
$ApiHeaders = @{
  Accept        = "application/vnd.github+json"
  "User-Agent"  = "cursor-api-installer"
}

function Write-Info([string]$Message) { Write-Host $Message -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host $Message -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host $Message -ForegroundColor Yellow }

function Get-InstalledVersion {
  $exe = Join-Path $InstallDir "cursor-api.exe"
  if (-not (Test-Path $exe)) { return $null }
  try {
    return (& $exe --version 2>$null).Trim()
  } catch {
    return $null
  }
}

function Stop-CursorApiIfRunning {
  $pidFile = Join-Path $env:APPDATA "cursor-api\run\cursor-api.pid"
  if (-not (Test-Path $pidFile)) { return }
  $procId = (Get-Content $pidFile -Raw).Trim()
  if ($procId -match '^\d+$') {
    Write-Info "Stopping cursor-api (pid $procId)…"
    Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
  $exe = Join-Path $InstallDir "cursor-api.exe"
  if (Test-Path $exe) {
    try { & $exe stop 2>$null | Out-Null } catch { }
  }
}

function Get-ReleaseAsset {
  param([string]$Tag)

  if ($Tag -eq "latest") {
    $uri = "https://api.github.com/repos/$Repo/releases/latest"
  } else {
    $normalized = if ($Tag -match '^v') { $Tag } else { "v$Tag" }
    $uri = "https://api.github.com/repos/$Repo/releases/tags/$normalized"
  }

  $release = Invoke-RestMethod -Uri $uri -Headers $ApiHeaders
  $asset = $release.assets | Where-Object { $_.name -match '^cursor-api-.*-win-x64\.zip$' } | Select-Object -First 1
  if (-not $asset) {
    throw "No Windows x64 zip found in release $($release.tag_name)."
  }

  return [PSCustomObject]@{
    Version     = ($release.tag_name -replace '^v', '')
    Tag         = $release.tag_name
    DownloadUrl = $asset.browser_download_url
    Notes       = $release.body
    PublishedAt = $release.published_at
  }
}

function Ensure-UserPath {
  param([string]$Directory)

  if ($SkipPath) { return }

  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($null -eq $userPath) { $userPath = "" }

  $normalized = $Directory.TrimEnd('\')
  if ($userPath.Split(';') -contains $normalized) {
    Write-Info "PATH already contains $normalized"
    return
  }

  [Environment]::SetEnvironmentVariable("Path", "$userPath;$normalized", "User")
  $env:Path = "$env:Path;$normalized"
  Write-Ok "Added $normalized to user PATH (open a new terminal if cursor-api is not found)."
}

function Install-Release {
  param(
    [string]$DownloadUrl,
    [string]$VersionLabel
  )

  $tempRoot = Join-Path $env:TEMP "cursor-api-install-$VersionLabel"
  $zipPath = Join-Path $tempRoot "bundle.zip"
  $extractDir = Join-Path $tempRoot "extract"

  if (Test-Path $tempRoot) { Remove-Item -Recurse -Force $tempRoot }
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

  Write-Info "Downloading cursor-api $VersionLabel…"
  $ProgressPreference = "SilentlyContinue"
  Invoke-WebRequest -Uri $DownloadUrl -OutFile $zipPath -UseBasicParsing

  Write-Info "Extracting to $InstallDir…"
  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

  if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
  }

  Copy-Item -Path (Join-Path $extractDir '*') -Destination $InstallDir -Recurse -Force
  Remove-Item -Recurse -Force $tempRoot
}

# --- main ---

if ($env:OS -notmatch "Windows") {
  throw "cursor-api Windows installer requires Windows."
}

$installed = Get-InstalledVersion
if ($installed -and -not $Update -and -not $SkipUpdateCheck) {
  try {
    $latest = Get-ReleaseAsset -Tag "latest"
    if ($latest.Version -ne $installed) {
      Write-Warn "cursor-api $installed is installed; latest is $($latest.Version)."
      Write-Warn "Re-run with -Update to upgrade, or: cursor-api update"
    } else {
      Write-Ok "cursor-api $installed is already installed (latest)."
    }
  } catch {
    Write-Warn "Could not check for updates: $($_.Exception.Message)"
  }
}

if ($Update -or -not $installed) {
  Stop-CursorApiIfRunning
  $release = Get-ReleaseAsset -Tag $Version
  Install-Release -DownloadUrl $release.DownloadUrl -VersionLabel $release.Version
  $installed = Get-InstalledVersion
}

if (-not $installed) {
  throw "Installation failed: cursor-api.exe not found in $InstallDir"
}

Ensure-UserPath -Directory $InstallDir

Write-Ok "cursor-api $installed ready at $InstallDir\cursor-api.exe"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  cursor-api key set"
Write-Host "  cursor-api start"
Write-Host "  cursor-api status"
Write-Host "  cursor-api url"
Write-Host ""
Write-Host "Docs: https://github.com/$Repo"
