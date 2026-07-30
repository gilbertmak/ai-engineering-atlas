# Mac Mini operations runbook

## Deployment and readiness plan

The Atlas web/API is a least-privilege Node/Nitro container. It is built with
`NITRO_PRESET=node-server`, runs as UID 10001, has a read-only filesystem,
dropped Linux capabilities, a small writable `/tmp`, and binds to
`127.0.0.1:3000` only. It is not an Internet-facing deployment. Put any future
public read endpoint behind an independently reviewed TLS reverse proxy with
rate limits; keep Mac administration and worker execution private (for example,
VPN plus MFA).

The daily worker is a separate macOS `launchd` job. It is fail-closed and will
not make a network call unless all of the following are true:

1. a mode-600 private configuration file exists;
2. `YOUTUBE_DISCOVERY_ENABLED=1`;
3. `ATLAS_DISCOVERY_SCHEDULE_ENABLED=true`;
4. `ATLAS_METADATA_AUTO_PUBLISH_ENABLED=true`, an exact approved channel, and
   an exact approved uploads playlist are present; and
5. the restricted `YOUTUBE_DATA_API_KEY` exists in the logged-in operator's
   macOS Keychain.

There are two output levels. A normal/manual discovery run writes private
`review_required` candidates, state, and audit JSON only. The fully enabled
scheduled flow additionally atomically writes the durable catalog projection
at `ATLAS_CATALOG_PROJECTION_PATH`, but accepts only items missing from that
projection whose exact channel and uploads playlist match the approved
configuration. This also recovers safely if discovery succeeded but a prior
publication attempt failed. Those additions
are `metadata_only`, unclassified, and have no reviewed insight. Neither level
can publish an insight, speaker attribution, or Hermes claim; that remains a
separate Hermes/content review and publication workflow.

## Initial Mac Mini setup

1. Install Docker Desktop, Node 22/npm, Bun, GnuPG, and Git from trusted
   sources. Use a non-admin dedicated local operator account where practical.
2. Clone a reviewed revision and run `npm ci`, `npm run typecheck`, `npm run
   lint`, `bun test`, `NITRO_PRESET=node-server npm run build`, and
   `./ops/validate-production-readiness.sh`. Preserve the CI run URL/artifact
   and the exact commit SHA as release evidence.
3. Copy `.env.example` to a local Compose environment file if required. Leave
   discovery flags disabled. Set `ATLAS_STATE_DIR` in that untracked Compose
   file to the same absolute application-support directory used by the worker,
   for example `/Users/atlasops/Library/Application Support/ai-engineer-insight-atlas`.
   The container mounts it read-only and reads
   `/app/state/projection/atlas-catalog-projection.json`. Build and start the
   read service:

   ```sh
   docker compose --env-file .env.example up -d --build
   curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/healthz
   curl -fsS http://127.0.0.1:3000/readyz
   docker compose ps
   ```

   Expected liveness status is `204`; readiness returns the non-secret
   projection version. No key is needed by the web container.
4. Create `~/Library/Application Support/ai-engineer-insight-atlas/`, copy
   `ops/config/discovery.env.example` to `discovery.env`, and set mode 600.
   Keep all three enable flags at their defaults. Its exact projection path
   must match the Compose host state directory mounted at `/app/state`; the
   default private path is `projection/atlas-catalog-projection.json`. Do not put the API key in this
   file, Docker environment, source tree, logs, GitHub Actions, or any `VITE_`
   variable.
5. After Google Cloud restriction is independently reviewed, add the key to
   the operator Keychain (replace the placeholder only in the local terminal):

   ```sh
   security add-generic-password -U -a "$USER" \
     -s ai-engineer-insight-atlas-youtube-data-api-key -w
   ```

6. First run a manually approved restricted-key full crawl outside scheduling,
   recording the command outcome, resolved playlist, quota/error observations,
   candidates, state path, and reviewer decision. This repository has not made
   that live call. Do not enable launchd until that evidence and a recovery
   check are approved by Operations, QA, and the Delivery Manager.

## Scheduling, monitoring, and support

To install the daily 03:17 local-time worker, make a local copy of
`ops/launchd/com.ai-engineer.insight-atlas.discovery.plist`, replace both
placeholders with absolute paths, create the log directory, validate it with
`plutil -lint`, then use `launchctl bootstrap gui/$(id -u) ...`. The checked-in
plist intentionally cannot run until those placeholders are replaced. Do not
use `RunAtLoad`.

The job holds an atomic directory lock, so a delayed run cannot overlap a new
one. Its success is a timestamped JSON audit file in the private application
support directory; `latest.json` points to the newest run. A nonzero launchd
exit is an alert condition, not a reason to retry blindly.

Minimum alerts:

- Docker health status is not healthy for 10 minutes, or `/readyz` does not
  return the expected projection version.
- Daily job has no successful audit JSON within 26 hours, lock remains for
  more than one hour, or a run records 429/5xx/quota failure.
- Free Mac Mini disk falls below 20 GB or backup has no successful encrypted
  manifest within 26 hours.
- Candidate/projection output is malformed, a scheduled job attempts a public
  insight/Hermes mutation, or a secret appears in logs: disable all three flags, unload the job, revoke the
  key, preserve redacted evidence, and notify Security and the Delivery
  Manager immediately.

Use `docker compose logs --since 30m atlas-web`, the launchd stdout/stderr log,
and private audit JSON for incident diagnosis. Do not attach API keys, raw
candidate data, or personal home-directory contents to tickets.

## Backup, restore, and rollback

`ops/backup-state.sh` creates a GPG-encrypted archive containing only
`state/`, `audit/`, and `projection/` below the private application support
directory. This covers discovery high-water state, private review-required
candidate handoff, run audit, and the persisted last-known-good catalog
projection. It excludes the application checkout, Docker image, macOS Keychain,
and all credentials. Configure a public GPG recipient and an encrypted/off-host
destination in the mode-600 private config. Keep the archive manifest and its
SHA-256 with the release evidence.

At least quarterly, restore a named archive into a newly created empty
directory with `ops/restore-state.sh ARCHIVE EMPTY_TARGET_DIRECTORY`. The
script verifies the state JSON before reporting success. Then have QA compare
the restored projection manifest/hash with the approved version. A restore is
not proven merely because the archive was created.

For a bad web release, stop the Compose service, start the previous immutable
image tag, and confirm `/healthz`, `/readyz`, and the approved catalog manifest.
For an unsafe discovery release, set all discovery/metadata gates to disabled, unload the
launchd job, retain the audit records, and restore the last known-good state /
projection only after content approval. Never delete audit evidence as part of
rollback.

## Release gate and ownership

The CI workflow runs deterministic typecheck, lint, Bun tests, build, offline
operations validation, and a Node-preset container build. The manual Release
readiness workflow preserves the build manifest and runbook as a revision-bound
artifact. These gates do not authorize a live YouTube call or scheduler
enablement.

| Owner | Handoff / acceptance responsibility |
| --- | --- |
| Developer | Keep worker output non-public; document projection persistence and compatible state paths; provide tests for all publication controls. |
| QA | Attach revision-bound Bun/API/negative-path evidence; verify candidate data cannot enter the public catalog and execute the restore drill. |
| Security | Approve Keychain access, Google key restriction, local/VPN/TLS exposure, log redaction, retention, and incident response. |
| Delivery Manager | Approve the first restricted-key manual run, live scheduler enablement, support owner/on-call, and any metadata publication scope. |
| Delivery Operations | Maintain Docker/launchd, backups, alerts, access review, release evidence, rollback, and runbook currency. |

## Current readiness and caveats

Confidence is **medium** for offline packaging and guardrails, pending a
Mac Mini execution and a restricted-key manual full crawl. Production scheduler
enablement is **not ready**: there is no revision-bound live credential,
quota, backup/restore, or host monitoring evidence yet. The single Mac Mini is
also not high availability; power, ISP, Docker Desktop, disk, and Keychain
session failures remain single-host risks.
