$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Localis requires Node.js 20.9 or newer: https://nodejs.org/"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required to install the Localis CLI."
}

$nodeMajor = [int]((& node -p "Number(process.versions.node.split('.')[0])").Trim())
if ($nodeMajor -lt 20) {
  throw "Localis requires Node.js 20.9 or newer."
}

Write-Host "Installing Localis from the public npm registry..."
& npm install --global localis
if ($LASTEXITCODE -ne 0) {
  Write-Host "npm package is not available yet; installing the bundled CLI from the latest GitHub release..."
  $latest = Invoke-WebRequest "https://github.com/KebiLab/Localis/releases/latest" -MaximumRedirection 10
  $tag = $latest.BaseResponse.RequestMessage.RequestUri.Segments[-1].TrimEnd('/')
  $version = $tag.TrimStart('v')
  & npm install --global "https://github.com/KebiLab/Localis/releases/download/$tag/localis-core-$version.tgz"
  & npm install --global "https://github.com/KebiLab/Localis/releases/download/$tag/localis-$version.tgz"
}
Write-Host "Localis installed. Run: localis doctor"
