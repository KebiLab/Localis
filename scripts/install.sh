#!/usr/bin/env sh
set -eu

if ! command -v node >/dev/null 2>&1; then
  echo "Localis requires Node.js 20.9 or newer: https://nodejs.org/" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install the Localis CLI." >&2
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$node_major" -lt 20 ]; then
  echo "Localis requires Node.js 20.9 or newer." >&2
  exit 1
fi

echo "Installing Localis from the public npm registry..."
if ! npm install --global localis; then
  echo "npm package is not available yet; installing the bundled CLI from the latest GitHub release..."
  latest_url="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/KebiLab/Localis/releases/latest)"
  tag="${latest_url##*/}"
  version="${tag#v}"
  npm install --global "https://github.com/KebiLab/Localis/releases/download/${tag}/localis-core-${version}.tgz"
  npm install --global "https://github.com/KebiLab/Localis/releases/download/${tag}/localis-${version}.tgz"
fi
echo "Localis installed. Run: localis doctor"
