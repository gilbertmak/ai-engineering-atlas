# Quality Assurance Handoff: YouTube API-first source discovery

## Task summary

Reviewed and extended fixture-led QA coverage for the API-first YouTube discovery change. The reviewed implementation uses the official YouTube Data API v3, resolves or accepts the approved uploads playlist, page-walks `playlistItems.list`, batches `videos.list` at 50 IDs, supports high-water incremental and `--full` reconciliation modes, retries bounded transient failures, paces requests, and keeps credentials server-side.

## Key facts

- Discovery deliberately makes no `search.list`, HTML-search, oEmbed, or watch-page fallback calls. It emits `source: youtube-data-api-v3` and `fallback: none`.
- Normal runs use persisted high-water state and stop at the previous newest upload; `--full` traverses the complete approved uploads playlist.
- The CLI combines persisted known IDs with fixture catalog IDs, and persists the union of pre-existing and newly observed IDs.
- API calls use a minimum 250 ms separation by default. Retryable responses are `429`, `500`, `502`, `503`, and `504`; permanent API errors fail closed.
- `YOUTUBE_DATA_API_KEY` is required only by the CLI/worker path. The reviewed source, docs, and static scan found no `VITE_` YouTube credential reference. The state file and `.dev.vars` are ignored.

## Outputs

- Added QA-owned fixture coverage in `tests/youtube-discovery.test.ts` for:
  - channel resolution, all-page uploads enumeration, and absence of `search.list`;
  - globally deduplicated enumeration and known/new classification;
  - 50-ID `videos.list` boundary batching;
  - incremental high-water stopping and `--full` reconciliation beyond high-water;
  - every-call pacing, `429` exponential retry, recoverable network retry, and non-retryable `400` failure;
  - missing configuration; and
  - persisted state deduplication and retention.
- Created this traceable QA handoff at `subagent-decisions/quality-assurance-handoff.md`.

## Assumptions

- `@aiDotEngineer` (or a deployment-supplied approved channel/playlist override) is the intended authoritative source.
- Google Cloud key restriction, quota allocation, and production worker secret injection are operated outside this repository.
- The source discovery command remains a trusted CLI/worker operation and is not bundled into the browser application.

## Risks and caveats

- **Release-evidence gap:** QA could not execute the repository Bun suite locally because `bun` is unavailable on the QA PATH. `npm test` therefore fails with `bun: command not found`; an `npx --yes bun test` attempt did not produce reliable completion evidence and was interrupted. The root orchestrator reports an independent result of 12 passing tests / 159 assertions, but QA did not independently reproduce that Bun output. Retain the revision-bound CI or root evidence with the release record.
- No live call was made to YouTube or Google Cloud, so valid credentials, channel-handle resolution, quota restrictions, and real upstream pagination remain integration checks.
- The 250 ms throttle is a client-side request-spacing control, not a guarantee against project-level quota exhaustion. Operators still need quota alerting and a documented failure response.
- The six lint warnings are pre-existing Fast Refresh warnings in UI components, with zero lint errors; they do not originate in this workstream.

## Dependencies

- Delivery Operations: provision/restrict `YOUTUBE_DATA_API_KEY`, provide worker/CLI runtime, capture CI evidence, and monitor API quota/failure rates.
- Product Owner: approve candidates before they alter the public catalog; discovery is intentionally non-mutating.
- Security: verify the deployed environment never exposes worker variables, logs, source maps, or state artifacts containing secrets.

## Validation

| Check | Result | Evidence / gap |
| --- | --- | --- |
| Fixture test design | Covered | `tests/youtube-discovery.test.ts` covers pagination, batching, dedupe, state, retry/backoff, throttling, config, full and incremental modes. |
| Bun test suite | Not QA-executed | `bun` unavailable locally; see release-evidence gap. Root reports 12 tests / 159 assertions passing; QA did not independently reproduce. |
| Typecheck | Pass | `npm run typecheck` completed with exit 0 after QA test changes. |
| Lint | Pass with existing warnings | `npm run lint` completed with exit 0, 0 errors, 6 pre-existing Fast Refresh warnings. |
| Production build | Pass | `npm run build` completed with exit 0 after the implementation landed. |
| Secret/static inspection | Pass, static only | No `VITE_` YouTube/API credential use found; discovery runs outside `src/`. No live deployment inspection performed. |

## Quality recommendation

**Conditional go for merge; no-go for production source-job enablement without revision-bound Bun/CI evidence and a restricted production key.** Confidence: medium-high for unit-level behavior, medium for operational readiness. Functional regression risk is low because the browser catalog is not mutated by discovery; integration and operational risk remains medium until a real restricted-key run confirms the configured channel, quota, and state path.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Test evidence before production enablement | Accept root/CI evidence; rerun the Bun suite in a provisioned environment; waive | Require revision-bound CI/Bun output before enabling scheduled discovery | High | Undetected regression in paging, retry, or state logic | Delivery Manager / Delivery Operations |
| Authoritative uploads source | Default `@aiDotEngineer`; pin approved uploads playlist ID; use another approved channel override | Pin the verified uploads playlist ID in the protected worker configuration after first successful resolution | Medium | Wrong channel or incomplete catalog candidates | Product Owner + Delivery Operations |
| Production cadence and quota protection | Manual only; scheduled with alerts; scheduled without alerts | Start manual, then schedule only with quota/error monitoring and a runbook | High | Quota exhaustion or stale discovery without notice | Delivery Operations |
