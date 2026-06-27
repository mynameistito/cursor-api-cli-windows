#Requires -Version 5.1
<#
.SYNOPSIS
  Install or update cursor-api on Windows (monorepo entrypoint).

.DESCRIPTION
  Forwards to apps/cli/scripts/install.ps1 so existing install URLs keep working.
#>
[CmdletBinding()]
param(
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\cursor-api",
  [string]$Version = "latest",
  [switch]$Update,
  [switch]$SkipPath,
  [switch]$SkipUpdateCheck
)

$cliInstaller = Join-Path $PSScriptRoot "..\apps\cli\scripts\install.ps1"
& $cliInstaller @PSBoundParameters
