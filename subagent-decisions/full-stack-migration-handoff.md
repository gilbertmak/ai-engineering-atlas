# Full-stack migration handoff — Atlas reviewed projection API

## Task summary

Implemented the migration-ready Atlas read path: a versioned, validated persisted catalog projection, public read-only API, client API consumption with deterministic bundled last-known-good fallback, and a gated daily discovery-to-metadata projection flow. Existing uncommitted discovery and Delivery Operations files were preserved.

## Key facts

- `GET /v1/catalog`, `/v1/catalog/manifest`, `/v1/videos/{id}`, `/healthz`, and `/readyz` are served through the existing server entry. There are no public candidate, review, Hermes, mutation, or admin endpoints.
- API reads `ATLAS_CATALOG_PROJECTION_PATH` (default `data/atlas-catalog-projection.json`) and validates every record and manifest. Missing or malformed persistence fails closed to the reviewed bundled last-known-good fixture.
- Current seed manifest is `reviewed_source_metadata_only` / `reviewed`. A projection that includes scheduled metadata-only additions truthfully becomes `mixed_approved_metadata` / `mixed`.
- Scheduled flow is compatible with Ops: `npm run discover:sources:scheduled` runs the existing candidate discovery command then the atomic projection publisher. It requires both `ATLAS_DISCOVERY_SCHEDULE_ENABLED=true` and `ATLAS_METADATA_AUTO_PUBLISH_ENABLED=true`.
- Auto-publication accepts only `new` candidates whose exact `channel` and `uploadsPlaylistId` equal protected `ATLAS_APPROVED_YOUTUBE_CHANNEL` and `ATLAS_APPROVED_UPLOADS_PLAYLIST_ID`. New records are `metadata_only`, `track: null`, and show “No reviewed insight yet”; they cannot receive track synthesis, transcript claims, speaker attribution, or Hermes content automatically.
- The browser may receive only `VITE_ATLAS_API_BASE_URL`; neither source nor artifacts reference a `VITE_` credential. `YOUTUBE_DATA_API_KEY` remains CLI/worker-only.

## Outputs

- `src/lib/atlas-catalog.ts`, `src/lib/atlas-api.ts`, `src/server/atlas-projection-store.ts`: schemas, immutable LKG seed, manifest/content-hash handling, persisted projection reader, and public API contract.
- `src/lib/atlas-catalog-client.ts`, `src/routes/index.tsx`, `src/data/videos.ts`: API-first gallery hydration with schema-validated LKG fallback and unclassified metadata-only UI state.
- `scripts/discovery-candidate-handoff.ts`, `scripts/publish-discovery-metadata.ts`, `scripts/discover-video-sources.ts`: private candidate audit handoff and gated atomic metadata publisher.
- `docs/catalog-api.md`, `docs/source-discovery.md`, `tests/atlas-catalog.test.ts`: API/operational contract and deterministic fixtures.

## Assumptions

- Delivery Operations provides the private daily launcher, filesystem persistence, secret injection, quota alerts, and the exact approved channel/playlist values.
- Hermes remains the authority for reviewable knowledge, evidence, insights, approvals, and retractions. This implementation only permits exact source metadata publication under the defined policy.
- The existing Cloudflare-oriented build is retained for compatibility. The persisted filesystem projection path is intended for the planned Mac Mini/Node runtime; on an edge runtime without filesystem support it intentionally falls back to LKG.

## Risks and caveats

- Metadata auto-publication is a scope decision: it updates links/titles/dates/durations only. Any change to allow insight, taxonomy, or attribution publication requires a Hermes contract and new review/eval evidence.
- The deterministic fingerprint is a version/integrity marker, not the signed immutable projection called for in the production architecture.
- `npm test` cannot run because `bun` is absent from PATH. `npx --yes bun test` returned no test output in this environment, so there is no trustworthy fresh full-suite result. CI or a provisioned Bun runtime must execute the complete suite before schedule enablement.

## Dependencies

- Delivery Operations: daily launcher, `ATLAS_*` flags/path/channel/playlist configuration, non-browser `YOUTUBE_DATA_API_KEY`, filesystem permissions, alerting, backups, and restart behavior.
- QA: run Bun suite and prove scheduled failure/rollback behavior in the target runtime.
- Hermes/content owner: define the durable review/publish/retraction adapter before any non-metadata insight is published.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck | Pass | `npm run typecheck` exit 0. |
| Lint | Pass with existing warnings | `npm run lint` exit 0; six existing Fast Refresh warnings, zero errors. |
| Production build | Pass | `npm run build` exit 0, including SSR/Nitro output. |
| Deterministic test coverage | Added, not locally executed | `tests/atlas-catalog.test.ts` covers schema validation, paging, ETag, no admin surface, approved/mismatched candidate policy, persisted projection read, and metadata-only API result. Bun runtime unavailable. |
| Live source / scheduler | Not run | No key, no live API calls, no schedule enablement. |

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Metadata auto-publication | Keep metadata-only gate; require manual publication; include insights | Keep exact approved metadata-only gate | High | Unsupported or misleading public claim | Product + Hermes owner |
| Runtime target for persisted projection | Mac Mini/Node filesystem; edge KV/object storage | Use Mac Mini filesystem for this migration phase; design a separate edge persistence adapter if retaining edge deployment | High | Daily catalog cannot update outside the intended runtime | Delivery Ops + Architecture |
| Scheduled enablement | Disabled; flags plus runbook/evidence | Keep disabled until Bun/CI evidence and a restricted-key manual run pass | High | Quota, source identity, or persistence failure | Delivery Ops + QA |
