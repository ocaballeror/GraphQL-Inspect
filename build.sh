#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

npm run build:firefox

echo "Built extension to dist/firefox"
