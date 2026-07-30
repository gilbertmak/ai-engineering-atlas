#!/bin/sh
# Runs only after both an explicit enablement flag and a Keychain secret exist.
set -eu

APP_NAME="ai-engineer-insight-atlas"
APP_SUPPORT_DIR="${ATLAS_APP_SUPPORT_DIR:-$HOME/Library/Application Support/$APP_NAME}"
CONFIG_FILE="${DISCOVERY_CONFIG_FILE:-$APP_SUPPORT_DIR/discovery.env}"
STATE_DIR="$APP_SUPPORT_DIR/state"
AUDIT_DIR="$APP_SUPPORT_DIR/audit"
PROJECTION_DIR="$APP_SUPPORT_DIR/projection"
STATE_PATH="${YOUTUBE_DISCOVERY_STATE_PATH:-$STATE_DIR/youtube-discovery-state.json}"
CANDIDATE_PATH="${YOUTUBE_DISCOVERY_CANDIDATES_PATH:-$STATE_DIR/youtube-discovery-candidates.json}"
DRY_RUN=0

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
elif [ "$#" -ne 0 ]; then
  echo "usage: $0 [--dry-run]" >&2
  exit 64
fi

if [ ! -f "$CONFIG_FILE" ]; then
  echo "discovery configuration is absent; scheduling remains disabled" >&2
  exit 78
fi
if [ "$(stat -f %Lp "$CONFIG_FILE")" != "600" ]; then
  echo "discovery configuration must have mode 600" >&2
  exit 78
fi
# shellcheck disable=SC1090
. "$CONFIG_FILE"
if [ "${YOUTUBE_DISCOVERY_ENABLED:-0}" != "1" ]; then
  echo "discovery is disabled (set YOUTUBE_DISCOVERY_ENABLED=1 only after release approval)" >&2
  exit 77
fi
if [ "${ATLAS_DISCOVERY_SCHEDULE_ENABLED:-false}" != "true" ]; then
  echo "scheduled discovery is disabled (set ATLAS_DISCOVERY_SCHEDULE_ENABLED=true after manual evidence)" >&2
  exit 77
fi
if [ "${ATLAS_METADATA_AUTO_PUBLISH_ENABLED:-false}" != "true" ]; then
  echo "metadata auto-publication is disabled; retain manual review-only discovery" >&2
  exit 77
fi
: "${ATLAS_APPROVED_YOUTUBE_CHANNEL:?approved YouTube channel is required for scheduled metadata publication}"
: "${ATLAS_APPROVED_UPLOADS_PLAYLIST_ID:?approved uploads playlist is required for scheduled metadata publication}"
ATLAS_CATALOG_PROJECTION_PATH="${ATLAS_CATALOG_PROJECTION_PATH:-$PROJECTION_DIR/atlas-catalog-projection.json}"

mkdir -p "$STATE_DIR" "$AUDIT_DIR" "$PROJECTION_DIR"
chmod 700 "$APP_SUPPORT_DIR" "$STATE_DIR" "$AUDIT_DIR" "$PROJECTION_DIR"
LOCK_DIR="$APP_SUPPORT_DIR/.discovery.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "another discovery job is already running; refusing concurrent state/audit writes" >&2
  exit 75
fi
temporary=""
cleanup() {
  [ -z "$temporary" ] || rm -f "$temporary"
  rmdir "$LOCK_DIR" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM
if [ "$DRY_RUN" -eq 1 ]; then
  printf '%s\n' '{"status":"dry-run","network":"not-called","discovery":"enabled-but-not-executed"}'
  exit 0
fi

if ! command -v security >/dev/null 2>&1; then
  echo "macOS Keychain CLI is required for a live discovery run" >&2
  exit 69
fi
YOUTUBE_DATA_API_KEY="$(security find-generic-password -a "$USER" -s "$APP_NAME-youtube-data-api-key" -w)"
if [ -z "$YOUTUBE_DATA_API_KEY" ]; then
  echo "YouTube Data API key is absent from the macOS Keychain" >&2
  exit 78
fi
export YOUTUBE_DATA_API_KEY YOUTUBE_DISCOVERY_STATE_PATH="$STATE_PATH" YOUTUBE_DISCOVERY_CANDIDATES_PATH="$CANDIDATE_PATH" ATLAS_CATALOG_PROJECTION_PATH ATLAS_DISCOVERY_SCHEDULE_ENABLED ATLAS_METADATA_AUTO_PUBLISH_ENABLED ATLAS_APPROVED_YOUTUBE_CHANNEL ATLAS_APPROVED_UPLOADS_PLAYLIST_ID
export YOUTUBE_DISCOVERY_CHANNEL_HANDLE="${YOUTUBE_DISCOVERY_CHANNEL_HANDLE:-aiDotEngineer}"
export YOUTUBE_DISCOVERY_UPLOADS_PLAYLIST_ID="${YOUTUBE_DISCOVERY_UPLOADS_PLAYLIST_ID:-}"
export YOUTUBE_DISCOVERY_CHANNEL_ID="${YOUTUBE_DISCOVERY_CHANNEL_ID:-}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary="$AUDIT_DIR/.discovery-$timestamp.json.tmp"
output="$AUDIT_DIR/discovery-$timestamp.json"
# The scheduled entry point emits one JSON audit object only. Do not echo its
# environment or the Keychain secret.
bun scripts/run-scheduled-discovery.ts >"$temporary"
node -e "const audit=JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')); if(audit.outcome !== 'published_metadata_only' || !audit.projectionVersion || !audit.contentHash) throw new Error('scheduled audit missing publication evidence')" "$temporary"
mv "$temporary" "$output"
temporary=""
ln -sfn "$(basename "$output")" "$AUDIT_DIR/latest.json"
printf '%s\n' "discovery succeeded; audit=$output"
