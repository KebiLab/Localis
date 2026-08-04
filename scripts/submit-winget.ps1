param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerUrl
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command wingetcreate -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Microsoft WinGet Manifest Creator..."
  winget install Microsoft.WingetCreate --accept-package-agreements --accept-source-agreements
}

Write-Host "Creating the first KebiLab.Localis manifest from $InstallerUrl"
Write-Host "Review every generated field, validate the manifest, and choose Yes when WinGetCreate offers to submit it."
wingetcreate new $InstallerUrl
