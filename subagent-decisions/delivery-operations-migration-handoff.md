# Delivery Operations handoff — Mac Mini migration

## Task summary

Produced migration-ready, least-privilege Docker/Compose, guarded launchd,
encrypted state backup/restore, deterministic CI/release gates, and the Mac
Mini operational runbook. No scheduler, container, or external YouTube call
was enabled or executed.

## Key facts

- The public-facing app container uses Nitro's `node-server` preset, runs as
  non-root UID 10001, exposes only a localhost port, and reports liveness via
  `/healthz`.
- A scheduled metadata flow requires a mode-600 config, three explicit enabled
  flags, exact approved channel/playlist values, a Keychain-held restricted
  YouTube key, and an atomic job lock. It writes only `metadata_only`,
  unclassified records into the durable projection at
  `ATLAS_CATALOG_PROJECTION_PATH`; insight/Hermes publication remains blocked.
- Intended recoverable state is discovery state, candidate handoff/audit JSON,
  and the persisted catalog projection. Backups explicitly exclude source,
  images, Keychain, and all secrets.

## Outputs

- `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`
- `ops/` guarded worker, Keychain/launchd template, backup/restore, and offline
  readiness checks
- `.github/workflows/ci.yml` and `release-gate.yml`
- `docs/operations.md` deployment, monitoring, rollback, and handoff runbook

## Assumptions

- Full-stack persists the catalog projection at
  `ATLAS_CATALOG_PROJECTION_PATH`; Operations mounts its containing state
  directory read-only into the web service at `/app/state`.
- The Full-stack `--scheduled` flow is the sole daily metadata path. It may add
  only exact-match metadata-only records and does not publish Hermes claims.
- Docker Desktop, macOS Keychain, GnuPG, off-host encrypted storage, and a
  support/on-call owner will be provisioned by the deployment owner.

## Risks and caveats

- No Mac Mini, Docker container, Keychain, launchd, backup, restore, or live
  restricted-key YouTube operation has yet been evidenced in this handoff.
- A Mac Mini is a single-host service; failures of power, network, disk, or a
  logged-out Keychain session can interrupt service/job execution.
- The Mac Mini path, Docker mount permissions, and first restricted-key
  metadata projection have not yet been executed as production evidence.

## Dependencies

- Full-stack: retain projection schema, exact-match metadata-only boundary, and
  review/Hermes controls.
- QA: revision-bound Bun/API and restore-drill evidence.
- Security: restricted Google key, Keychain access, exposure/TLS/VPN, log and
  retention approval.
- Delivery Manager/Product: approved playlist, manual full-run review,
  scheduler enablement, and support ownership.

## Validation

Offline configuration/shell syntax checks and a Node-preset build were run; no
live API calls are part of those checks. Local listener validation was blocked
by the sandbox's bind restriction and container validation by an unavailable
Docker daemon. The scheduled scripts use direct Bun invocation so their
redirected candidate JSON has no npm banner; a live scheduled execution still
needs Mac Mini evidence. CI is configured to execute deterministic tests,
production build, operational gate, and container build on the exact revision.
Live readiness remains unvalidated.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Scheduler enablement | Keep disabled; enable after manual evidence | Keep disabled until restricted-key full crawl, quota, backup/restore, health, and candidate review evidence are approved | High | Secret/quota failure or unintended source changes | Delivery Manager + Operations + QA |
| Metadata auto-publication | Candidate only; exact approved metadata-only | Permit exact approved metadata-only records only after manual evidence; retain Hermes gate for insights | High | Unsupported attribution or wrong source publication | Delivery Manager + Content + Operations |
| Mac exposure | Local/VPN only; public reverse proxy | Local/VPN only for this migration; separately approve TLS/WAF/rate limits before public exposure | High | Home-host/API compromise | Security + Operations |
| Backup destination | Local disk; encrypted off-host | Encrypted off-host with quarterly restore drill | High | Irrecoverable state loss | Operations + Security |
