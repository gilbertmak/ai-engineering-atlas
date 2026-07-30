# Insight Atlas migration-ready delivery plan

**Status:** Implementation complete; live scheduler release blocked pending host evidence (28 July 2026)  
**Objective:** Make the existing fixture-backed Insight Atlas portable to a Mac Mini, with a versioned reviewed-catalog API, safe daily discovery integration, and an operating model that cannot enable live discovery before explicit configuration and a restricted YouTube API key.

## Scope and non-negotiable controls

- The public catalog is a persisted, versioned projection. Discovery outputs candidates only; a separate controlled publisher may add exact metadata from the approved uploads playlist, but it must label those records as metadata-only/unreviewed and must never create or imply an insight, claim, track attribution, or Hermes approval.
- Browser clients receive catalog data only. `YOUTUBE_DATA_API_KEY` is worker-only and no `VITE_*` secret is permitted.
- Schedule activation remains disabled until an operator explicitly enables it. A separately authorized one-off manual full crawl is recorded below; it did not enable scheduling or publication.
- Static fixtures and a persisted last-known-good reviewed projection are valid fallbacks, so the gallery remains available during API, worker, or migration failures.

## Milestones

| Milestone | Owner | Target | Exit criteria | Status |
| --- | --- | --- | --- | --- |
| Contract and catalog projection | Full-stack | 28 Jul | Versioned reviewed catalog contract, validation, static/LKG fallback, deterministic tests | Complete |
| Discovery-to-projection worker boundary | Full-stack | 28 Jul | Worker stores candidates/audit and may publish exact source metadata only to a versioned projection; insights remain review-gated; explicit disabled configuration | Complete |
| Mac Mini operations pack | Delivery Operations | 28 Jul | Container/launchd assets, secrets, backup/restore, health/runbook, safe CI gate | Complete, host proof pending |
| Integration validation and release gate | Project Manager | 28 Jul | Handoffs reconciled; typecheck, test, lint, build, fixture runtime proof reviewed | Complete locally; Mac Mini host evidence pending |
| Operator enablement | Operations + content owner | After delivery | Restricted-key manual `--full`, candidate review, confirmed recovery, then explicit schedule enablement | Manual crawl and temporary recovery drill complete; approval and durable transfer package pending |

## Dependency map and critical path

`approved static catalog -> versioned projection/API -> frontend LKG fallback -> deterministic validation -> Mac Mini packaging/runbook -> restricted-key manual full crawl -> metadata publication proof -> Hermes/content review for insights -> explicit scheduler enablement`

The restricted-key manual crawl and content approval are intentionally outside this implementation; they are release gates for live daily discovery, not blockers for migration-ready code.

## RAID log

| Type | Description | Owner | Impact | Due / trigger | Mitigation and escalation | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Risk | Metadata-only records could be presented as reviewed insights | Full-stack / content owner | High provenance failure | Before live enablement | Enforce content status and nullable/unclassified insight fields; test API/UI rendering | Mitigating |
| Risk | Key leakage through browser build, logs, image, or launchd file | Delivery Operations | High security and quota exposure | Before deployment | Worker-only env, permissions, secret scan, non-secret health output | Mitigated in code; requires host review |
| Assumption | Current fixture catalog is the approved last-known-good data set | Content owner | Medium | Before catalog refresh | Preserve fixture fallback and require explicit review for every change | Open |
| Dependency | Content approval of the resolved AI Engineer source (`UCLKPca3kwwd-B59HNr-_lvA`, `@aidotengineer`, uploads playlist `UULKPca3kwwd-B59HNr-_lvA`) and metadata publication scope | Product/content + Operations | Live schedule cannot start | Before scheduler enablement | Approve source identity and review candidates before metadata-only automation | Open |
| Issue | Temporary one-day GPG key/archive proves recovery workflow but is not a durable Mac Mini transfer package | Security + Operations | Final transfer recovery is not yet established | Before Mac Mini transfer | Encrypt final transfer material to a durable Mac Mini-controlled recipient with custody/rotation | Open |
| Fact | One manual full crawl succeeded: AI Engineer channel ID `UCLKPca3kwwd-B59HNr-_lvA`, handle `@aidotengineer`, uploads playlist `UULKPca3kwwd-B59HNr-_lvA`; 980 candidates (970 new, 10 known), API-first/no fallback, `review_required`, and `scheduled: false` | Delivery Operations | Confirms current source resolution, quota reachability, pacing, and atomic local persistence; does not authorize publication | 28 Jul | Retain activation handoff as evidence; all schedule/publication gates stay off | Complete |
| Fact | Local metadata-only projection validation passed: 984 records (970 metadata-only, 14 reviewed), latest-first; API returned all records across 20 pages | Full-stack + Delivery Operations | Confirms persisted projection/read path; does not authorize automatic publishing | 28 Jul | Preserve as local evidence; keep auto-publish disabled | Complete |
| Fact | Temporary encrypted backup/restore drill passed: state, candidates, and projection restored byte-identically; projection content hash preserved | Delivery Operations | Proves workflow mechanics, not durable transfer readiness | 28 Jul | Re-run with durable Mac Mini-controlled recipient before transfer | Complete with caveat |
| Decision | Discovery outage behavior | Project Manager | Medium | Set in implementation | Fail closed, serve reviewed last-known-good/static catalog | Decided |
| Decision | Scheduler activation | Operations + product/content | High operational risk | After manual full crawl | Disabled by default; require explicit enable flag and recorded approval | Pending stakeholder action |

## Governance and escalation

- **Daily during implementation:** PM reconciles engineering and operations handoffs, contract compatibility, and validations.
- **Before deployment:** product/content owner confirms the trusted catalog and approved uploads playlist; Operations confirms restricted secret injection and backup location.
- **Before scheduler enablement:** Operations runs a restricted-key `--full` job, verifies state/audit/health and recovery, and content owner reviews candidates. PM records revision-bound evidence.
- **Escalate immediately:** any exposure of a key, unexpected catalog publication, backup loss, or failed recovery test. Disable the scheduler and restore the reviewed last-known-good projection.

## Initial release readiness

**Implemented and reviewed:** persisted versioned catalog API, schema-validated API client with static LKG fallback, exact-match metadata-only publication, unclassified UI state, Docker/Compose, launchd/Keychain scheduler, backup/restore, CI/release gates, and runbooks.  
**Validation:** 19 Bun tests with 192 assertions, `npm run typecheck`, `npm run lint` (0 errors; 6 pre-existing warnings), `NITRO_PRESET=node-server npm run build`, operational gate, plist lint, and local production `/healthz`, `/readyz`, and paginated `/v1/catalog` API checks passed. The scheduler remains unable to make a network call while configuration is absent, as designed.  
**Live activation evidence:** one authorized manual `--full` crawl completed on 28 July. It resolved AI Engineer channel ID `UCLKPca3kwwd-B59HNr-_lvA` / `@aidotengineer` to uploads playlist `UULKPca3kwwd-B59HNr-_lvA` and atomically wrote a private `review_required` handoff with 980 candidates (970 new, 10 known). A local 984-record projection (970 metadata-only, 14 reviewed) was latest-first and paged by the API over 20 responses. Automatic publication and scheduling remain disabled in the ignored mode-600 `.env`; no Hermes action ran.  
**Recovery evidence:** an encrypted temporary one-day GPG drill restored state, candidates, and projection byte-identically with the projection content hash preserved. It proves the workflow only; the temporary archive/key is not the Mac Mini transfer package.  
**Live daily discovery:** no-go until source/candidate approval, Mac Mini container health proof, and a final encrypted transfer package using a durable Mac Mini-controlled recipient are complete.  
**Confidence:** high on the controlled boundary, medium on live integration until the first restricted-key run.
