# Security and compliance handoff

## Task summary

Read-only security review of the current AI Engineer Insight Atlas and the proposed continuously running Mac Mini service that discovers, verifies, and updates YouTube sources and Hermes-backed insight records. Security release posture: **do not expose the Mac Mini or any YouTube credential to the browser; public delivery must be a read-only projection of approved Hermes records.**

## Key facts

- Current app is a TanStack React/Vite gallery with a fixture-backed, verified 14-video catalog in `src/data/videos.ts`; no API, authentication, secret store, data persistence, or Mac Mini deployment configuration exists.
- Discovery and verification scripts directly fetch YouTube search/oEmbed/watch pages. They presently use no API credential, but production discovery needs controlled upstream access, quota protection, and resilient failure handling.
- The UI labels current content as `editorial track synthesis`, not speaker-attributed transcript summaries; `TALK_INSIGHTS` is empty until reviewed evidence exists. Preserve this safeguard.
- The public UI embeds YouTube with `youtube-nocookie.com`, but dynamically loads normal YouTube iframe API and external thumbnails. Third-party requests and YouTube privacy/terms still apply.
- `/analytics` is a public, noindex debug route. It is in-memory/tab-local, but would become an information-disclosure risk if server telemetry is added.
- Browser analytics/errors can forward event context to `window.dataLayer` and Lovable error reporting. Future APIs must not permit raw transcripts, request bodies, credentials, or reviewer data into telemetry.
- `.gitignore` excludes `.dev.vars` and `*.local`; no credential files were found. Vite injects `VITE_*` values into client builds, so no YouTube key, OAuth token, signing key, or secret-bearing backend URL may use that prefix.
- Google requires an API key or OAuth token for YouTube Data API requests; public-metadata discovery should use least privilege and not account-wide OAuth.
- Jurisdiction, audience, legal basis, hosting arrangement, and YouTube content-storage/licensing decisions are not supplied. Privacy and retention remain assumptions pending Product/Legal decision.

## Outputs

### Threat model and control mapping

| Threat / trust boundary | Required control | Owner | Evidence / acceptance evidence | Residual risk |
|---|---|---|---|---|
| Public browser → public read API | Read-only allowlisted endpoints; HTTPS; exact-origin CORS; WAF/rate and payload limits; cache/CDN; schema validation; no admin endpoints on public origin | Architecture, Developer, DevOps | API contract, CORS/header tests, rate-limit test, external scan | Source enumeration and availability abuse |
| Public API → Mac Mini | Do not expose Mac Mini IP/ports. Use managed reverse proxy/tunnel; disable port-forwarding/UPnP; firewall default deny | DevOps | Network diagram, external port scan, config review | Home/office power/Internet availability |
| Admin/reviewer → control plane | Separate private control plane, SSO/MFA, RBAC, short-lived sessions, audit; VPN/identity-aware proxy and SSH keys with MFA | Architecture, DevOps | Role matrix, access test, quarterly review | Compromised reviewer account |
| Mac Mini scheduler → YouTube/Google | Egress allowlist; timeouts, quotas, retry/backoff, response-size limits, redirect denial, per-run idempotency; treat upstream as untrusted | Developer, DevOps | Hostile-fixture tests, quota dashboard, logs | Mutable/unavailable metadata |
| Credentials/tokens → host process | Server-side only; Keychain or managed secret store; least privilege/restrictions; rotation/revocation; never logs, URLs, client bundles, Git, CI artifacts, or `VITE_*` | DevOps, Developer | Secret/build scans, IAM evidence, rotation drill | Host compromise exposes runtime secrets |
| Discovery/LLM output → Hermes | Immutable/versioned candidates; normalized schema, source ID/URL, retrieval time, artifact hash, extractor version, evidence offsets, reviewer decision; signed manifest; fail closed | Architecture, Developer, Data | Schema tests, signature verification, lineage query | Source deletion/correction |
| Hermes → gallery projection | Serve only approved, signed, version-pinned projections. No direct browser/automation write to Hermes; reject hash/review failure | Developer, QA | Negative tests, release logs, manifest checks | Approved content can become stale |
| Automation/prompt injection | Treat titles, descriptions, captions, transcripts, URLs, comments as data, not instructions; tool allowlists; no shell/DB/network capability from source text | Developer, Security, QA | Prompt-injection corpus and egress tests | Sophisticated malicious source content |
| Telemetry/error reporting | Allowlisted event schema; drop raw text, IPs, headers, tokens, cookies, reviewer notes; separate operational logs and product analytics | Developer, Data, DevOps | Field tests, redaction samples, vendor review | Minimal pseudonymous telemetry |
| Dependency/build supply chain | Lockfile-only installs, SBOM, CI dependency/secret scanning, vulnerability SLA, pinned deployment artifacts, provenance/attestation where available | Developer, DevOps | CI reports, SBOM, signed digest, patch register | Unpatched transitive dependency |
| Loss/ransomware/host failure | Encrypted backups of Hermes database, evidence manifests, recovery signing material; immutable off-host copy; restore test; RPO/RTO | DevOps, Data | Backup records and quarterly restore evidence | Recovery delay/upstream removal |

### Trust boundaries and roles

1. Public users: anonymous `GET` access only to approved gallery records; no raw evidence, internal IDs, credentials, or unsafe review state.
2. Mac Mini worker: one machine identity; fetches a strict upstream allowlist and creates candidates but cannot publish or alter historical evidence.
3. Reviewers: authenticated authors approve/reject; distinct publisher role or two-person approval for externally attributed/high-impact claims.
4. Hermes: canonical, append-only evidence and decision layer; the only source from which public projections are generated.
5. Operations administrators: manage host, tunnel, backup, secrets; cannot silently edit content records.
6. Third parties: YouTube/Google, Lovable/error telemetry, analytics; receive minimum necessary data.

### Risk-tier autonomy

| Tier | Automation allowed | Human control |
|---|---|---|
| 0 – retrieval | Fetch public metadata, hash/snapshot permitted metadata, normalize/detect drift | Bounded/reversible job |
| 1 – candidate | Match exact allowlisted identities and prepare candidate/diff | Reviewer before Hermes publication |
| 2 – insight | Draft transcript-backed claims with citations/evidence offsets | Subject-matter reviewer; no automatic claim publication |
| 3 – public publication | Build public projection from approved, signed Hermes version | Publisher approval; dual approval for safety/legal/speaker-attributed claims |
| Emergency | Quarantine/revoke on signature failure, identity break, malware signal, or policy failure | Notify reviewer; restoration requires review |

### Security acceptance criteria

- No production client bundle, HTML, sourcemap, Git history, log, URL, or telemetry event contains a YouTube API key, OAuth access/refresh token, signing key, or administrative credential. CI scans source and built artifacts.
- Public API serves only documented read endpoints. Mutation, review, job, backup, and metrics endpoints are unreachable publicly.
- Public API has TLS, exact CORS allowlist, secure headers/CSP suitable for YouTube embeds, request/payload limits, rate limits, caching, schema validation, and generic errors.
- Mac Mini has FileVault, current supported macOS security updates, non-admin service account, default-deny firewall, no public SSH/Screen Sharing/remote-management, MFA-backed private remote administration, and host monitoring.
- Every published record traces to immutable source identity, retrieval time, content/evidence hash, extraction version, reviewer identity/time, Hermes version, and projection signature.
- Missing/revoked/mismatched source, failed schema/signature, or absent reviewer decision blocks publication and preserves prior approved projection.
- API credentials are restricted to intended production use, rotatable/revocable, and sent in headers—not URLs.
- Telemetry uses an allowlisted/redacted schema; raw transcripts, prompts, auth data, cookies, IPs, and reviewer notes are excluded by default.
- CI gates include type/test/security, secret and dependency scans, provenance/schema tests, and a negative test that UI rejects unsigned/unapproved records.
- Backups are encrypted, stored off the Mac Mini, retained per approved schedule, and proven restorable quarterly.

### Implementation phases

1. Decide the API/tunnel provider, IdP, database/evidence store, signing approach, privacy retention, and content/licensing policy.
2. Harden Mac Mini; establish service/admin identities, private remote access, secret handling, encrypted off-host backups, central logs/alerts.
3. Implement Hermes integrity plane: candidate/review/publish state machine, immutable evidence, hashes/signatures, roles, audit, and rollback.
4. Implement read-only delivery API with cacheable public projection plus strict CORS/headers/rate limits; keep control plane private.
5. Migrate scripts into a queued idempotent worker with allowlists, quota handling, validation, quarantine, and review routing.
6. Add CI gates, red-team tests, dashboards/alerts, incident and recovery exercises, then start Tier 0–1 automation only.

## Assumptions

- Public gallery may remain anonymous; only review/publish operations need authentication.
- The Mac Mini is not a production public edge and sits behind a managed tunnel/reverse proxy, not direct port exposure.
- Hermes offers versioned append-only records and a narrow authenticated mutation interface.
- Intended YouTube use is public discovery/metadata verification. Downloading/retaining/republishing transcripts/excerpts requires separate terms/licensing review.
- This is a security architecture handoff, not legal advice; Product/Legal must establish privacy, copyright, and cross-border requirements.

## Risks and caveats

- **Release blocker:** Browser-to-YouTube Data API with credentials, or an API key in a `VITE_*` variable, exposes it to every visitor and is unacceptable.
- **Release blocker:** Direct internet exposure of Mac Mini management, scheduler, database, Hermes write API, or reviewer route is unacceptable.
- High: semantically plausible but wrong source content can corrupt provenance; preserve the current reachability-is-not-identity fail-closed rule.
- High: an LLM can create unsupported claims or follow embedded instructions unless output remains a reviewed candidate with evidence references.
- Medium: `/analytics` is acceptable only while local/tab-memory; remove from production navigation or protect it before adding server telemetry.
- Medium: Lovable/dataLayer reporting has no field-level privacy contract. Adding user inputs/transcripts without redaction creates a privacy/IP surface.
- Medium: test, typecheck, and audit were not run in this review because `bun` is unavailable in the reviewer shell; no current build/dependency pass claim is made.
- Confidence: high for boundary/control design; medium for deployment-specific controls because API, host, IdP, and compliance jurisdiction are not selected.

## Dependencies

- Solution Architecture selects tunnel/reverse proxy, IdP, database/evidence store, signing key design, state machine, and topology.
- Full-stack Development implements typed public read API, private review APIs, validation, quarantine, hashes/signatures, and telemetry redaction.
- QA builds negative tests for credential leakage, unauthenticated mutation, CORS, rate limits, schema/signature failure, prompt injection, stale rollback, and review-gate bypass.
- Delivery Operations hardens/monitors host, deploys identities/secrets, configures tunnel/firewall/backup/alerts, and produces recovery evidence.
- Data defines canonical source/evidence schema, lineage, retention/deletion, and approved projection fields.
- Delivery Manager tracks release blockers, treatment owners, recurring access/restore/rotation review, and acceptance evidence.
- Product/Legal decides audience, transcript rights, privacy/retention, jurisdictions, and incident-notification obligations.

## Validation

Read-only inspection of server wrapper, Vite configuration, scripts/dependencies, source scripts, verified catalog, rejected-source audit, gallery labels, analytics/error reporting, ignore rules, and repo status. Confirmed no backend/auth/secret-management/host configuration and no `.env*` files. Attempted `bun test`, `bun run typecheck`, and `bun audit`, but `bun` was unavailable. No assertion is made that build or dependency checks passed. Reviewed Google/YouTube auth requirements and macOS Keychain/Secure Enclave guidance. Confidence: high for control design; medium for deployment specifics.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
|---|---|---|---|---|---|
| Public API edge | Direct Mac Mini exposure; managed tunnel/reverse proxy | Managed tunnel/reverse proxy, no inbound host ports | High | Host takeover, DDoS, exposed admin/database | Solution Architecture / DevOps |
| YouTube access model | Public API key; OAuth; unauthenticated scrape | Restricted server-side API key for public metadata; OAuth only for a specific private/user feature | High | Credential theft, quota abuse, unnecessary account access | Architecture / Developer |
| Transcript retention/reuse | Full transcript; minimal excerpts/hashes; none | Minimal metadata, cited offsets, hashes, approved excerpts until Legal confirms rights | Medium | Copyright/terms/privacy exposure | Product / Legal |
| Reviewer identity/publishing | Shared account; SSO/MFA RBAC; dual approval | SSO/MFA, separate reviewer/publisher, dual approval for attributed/high-impact claims | High | Unauthorized/unsupported public claims | Product / Delivery Manager |
| Operational log retention | Indefinite/raw; bounded/redacted | Redacted schema; 30–90 day detail, longer aggregate audit subject to Legal | Medium | PII/IP retention or inadequate incident evidence | Legal / Data / DevOps |
| Availability/recovery target | Best effort; defined RPO/RTO | Define tier pre-launch; baseline RPO 24h/RTO 4h with restore test | Medium | Outage/unrecoverable evidence | Product / DevOps |
