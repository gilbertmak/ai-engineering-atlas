#!/bin/sh
# Backup only discovery state and JSON audit output. No source tree or secrets are included.
set -eu

APP_NAME="ai-engineer-insight-atlas"
APP_SUPPORT_DIR="${ATLAS_APP_SUPPORT_DIR:-$HOME/Library/Application Support/$APP_NAME}"
CONFIG_FILE="${DISCOVERY_CONFIG_FILE:-$APP_SUPPORT_DIR/discovery.env}"
STATE_DIR="$APP_SUPPORT_DIR/state"
AUDIT_DIR="$APP_SUPPORT_DIR/audit"
PROJECTION_DIR="$APP_SUPPORT_DIR/projection"
if [ ! -f "$CONFIG_FILE" ] || [ "$(stat -f %Lp "$CONFIG_FILE")" != "600" ]; then
  echo "mode-600 backup configuration is required" >&2
  exit 78
fi
# shellcheck disable=SC1090
. "$CONFIG_FILE"
: "${BACKUP_GPG_RECIPIENT:?BACKUP_GPG_RECIPIENT is required}"
: "${BACKUP_DESTINATION:?BACKUP_DESTINATION is required}"
command -v gpg >/dev/null 2>&1 || { echo "gpg is required for encrypted backups" >&2; exit 69; }
mkdir -p "$BACKUP_DESTINATION"
chmod 700 "$BACKUP_DESTINATION"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_DESTINATION/discovery-state-$timestamp.tar.gpg"
manifest="$BACKUP_DESTINATION/discovery-state-$timestamp.manifest.json"
temporary="$archive.tmp"
trap 'rm -f "$temporary"' EXIT HUP INT TERM
if [ ! -f "$STATE_DIR/youtube-discovery-state.json" ]; then
  echo "refusing backup: no discovery state exists" >&2
  exit 66
fi
tar -C "$APP_SUPPORT_DIR" -cf - state audit projection | gpg --batch --yes --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$temporary"
mv "$temporary" "$archive"
hash="$(shasum -a 256 "$archive" | awk '{print $1}')"
printf '{"schema":1,"createdAt":"%s","archive":"%s","sha256":"%s","contents":["state","audit","projection"],"encrypted":true}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(basename "$archive")" "$hash" >"$manifest"
chmod 600 "$archive" "$manifest"
printf '%s\n' "backup succeeded; manifest=$manifest"
