#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

npm run build:firefox

echo "Built extension to dist/firefox"

cd dist/firefox
npx web-ext sign --api-key="$MOZILLA_JWT_ISSUER" --api-secret="$MOZILLA_JWT_SECRET" --channel=unlisted
cd ../..
