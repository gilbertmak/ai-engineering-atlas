#!/bin/sh
# Deterministic release gate: tracked examples must never enable or carry a key.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
grep -q '^YOUTUBE_DISCOVERY_ENABLED=0$' "$root/.env.example"
grep -q '^ATLAS_DISCOVERY_SCHEDULE_ENABLED=false$' "$root/.env.example"
grep -q '^ATLAS_METADATA_AUTO_PUBLISH_ENABLED=false$' "$root/.env.example"
grep -q '^YOUTUBE_DISCOVERY_ENABLED=0$' "$root/ops/config/discovery.env.example"
grep -q '^ATLAS_DISCOVERY_SCHEDULE_ENABLED=false$' "$root/ops/config/discovery.env.example"
grep -q '^ATLAS_METADATA_AUTO_PUBLISH_ENABLED=false$' "$root/ops/config/discovery.env.example"
if grep -R -nE '^(YOUTUBE_DATA_API_KEY|VITE_.*YOUTUBE.*)=' "$root/.env.example" "$root/ops/config"; then
  echo "example configuration must not contain credentials" >&2
  exit 1
fi
grep -q 'find-generic-password' "$root/ops/run-discovery.sh"
grep -q 'YOUTUBE_DISCOVERY_ENABLED' "$root/ops/run-discovery.sh"
grep -q 'ATLAS_METADATA_AUTO_PUBLISH_ENABLED' "$root/ops/run-discovery.sh"
grep -q 'scripts/run-scheduled-discovery.ts' "$root/ops/run-discovery.sh"
grep -q 'ATLAS_CATALOG_PROJECTION_PATH' "$root/docker-compose.yml"
grep -q '127.0.0.1:' "$root/docker-compose.yml"
printf '%s\n' 'production configuration gate passed: discovery defaults to disabled'
