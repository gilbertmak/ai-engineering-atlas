# Solution architecture handoff

## Task summary

Inspected the current Atlas frontend, source-verification scripts, server configuration, tests, and prior remediation handoff. Recommended architecture: keep Hermes as the canonical evidence/knowledge layer; add a Mac Mini-hosted, private ingestion and publishing service backed by PostgreSQL; expose a read-only public Atlas API that serves only evidence-linked, publishable projections. The frontend must never receive YouTube credentials or unpublished/unsupported claims.

## Key facts

- The current app is a TanStack Start/Vite React TypeScript gallery. Its 14 `Video` records are compiled into `src/data/videos.ts` and imported directly by the primary route.
- There is no persistence, API resource route, job runner, credentials configuration, Docker deployment, CI workflow, or backend data contract today.
- `scripts/discover-video-sources.ts` scrapes YouTube search results and calls public oEmbed; `scripts/verify-video-sources.ts` uses oEmbed and parses YouTube watch-page HTML. These are useful operator tools, not a production ingestion boundary.
- Verification is serially invoked by `bun run verify:sources`; it has no persistent audit, retry queue, rate policy, or semantic-review workflow.
- The current server entry is built by TanStack/Nitro and `preview` runs `wrangler dev` against a Cloudflare target. That is incompatible with treating the existing output as a persistent Mac Mini API runtime without a deployment split.
- Current insights are editorial track syntheses, visibly labelled as non-transcript summaries. They are not video-specific evidence records and must remain explicit until Hermes holds approved, cited evidence for each display claim.
- Current tests assert 14 unique, valid, date-sorted records, but do not verify API contracts, provenance completeness, review policy, or failed-ingestion behavior.
- The prior source remediation establishes a strict semantic rule: HTTP/oEmbed reachability alone is insufficient; title/channel identity must match the intended talk and unverified sources stay out of the published catalog.

## Outputs

### Recommended target architecture

```text
YouTube Data API / allowed public metadata
                  |
                  v
Mac Mini private network
  Scheduler -> Discovery worker -> Verification worker -> Enrichment/Hermes adapter
                    |                    |                    |
                    +--------------------+--------------------+
                                         v
                              PostgreSQL + evidence/audit store
                                         |
                             publish gate / projection builder
                                         |
                           Read-only Atlas API (HTTPS)
                                         |
                         React/TanStack Atlas frontend
```

| Component | Responsibility | Trust boundary |
|---|---|---|
| Discovery worker | Poll approved channels, playlists, and search seeds; create candidates only | Holds YouTube API key |
| Verification worker | Resolve official metadata; compare identity rules; record evidence snapshots | Holds YouTube API key |
| Hermes adapter | Submit source facts and candidate insights; receive canonical evidence IDs, review state, confidence, and claim approvals | Authenticated service-to-service only |
| PostgreSQL | Durable operational state: videos, versions, evidence, jobs, audit, projections | Private Mac Mini network |
| Publish gate | Materialize a display projection only when source and every displayed claim meet policy | No LLM-only facts bypass |
| Atlas API | Serve versioned, cacheable public projections; expose admin separately | Public read-only and private admin split |
| Frontend | Fetch display projection; show provenance, status, caveats; never derive factual claims | Browser has no secrets |

Architecture decisions:

1. Hermes owns canonical knowledge and evidence; PostgreSQL is an operational cache and publishing ledger, not a competing knowledge authority.
2. YouTube Data API v3 is the primary metadata source. oEmbed/watch-page parsing is a bounded fallback/reconciliation probe, not authoritative automation.
3. Fail closed for claims. A video may publish with verified metadata and `No verified insight yet`; an insight cannot publish without a Hermes evidence reference and completed review.
4. Separate public reads from administrative mutation. The public API has no YouTube key; worker/admin endpoints require private-network access plus service authentication.
5. Preserve a source-version hash in every projection. Frontend payload, Hermes evidence references, and audit run trace to one publication version.

### Data lifecycle and update workflow

1. Scheduler triggers per-source polling (for example, every six hours) and daily full reconciliation.
2. Discovery records immutable candidate observations keyed by `youtube_video_id`; duplicate inputs collapse into one active candidate.
3. Verification fetches official metadata, normalizes title/channel/date/duration, validates source/channel allowlists and identity rules, and saves raw evidence snapshot/hash.
4. A verified candidate is sent to Hermes. Proposed insights remain `draft` until evidence linkage and human/editorial review complete.
5. Publish gate selects only verified video metadata and approved insights with complete evidence and a stable Hermes canonical ID.
6. It creates an immutable `projection_version`; API serves that version with `published_at`, `source_verified_at`, confidence, caveat, and evidence links.
7. Retractions, metadata changes, unavailable videos, and revoked evidence unpublish the affected claim/projection and retain the audit trail.

### Core API contract

Public endpoints:

- `GET /v1/catalog?track=&q=&cursor=&limit=`
- `GET /v1/videos/{videoId}`
- `GET /v1/catalog/manifest`
- `GET /healthz` and `GET /readyz`

Administrative/private endpoints:

- `POST /v1/admin/runs/discovery`
- `POST /v1/admin/runs/verification`
- `POST /v1/admin/publish`
- `GET /v1/admin/jobs/{id}`

Example public video response:

```json
{
  "id": "v21",
  "code": "aie-021",
  "youtube_id": "SKDJo2CopRs",
  "title": "Why Eval++ Is the Next Great Compute Primitive — Sunil Pai & Matt Carey, Cloudflare",
  "source_channel": "AI Engineer",
  "track": "Data & Eval",
  "published_at": "2026-06-08T13:00:13Z",
  "duration_seconds": 1490,
  "source": {
    "verification_status": "verified",
    "verified_at": "2026-07-18T06:00:00Z",
    "evidence_url": "https://www.youtube.com/watch?v=SKDJo2CopRs",
    "evidence_hash": "sha256:...",
    "source_version": 4
  },
  "insights": [
    {
      "id": "ins_01J...",
      "claim": "…",
      "implication": "…",
      "caveat": "…",
      "confidence": "high",
      "status": "approved",
      "hermes_knowledge_id": "hermes://knowledge/...",
      "evidence": [{
        "id": "ev_01J...",
        "type": "transcript_timestamp",
        "url": "https://www.youtube.com/watch?v=SKDJo2CopRs&t=612",
        "locator": "00:10:12",
        "verified_at": "2026-07-18T06:03:00Z"
      }]
    }
  ],
  "projection_version": "2026-07-18T06:10:00Z-7f3c"
}
```

| Domain | States |
|---|---|
| Candidate | `discovered`, `deduplicated`, `rejected`, `queued_for_verification` |
| Source verification | `pending`, `verified`, `mismatch`, `unavailable`, `manual_review`, `retired` |
| Enrichment | `not_requested`, `draft`, `evidence_linked`, `review_required`, `approved`, `rejected`, `superseded` |
| Publication | `not_publishable`, `published`, `withheld`, `retracted` |
| Job | `queued`, `running`, `succeeded`, `retryable_failed`, `terminal_failed`, `cancelled` |

### Proposed persistence

Use PostgreSQL 16 on the Mac Mini, with daily encrypted logical backups off-host. Tables: `source_feeds`, `videos`, `video_versions`, `evidence_records`, `insights`, `projection_versions`, `projection_items`, `jobs`, `job_attempts`, `outbox_events`, and `audit_events`. Keep raw YouTube API responses only as long as needed for audit/debug (for example 30 days); retain normalized provenance and audit data longer; do not store copyrighted transcripts unless licensing and retention policy permit it.

### Ingestion resilience, idempotency, and audit

- Idempotency key: `{source_feed_id}:{youtube_video_id}:{metadata_etag-or-normalized-payload-hash}`; enforce uniqueness in PostgreSQL.
- Use transactional outbox events between persistence and Hermes submission. Consumers deduplicate using event ID and Hermes external-reference ID.
- Retry network, 429, and 5xx failures with exponential backoff, jitter, and `Retry-After`; cap attempts then alert on `terminal_failed`.
- Never overwrite prior evidence. Append versioned records, mark supersession/retraction, and retain before/after hash plus reason.
- Re-verify title, channel, publication date, duration, availability, and identity-policy result. Metadata changes go to `manual_review`, not silent UI changes.
- Hermes writes include model/process version, prompt/template version, evidence IDs, reviewer identity, and approval timestamp.

### Mac Mini runtime, network, and operations

- Run API, worker, and PostgreSQL as separate Docker Compose services. Do not run the Cloudflare/Nitro preview server as the persistent backend.
- Keep Postgres and worker ports on a private Docker network. Bind API to localhost/private LAN; reverse proxy terminates TLS and routes only `/v1/*`.
- Prefer a mesh VPN such as Tailscale for admin access. If public access is required, publish only read-only endpoints behind HTTPS, WAF/rate limiting, and an allowlisted CORS origin.
- Store YouTube and Hermes credentials in macOS Keychain or a secrets manager injected at runtime. `.env` is development-only, excluded from Git and logs. Rotate credentials and audit access.
- Frontend can remain Lovable/Cloudflare/static hosting and receives only `VITE_ATLAS_API_BASE_URL` at build time—not a secret.
- Use launchd/Docker restart policies, health checks, disk-space alerting, JSON logs, metrics, uptime alerts, encrypted off-device backups, and quarterly restore tests.
- Initial hardware assumption: 16 GB RAM, 100 GB free SSD, UPS, stable Internet. Benchmark before colocating transcript/enrichment workloads.

| NFR | Target / mechanism |
|---|---|
| Integrity | Immutable evidence/version tables, publish gate, Hermes ID required |
| Availability | Restart policy, health checks, retries, backups; home-network availability is lower than managed cloud |
| Latency | Cached catalog p95 under 300 ms; async workers never block reads |
| Freshness | Source polling target under six hours; visible `verified_at` and `projection_version` |
| Security | Secret isolation, no browser credential exposure, segmentation, authenticated admin API |
| Observability | Correlation IDs, job age/error rate/stale-catalog alerts |
| Accessibility | Preserve semantic cards/modal, keyboard controls, clear unavailable/withheld states |
| Auditability | Evidence links/hashes, reviewer/publisher trail, durable job attempts |

### Phased implementation plan

1. Foundation: define OpenAPI/Zod schemas and migrations; seed current verified records; create read-only API; switch frontend to API fetch with static fallback only for local development.
2. Verification: add source feeds, YouTube Data API adapter, canonical verifier, queue/retries/audit; port scripts as worker adapters; add admin run/status endpoints.
3. Hermes: transactional adapter, insight/evidence schema, review gate, and clear `no verified insight yet` rendering; prohibit per-video use of static track-synthesis fallback.
4. Publishing and operations: immutable projections, cache, retraction path, Docker/reverse proxy/backups/monitoring, threat review, restore drill, load test, and runbook.
5. Hardening: CI contract tests, source-drift alerts, rate-limit tests, Hermes-outage replay, independent semantic-review sampling; migrate to managed compute/database if SLO requires.

## Assumptions

- Hermes can provide a stable API for canonical evidence and reviewable knowledge records; exact authentication, transcript, and citation behavior is not yet runtime-validated.
- The product may use YouTube Data API credentials on the Mac Mini and complies with platform terms, quota, and display requirements.
- The initial catalog is public metadata plus short evidence-linked editorial insights; full transcript ingestion is not assumed.
- Mac Mini is acceptable for the initial availability target; public availability is below a managed-cloud SLO.
- The frontend will be modified only in a later implementation phase; this handoff made no code changes.

## Risks and caveats

- Metadata and availability are mutable; title/channel matching must stay policy-driven and reviewable.
- Scraping YouTube watch/search pages is brittle and may conflict with platform controls; use API-first retrieval and honor quota/terms.
- A Mac Mini creates power, ISP, NAT, patching, backup, and single-host failure risk. It is not implicit high availability.
- Hermes could become a bottleneck/opaque authority unless evidence IDs, approval/retraction semantics, export format, and SLO are specified.
- Current UI track text must never be reframed as video evidence without citations.
- API/CORS and analytics must avoid logs containing user secrets, unnecessary search histories, credential errors, or unapproved transcript content.

## Dependencies

- Product/content owner approves feeds, source identity policy, track taxonomy, and external-channel policy.
- Hermes owner publishes API/auth/evidence/review/retraction contract and SLO.
- Full-stack development owns contracts, frontend data migration, projection rendering, and compatibility fallback.
- Delivery operations owns host, VPN/TLS, containers, secrets, backup, monitoring, and runbooks.
- Security/compliance owns terms review, threat model, secret/data-retention review, and public exposure approval.
- QA owns contract, idempotency, semantic verification, retraction, retry, accessibility, and end-to-end acceptance coverage.

## Validation

Read-only inspection: `src/data/videos.ts`, source scripts, `src/routes/index.tsx`, `src/server.ts`, `vite.config.ts`, `package.json`, `tests/videos.test.ts`, and the earlier source-catalog remediation handoff. No commands were run against YouTube, Hermes, or a Mac Mini. Confidence is high for current-state constraints and target boundaries; medium for Hermes integration and host topology until live contracts/network are validated.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
|---|---|---|---|---|---|
| Hermes integration boundary | Hermes canonical with operational cache; Atlas DB canonical | Hermes canonical; Postgres stores operational/audit/projection copies only | High | Conflicting knowledge sources and difficult retractions | Product owner + Hermes owner |
| YouTube acquisition method | Data API primary; scraping primary; manual only | Data API primary; fallback probes only for reconciliation | High | Breakage, quota/terms risk, poor metadata | Technical owner + compliance |
| Insight publication policy | Publish generated insight immediately; cited/reviewed only | Fail closed: publish cited Hermes-approved claims only | High | Unsupported claims displayed as fact | Content owner + security |
| Mac Mini exposure model | Public API from home network; VPN/private origin; managed cloud | Private admin via VPN plus public read API behind TLS/reverse proxy; migrate if SLO rises | Medium | Security exposure or poor availability | Delivery operations + security |
| Persistence engine | SQLite; PostgreSQL | PostgreSQL from phase 1 for concurrent workers, audit, retries, versioning | High | Locking/recovery limitations | Solution architecture + full-stack |
| Transcript retention | Store full transcripts; locators only | Start with locators/snippets/hashes; add storage only after terms/privacy review | High | Copyright, storage, compliance risk | Compliance + content owner |
| Current editorial syntheses | Video facts; generic track copy; remove | Keep only clearly labelled generic track taxonomy; never attach to a video as evidence | High | Unsupported speaker/video attribution | Product/content owner |
