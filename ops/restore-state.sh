#!/bin/sh
# Restore an explicitly named encrypted state/audit archive into an empty target.
set -eu
if [ "$#" -ne 2 ]; then
  echo "usage: $0 ARCHIVE.tar.gpg EMPTY_TARGET_DIRECTORY" >&2
  exit 64
fi
archive="$1"
target="$2"
[ -f "$archive" ] || { echo "archive not found" >&2; exit 66; }
[ -d "$target" ] || { echo "restore target must be pre-created" >&2; exit 73; }
[ -z "$(find "$target" -mindepth 1 -maxdepth 1 -print -quit)" ] || { echo "restore target must be empty" >&2; exit 73; }
command -v gpg >/dev/null 2>&1 || { echo "gpg is required" >&2; exit 69; }
gpg --batch --decrypt "$archive" | tar -C "$target" -xf -
[ -f "$target/state/youtube-discovery-state.json" ] || { echo "restore incomplete: state file missing" >&2; exit 65; }
node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'))" "$target/state/youtube-discovery-state.json"
chmod 700 "$target" "$target/state" "$target/audit"
if [ -d "$target/projection" ]; then chmod 700 "$target/projection"; fi
find "$target" -type f -exec chmod 600 {} \;
printf '%s\n' "restore validated; target=$target"
