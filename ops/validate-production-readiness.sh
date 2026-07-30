#!/bin/sh
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
for script in "$root"/ops/*.sh; do sh -n "$script"; done
"$root/ops/check-production-config.sh"
printf '%s\n' 'readiness validation passed: offline configuration and shell checks only'
