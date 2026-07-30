# Delivery Operations handoff — daily transcript and keyframe pipeline

## Task summary

Defines the operating model for a daily Mac Mini pipeline that acquires only
approved transcripts and extracts video keyframes for the AI Engineer Insight
Atlas. This is an operations plan, not an implementation, credential change,
or activation. It preserves the existing official YouTube Data API metadata
discovery boundary: uploads-feed enumeration only, batching, pacing, persisted
incremental state, and no search/scraping loops.

## Key facts

- Metadata discovery remains API-key worker-only and candidate-only. It uses an
  approved channel/uploads-playlist allowlist, `playlistItems.list` and batched
  `videos.list`, with incremental high-water state and periodic approved full
  reconciliation.
- An API key alone is not valid authority for transcript/caption download. Any
  transcript acquisition must use an approved, documented provider contract or
  a narrowly scoped OAuth/service identity with the required rights and consent.
  The worker fails closed when that authority, source approval, or media rights
  evidence is absent.
- Video/keyframe extraction must operate only on an approved local media asset
  or a provider-sanctioned media delivery mechanism. The pipeline must not add
  watch-page scraping, unauthorised download tooling, or credential bypasses.
- No transcript text, raw media, or frames are public API assets. The Atlas API
  receives only reviewed, approved, provenance-linked projections.

## Target runtime and service topology

```text
launchd daily trigger (single-run lock)
        |
        v
private worker supervisor (non-admin Mac account)
  |-- official metadata discovery -> candidate/audit state
  |-- approved transcript adapter -> encrypted private transcript store
  |-- approved media adapter -> short-lived local staging
  `-- FFmpeg keyframe worker -> bounded private derivative store
        |
        v
review/Hermes gate -> immutable approved projection -> read-only Atlas API
```

- Keep the web/API container separate from workers. The public/read service is
  read-only and mounts only the approved projection directory read-only; it has
  no media, transcript, YouTube API, OAuth, or publishing credentials.
- Run worker processes under a dedicated non-admin macOS account. Prefer a
  rootless container or a locally installed worker with a strict filesystem
  sandbox. The worker sees only its application-support state, encrypted media
  store, short-lived staging directory, and write-only structured logs.
- Admin access is private (VPN/identity-aware access plus MFA). Do not expose
  worker, storage, FFmpeg, health detail, review, or OAuth callback endpoints
  from the Mac Mini to the public Internet.
- Treat the Mac Mini as a single-host service: UPS, disk encryption, automatic
  security updates with maintenance windows, and off-host recovery storage are
  required for a production pilot, not assumed high availability.

## Scheduling, cadence, and concurrency

- `launchd` triggers daily metadata/transcript/keyframe processing at an
  off-peak local time. It does not use `RunAtLoad`; a checked-in template has
  no live path or enablement value.
- Use one supervisor lock across the complete daily run. A second trigger exits
  with a distinct `already_running` result and emits no state mutation. Stale
  locks alert after a bounded maximum runtime and require operator inspection,
  never automatic deletion.
- Sequence work: metadata discovery -> source/right/approval validation ->
  transcript acquisition -> keyframe extraction -> manifest/audit write ->
  review handoff. Never start FFmpeg before approved input and a durable job
  record exist.
- Start with one video in flight and at most one FFmpeg process. Permit a
  configured low concurrency only after Mac Mini CPU, thermal, disk, and
  recovery evidence show headroom. Discovery requests retain the existing
  250-ms minimum separation and bounded retry policy.
- Separate a weekly or manually approved full metadata reconciliation from the
  daily incremental run. Do not make transcript/media retries increase API
  enumeration frequency.

## Secrets and identity boundary

- Store the restricted YouTube metadata API key and transcript-provider OAuth
  refresh token in the macOS Keychain or an approved secrets manager. Use
  separate service labels/identities; do not put either in `.env`, Docker build
  arguments, images, logs, browser variables, URLs, launchd plist values, or
  source control.
- The Keychain access policy permits only the dedicated worker identity. OAuth
  scopes must be minimum necessary, source/provider-specific, consented, and
  periodically reviewed. Reject interactive/personal OAuth tokens for an
  unattended service.
- Token refresh is worker-internal. Store refresh/access-token metadata only as
  redacted status (`valid`, expiry window, last refresh outcome); never write
  token values to job/audit output. Rotate/revoke on suspected exposure and
  retain a non-secret incident record.
- A missing, expired, insufficiently scoped, or unapproved transcript token is
  a terminal `authorization_blocked` result. It does not fall back to scraping,
  generic captions, or an API key.

## Persistent data, retention, backup, and restore

Use separate encrypted private volumes/directories with mode-700 ownership:

| Store | Contents | Retention / recovery |
| --- | --- | --- |
| `state/` | high-water marks, idempotency keys, job checkpoints | Back up daily; retain to support incremental reconciliation and replay. |
| `audit/` | redacted JSON job manifests, input/output hashes, rights decision, tool/version, timestamps | Back up daily; retain at least 90 days unless policy requires longer. |
| `transcripts/` | approved transcript payload or encrypted provider artifact | Retention must be explicitly approved for copyright/privacy; default to locator, hash, and minimal excerpt only. |
| `media-staging/` | temporary approved media input and FFmpeg intermediates | Encrypt, mode 700, delete securely after successful derivative validation or expiry. Never back up by default. |
| `keyframes/` | derived approved frames plus manifest/hash | Retain only reviewed/needed frames; back up approved derivatives and manifests, not unapproved staging. |
| `projection/` | approved last-known-good public projection | Back up daily; restore before resuming public reads after an incident. |

- Backups are encrypted to an approved organizational recipient and copied
  off-host. Archives contain only intended state/audit/approved derivatives/
  projection, not Keychain secrets, raw staging, source checkout, Docker image,
  or credentials.
- Run a quarterly isolated restore drill into an empty target. Validate state
  JSON/schema, manifest signatures/hashes, projection version, keyframe count,
  and that restored transcripts remain private. Record the exact backup
  manifest, revision, operator, and result.
- Recovery order: disable launchd -> preserve logs/audit -> restore
  last-known-good projection for reads -> restore state/audit -> validate
  manifests -> resume manual single-item processing only after approval.

## FFmpeg and resource controls

- Pin FFmpeg/ffprobe versions and checksums in the deployment evidence. Build
  or install from an approved source; record the binary version per job.
- Allow only a constrained command profile: explicit input path inside approved
  staging, explicit output directory, fixed frame dimensions/rate/quality,
  duration and file-size caps, no shell interpolation, no arbitrary filter
  graphs, no network protocols, and a timeout. Treat media metadata as
  untrusted.
- Set CPU/thermal and disk guardrails before running FFmpeg: reserve at least
  20 GB free disk, cap staging size per asset, stop new jobs when free-space or
  temperature thresholds fail, and retain only one active encode by default.
- Validate every derivative with `ffprobe`, count/hash frames, reject
  unexpected duration/codec/size, then atomically promote it from staging to
  the private derivative store. Partial output is quarantined and expires by
  retention policy.

## Observability, retry, and alerting

Emit structured, redacted JSON logs with job ID/correlation ID, source ID,
source method, policy decision, stage, elapsed time, byte/disk counters,
tool version, retry class, and result. Never log tokens, full transcript text,
media URLs containing credentials, or raw provider responses.

| Signal | Alert / action |
| --- | --- |
| No successful daily manifest within 26 hours | Page Operations; confirm launchd, lock, Keychain status, and API/provider state. |
| YouTube 429/5xx or quota trend | Stop retries after bounded backoff; alert and wait for next approved window. No fallback scraping. |
| OAuth authorization block | Alert Security/Operations; re-authorize only with approved service identity. |
| FFmpeg timeout, invalid derivative, disk/thermal threshold | Quarantine job, retain redacted manifest, stop new media work, investigate host capacity/input validity. |
| Projection hash/signature mismatch | Freeze publication, serve prior last-known-good projection, open P0 integrity incident. |
| Backup missing or restore failure | Block scheduler enablement/continuation until recovery evidence is restored. |

- Retry only network/transient `429`/`5xx` metadata/provider failures with
  bounded exponential backoff, jitter, `Retry-After` where available, and a
  capped attempt count. Authorization, rights, validation, malformed media,
  schema, hash, and policy errors are terminal/manual-review outcomes.
- Monitor job age, queue depth, discovery API request count/quota/error rate,
  transcript authorization rate, FFmpeg duration/failure rate, disk free,
  thermal state, backup age, restore result, and projection freshness. Establish
  baseline thresholds during the pilot rather than guessing an SLO.

## Runbook and rollback

### Daily operation

1. Confirm the release revision, approved source list, Keychain identities,
   last successful backup, free disk, and last-known-good projection.
2. Allow one launchd supervisor run. Review its redacted manifest for all stage
   outcomes and ensure no unapproved transcript/media record reached projection.
3. Route candidate, transcript, and keyframe outputs to the content/Hermes
   review queue. Metadata-only records cannot imply an insight or attribution.
4. Record quota, error, duration, and capacity metrics; investigate before the
   next run if alert thresholds were crossed.

### Incident and rollback

1. Disable the daily launchd job and metadata/transcript/keyframe enable flags.
2. Revoke/rotate suspected credentials; preserve redacted logs, job manifests,
   hashes, and projection version for Security.
3. Quarantine affected assets; do not erase audit evidence. Withdraw/revert to
   the approved last-known-good projection if any integrity/right/review breach
   occurred.
4. Restore only intended encrypted state/audit/approved derivative/projection
   content into an empty target, validate it, and resume with a manual,
   single-source run after Security, QA, Content, and Delivery Manager approval.

## Validation and release gates

Before enabling a daily pilot, require revision-bound evidence for:

1. Fixture-led unit/integration tests: source allowlist, no search/scraping,
   pacing/retry limits, transcript authorization rejection, media command
   construction, FFmpeg timeout/quota, quarantine, idempotency, and no public
   transcript/candidate/admin exposure.
2. A restricted-key manual full metadata run with resolved playlist, quota,
   state, and candidate evidence; this does not itself authorize media work.
3. A one-item approved transcript/media dry run that proves rights/OAuth scope,
   FFmpeg derivative validation, redacted audit, review handoff, and no public
   projection mutation.
4. Encrypted off-host backup and isolated restore drill for intended state and
   approved derivatives/projection.
5. Security approval of OAuth/provider terms, data classification/retention,
   private host exposure, Keychain policy, and incident response.
6. QA evidence for retry/negative paths and Delivery Manager approval of cadence,
   support owner, and rollback readiness.

## Risks and caveats

- Rights to retrieve, retain, and derive/transcode content are provider- and
  source-specific; an API/OAuth capability is not a blanket content licence.
- A local Mac Mini has single-host power, Internet, storage, thermal, and
  Keychain-session failure modes. Its initial availability target must be below
  managed multi-zone infrastructure unless architecture changes.
- Transcript content can introduce copyright, privacy, prompt-injection, and
  sensitive-content exposure. Process it as untrusted data, never as operating
  instructions, and minimize retention.
- This plan intentionally does not define a transcript provider or OAuth scope;
  those choices require legal/content/security approval before implementation.

## Dependencies

- Full-stack: worker contracts, idempotent job manifests, source/right policy
  checks, transcript adapter, safe FFmpeg invocation, projection/review gate,
  and deterministic tests.
- QA: fixture media, negative-path and recovery coverage, pilot acceptance,
  and revision-bound evidence.
- Security/Compliance: provider/terms review, OAuth client and scope approval,
  Keychain identity policy, retention classification, encrypted backup recipient,
  and incident process.
- Product/Content/Hermes: approved channels/assets, transcript rights, review
  states, keyframe usage policy, and publication/retraction decision.
- Delivery Manager: cadence, support/on-call owner, pilot go/no-go, and release
  approval.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Transcript authority | API key only; approved OAuth/provider contract; scraping | Approved provider contract with least-privilege service OAuth; fail closed otherwise | High | Rights breach or unsupported retrieval | Security + Legal + Content |
| Media input | Watch-page download; approved local/provider asset | Approved local/provider-sanctioned asset only | High | Terms/security breach and unreliable extraction | Content + Security |
| Pilot concurrency | Parallel workers; one item/one FFmpeg | One in-flight item and one FFmpeg until capacity evidence supports change | High | Thermal/disk exhaustion and ambiguous recovery | Operations + QA |
| Transcript retention | Full indefinite corpus; bounded encrypted payload; locator/hash only | Locator/hash by default; retain encrypted payload only with explicit approved policy | High | Copyright/privacy exposure | Legal + Security + Content |
| Keyframe publication | Automatic public media; reviewed private derivative; metadata only | Keep frames private/reviewed; publish only approved projection references | High | Unauthorized media exposure | Content + Product + Security |
| Backup recipient | Ad-hoc local key; approved organizational recipient | Approved off-host organizational recipient plus quarterly restore drill | High | Unrecoverable or inaccessible backup | Security + Operations |
