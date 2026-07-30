# AI Engineer Insight Atlas — backend architecture delivery pack

**Status:** Proposed plan; no application code, infrastructure, or live-service configuration changed.  
**Planning date:** 2026-07-18. **Forecast confidence:** Medium.  
**Delivery objective:** replace static catalog reads with a frontend consuming a Mac Mini-hosted, read-only Atlas API that continuously discovers and verifies YouTube sources and publishes only Hermes-canonical, evidence-linked insight projections.

## Scope and non-negotiables

- Hermes is canonical for knowledge, evidence, approvals, and retractions. The Atlas database is an operational cache, publishing ledger, and API projection store only.
- Every factual, video-specific display claim must have a Hermes canonical ID, evidence locator, review approval, and immutable projection version. Missing evidence means withhold the claim; it never means infer or embellish it.
- Current `track_synthesis` content remains clearly labelled generic editorial taxonomy and must not be attached to an individual talk as transcript-backed evidence.
- The browser gets only `VITE_ATLAS_API_BASE_URL`; no YouTube credential, OAuth token, signing key, admin token, or secret may be in a client build, source map, URL, analytics payload, or `VITE_*` variable.
- Public delivery is anonymous, read-only, HTTPS, rate-limited, cacheable API access. Mac Mini administration, workers, database, Hermes mutation, review, job, backup, and metrics paths are private-only.

## Current-state facts

- `src/data/videos.ts` compiles 14 verified records into the React route; there is no persistence or backend resource contract.
- `scripts/discover-video-sources.ts` and `scripts/verify-video-sources.ts` make direct YouTube search/oEmbed/watch-page requests; they lack durable queues, retries, rate policy, audit, or semantic review.
- The source-catalog remediation requires exact canonical identity, not mere HTTP reachability. This rule is retained as a hard publish gate.
- Existing TanStack/Nitro `preview` runs against a Cloudflare target. It is not the intended persistent Mac Mini backend runtime.

## Target operating model

```text
Approved YouTube feeds / YouTube Data API
        ↓ private egress only
Scheduler → Discovery → Verification → Hermes adapter → Review queue
                         ↓                   ↓
               evidence snapshots       Hermes canonical decisions
                         \                 /
                       Atlas Postgres (operational/audit/projections)
                                      ↓
                        immutable signed publication projection
                                      ↓ HTTPS, cache, rate-limit
                           public read-only Atlas API
                                      ↓
                          React/TanStack Atlas frontend
```

### Component responsibility and interface boundary

| Component | Owner | Responsibility | Cannot do |
|---|---|---|---|
| Discovery worker | Full-stack + Ops | Poll approved feeds, create deduplicated candidates | Publish claims or change Hermes records |
| Verification worker | Full-stack + Content | Fetch official metadata, apply canonical identity policy, store evidence hash | Treat a 200 response as semantic verification |
| Hermes adapter | Architecture + Hermes owner | Submit source facts/candidates, receive canonical evidence/review/retraction state | Bypass authenticated Hermes contract |
| Review/publish gate | Content + publisher | Approve evidence-linked insights and build immutable projection | Publish a draft/unsupported claim |
| Atlas PostgreSQL | Ops + Data | Versioned operational, audit, queue, and projection state | Become the canonical knowledge layer |
| Public API | Full-stack | Serve approved read projections only | Serve secrets, admin functions, raw transcripts, or unpublished records |
| Mac Mini platform | Delivery Ops | Isolated runtime, private admin, secrets, backup, monitoring | Directly expose database/admin services to internet |

## Minimum API and data contracts

**Public:**

- `GET /v1/catalog?track=&q=&cursor=&limit=` — published card projections only, with `ETag` and `projection_version`.
- `GET /v1/videos/{id}` — canonical metadata and approved evidence-linked insights only.
- `GET /v1/catalog/manifest` — current projection revision, generation time, and content hash.
- `GET /healthz` — liveness only. `GET /readyz` must expose no sensitive dependency detail publicly.

**Private control plane (VPN/identity-aware proxy only):**

- `POST /v1/admin/runs/discovery`, `POST /v1/admin/runs/verification`, `POST /v1/admin/publish`.
- `GET /v1/admin/jobs/{id}` and review/audit endpoints, protected by role and audit trail.

**Mandatory record fields:** stable Atlas/video ID; YouTube ID; canonical title/channel/date/duration; allowed-feed/identity-policy result; retrieval time/method; raw-artifact and normalized-evidence hashes; `verification_status`; Hermes ID/version; insight evidence locators; reviewer/publisher identity and timestamps; `review_status`; `publication_status`; retraction/supersession reason; correlation ID; `projection_version`.

**State transitions:**

```text
discovered → queued_for_verification → verified → Hermes draft
     ↘ rejected/mismatch/unavailable          ↘ evidence_linked → review_required
                                                         ↘ approved → published
                                                         ↘ rejected/superseded
published → withheld/retracted (on evidence, identity, or signature failure)
```

No automatic path reaches `published` from discovery, verification, or LLM/Hermes draft.

## Delivery milestones and critical path

Dates are planning forecasts from a 2026-07-20 start; confirm capacity and Hermes availability before committing.

| Milestone | Owner | Forecast | Entry criteria | Exit criteria | Confidence |
|---|---|---:|---|---|---|
| M0: Decisions and contract spike | PM, Architecture, Security, Hermes owner | 2026-07-24 | Named owners, source-feed list | Signed Hermes/API/edge/retention decisions; live contract spike outcome | Medium |
| M1: Secure platform foundation | Delivery Ops + Security | 2026-08-07 | M0 security decisions | Hardened Mac Mini, private admin, server-side secrets, encrypted off-host backup, restore evidence | Medium |
| M2: Read API and seeded catalog | Full-stack + Data + QA | 2026-08-14 | M0 data contract | API serves the 14 verified records from an immutable projection; client has no secrets | Medium |
| M3: Shadow ingestion/verification | Full-stack + Content + QA | 2026-08-28 | M1/M2, YouTube project/quota | Scheduled discovery/verification runs, queue/audit/idempotency, review queue; no automatic public claim updates | Medium |
| M4: Hermes review and publish | Hermes owner + Content + QA | 2026-09-11 | M3 and live Hermes contract | Approved evidence-linked insight pilot published; retraction and signature/negative tests pass | Low-Medium |
| M5: Production readiness and cutover | PM, Ops, Security, QA | 2026-09-25 | M4 accepted | Monitoring/alerting, backup restore, access review, load test, runbooks, release approval | Medium |

Critical path: **Hermes contract and content policy (M0) → secure private/public topology (M1) → signed projection and frontend read contract (M2) → shadow verification (M3) → reviewed Hermes pilot/retraction proof (M4) → release evidence (M5).**

## Implementation plan

1. **Contract first:** define OpenAPI/Zod schemas, PostgreSQL schema, source identity policy, review/retraction protocol, key ownership, and content-retention policy. Run a live Hermes integration spike; do not build to inferred behavior.
2. **Secure platform:** separate API, worker, and Postgres containers; private Docker network; managed tunnel/reverse proxy for public read endpoints; Tailscale or equivalent for admin; FileVault, non-admin service account, firewall default deny, secrets via Keychain/manager, launchd/restart checks, encrypted off-host backups.
3. **Read-only thin slice:** import current 14 defensible records with their existing verification evidence; build the versioned projection and read API; change frontend later to fetch it with a local-only static fallback. Validate exact CORS and no secret in artifact.
4. **Bounded source automation:** use YouTube Data API server-side as primary metadata source; preserve direct probes only as labelled reconciliation. Add allowlisted feeds, durable jobs/outbox, idempotency, backoff, quotas, drift handling, and quarantine.
5. **Hermes evidence plane:** submit verified source facts, receive/validate canonical IDs and evidence locators, stage as `review_required`, and require reviewer plus publisher approval. Publish only a signed immutable projection. Implement immediate withdrawal on evidence, identity, review, or signature failure.
6. **Hardening/release:** CI contract/provenance/negative security tests; prompt-injection corpus; job, freshness, and rate-limit monitoring; restore, credential-rotation, and retraction drills; independently sample semantic source verification before scale-out.

## RAID summary

| Type | Description | Owner | Impact | Due | Mitigation / escalation | Status |
|---|---|---|---|---|---|---|
| Decision | Hermes API, evidence IDs, approval/retraction semantics are not live-validated | Hermes owner + Product | Blocks M2–M4 | M0 | Contract spike; escalate to product sponsor if Hermes cannot supply stable versioned evidence | Open |
| Risk | Unsupported claim or semantically wrong source appears publicly | Content owner + Security | Critical trust/provenance breach | M3 | Identity matcher, immutable evidence, reviewer/publisher gate, signed projection, retraction runbook | Open |
| Risk | YouTube quota/terms/source change breaks update flow | Architecture + Compliance | Stale/incorrect catalog | M0/M3 | API-first access, allowlist, quotas, reconciliation probes, fail closed/manual queue | Open |
| Risk | Mac Mini power/ISP/NAT/single-host outage | Delivery Ops | Read API unavailable or delayed ingestion | M1 | Managed tunnel, health checks, UPS, off-host encrypted backup, RPO/RTO, migration trigger | Open |
| Risk | Browser or telemetry leaks credentials/transcripts/reviewer data | Security + Full-stack | Security/privacy incident | M2 | Server-only secrets, no `VITE_*` secrets, artifact/log scans, redacted event schema | Open |
| Dependency | Google Cloud project, restricted server-side YouTube API key, quota owner | Product + Delivery Ops | Blocks M3 | M0 | Create/secure key after architecture decision; do not fall back to client credential | Open |
| Dependency | Public DNS/tunnel and an exact frontend origin | Delivery Ops | Blocks M2 public integration | M0 | Choose managed tunnel/reverse proxy; exact CORS allowlist | Open |
| Dependency | Legal decision for transcript/excerpt retention and audience jurisdiction | Product/Legal | Limits M4 content scope | M0 | Default to metadata, hashes, timestamp locators, and approved minimal excerpts | Open |
| Issue | Current gallery is static with no API/audit/job infrastructure | Full-stack | Expected build work; not a production blocker yet | M2 | Thin-slice API before automation | Known |
| Assumption | Mac Mini is acceptable for initial availability target | Product + Ops | Architecture may need managed migration | M0 | Set RPO/RTO and SLO; migrate if requirements exceed single-host capability | Unconfirmed |

## Governance and escalation

- Daily 15-minute engineering triage during M1–M4: job failures, source drift, contract blockers; owner resolves or escalates within one business day.
- Weekly provenance/release review: Product/content, Hermes owner, Security, QA, Architecture; inspect candidate/review/retraction metrics and approve scope movement.
- Biweekly operations review: patch state, access list, credential age, backup success, disk capacity, tunnel/edge availability.
- Pre-release gate: Product, QA, Ops, and Security sign the same projection revision and evidence pack. A successful build alone is not release approval.
- Immediate P0 escalation: secret suspected exposed, public mutation path, unsupported/speaker-attributed claim published, signature failure, or Mac Mini management exposure. Actions: disable public projection/update path, revoke keys/sessions, preserve audit evidence, withdraw affected version, notify PM/Security/Product, and only restore with documented approval.

## Release acceptance criteria

1. Public frontend consumes a versioned read-only API projection; no public mutation/admin endpoint is reachable.
2. Client artifacts, source maps, logs, URLs, and analytics are scanned clean for credentials; only API base URL is client-configurable.
3. Every visible video-specific claim has an approved Hermes version, source/evidence reference, timestamp/locator where applicable, reviewer, caveat/confidence, and projection hash; otherwise it is withheld or labelled generic editorial taxonomy.
4. A 200 response is insufficient: canonical title/channel/date/duration identity policy passes, with evidence retained and mismatch moving to manual review.
5. Direct browser/API attempts to submit, publish, or inspect raw evidence/admin paths are denied; CORS, TLS, headers, rate limits, payload limits, and generic errors are proven.
6. Automation uses allowlisted upstreams, idempotent jobs, bounded retry/backoff, quota observability, quarantine, and audit trails. It cannot auto-publish insight claims.
7. Mac Mini has private MFA administration, default-deny firewall, patched OS, non-admin runtime identity, server-side secrets, monitoring, encrypted off-host backup, and a passed restore drill.
8. QA passes contract, migration, provenance, retraction, failure/retry, signature, source-drift, prompt-injection, accessibility, and client fallback tests. Release reports the active projection revision and user-visible test evidence.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
|---|---|---|---|---|---|
| Canonical knowledge boundary | Hermes canonical; Atlas DB canonical | Hermes canonical; Atlas stores operational/audit/projection copies only | High | Conflicting facts and irreconcilable retractions | Product + Hermes owner |
| Public edge | Direct Mac Mini exposure; managed tunnel/reverse proxy; managed cloud | Managed tunnel/reverse proxy for read API, no inbound host ports; set cloud migration trigger | High | Host exposure/DDoS or availability failure | Delivery Ops + Security |
| YouTube access | Server-side restricted API key; OAuth; browser key; scraping | Restricted server-side API key for public metadata; OAuth only for explicit private feature; scraping reconciliation only | High | Leaked key, quota abuse, terms risk | Architecture + Compliance |
| Database | SQLite; PostgreSQL | PostgreSQL in phase 1 for concurrent jobs, audit/versioning, recovery | High | Queue locking/recovery limitations | Architecture + Full-stack |
| Transcript policy | Full storage; minimal excerpts/offsets/hashes; none | Minimal evidence locators/hashes and approved excerpts until Legal approval | Medium | Copyright/privacy breach or unusable evidence | Product/Legal |
| Review/publish control | Shared account; RBAC; dual approval | SSO/MFA roles; distinct reviewer/publisher; dual approval for attributed/high-impact claims | High | Unauthorized or unsupported public claim | Product + PM |
| Availability target | Best effort; defined SLO/RPO/RTO | Define before M1; planning baseline RPO 24h/RTO 4h with restore proof | Medium | Wrong host/resilience investment | Product + Delivery Ops |
| Existing track synthesis | Treat as video fact; generic editorial; remove | Keep only generic explicitly labelled editorial taxonomy | High | Unsupported video/speaker attribution | Content owner |

## Validation and caveats

- This is an architecture/delivery recommendation from static repository inspection and two specialist reviews; it is not a live integration or deployment validation.
- No application code changed. Specialist handoffs contain detailed current-state evidence, controls, and contracts.
- `bun` was unavailable in the security reviewer shell, so this plan does not represent a fresh build, test, audit, YouTube, Hermes, or Mac Mini runtime pass.
