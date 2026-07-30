# Full-stack developer handoff — YouTube API discovery

## Task summary

Replaced the source-discovery script's YouTube HTML search and oEmbed calls with an API-first, server/CLI-only YouTube Data API v3 uploads-feed crawler. The implementation is intentionally a discovery candidate workflow: it does not modify the published fixture catalog or bypass source identity review.

## Key facts

- The browser receives no YouTube credential. `YOUTUBE_DATA_API_KEY` is read only by the Bun CLI and the code rejects an empty key; no `VITE_` variable is used.
- Default discovery resolves the official `@aiDotEngineer` uploads playlist once. Operators can instead configure `YOUTUBE_DISCOVERY_UPLOADS_PLAYLIST_ID`, `YOUTUBE_DISCOVERY_CHANNEL_ID`, or `YOUTUBE_DISCOVERY_CHANNEL_HANDLE`.
- The crawler makes no `search.list` request. It paginates `playlistItems.list` at 50 items/page and enriches candidate metadata with `videos.list` batches of up to 50 IDs.
- `data/youtube-discovery-state.json` is local and Git-ignored. It stores the resolved uploads playlist, known IDs, and the newest observed upload ID. Later runs skip channel resolution, and a normal run stops at the high-water ID; `--full` forces a full playlist reconciliation. Current catalog fixture IDs are treated as known on every run.

## Outputs

- `scripts/youtube-discovery.ts`: testable Data API client, pacing, bounded transient retry, deterministic ordered candidates, provenance, atomic state read/write.
- `scripts/discover-video-sources.ts`: CLI adapter with `--full`, server environment configuration, and explicit API/fallback provenance.
- `tests/youtube-discovery.test.ts`: initial mocked coverage for channel resolution, page walking, metadata batching, no search endpoint, incremental stop, and missing key.
- `docs/source-discovery.md`: environment, quota, incremental-state, and operational-boundary documentation.
- `package.json`, `.gitignore`: `discover:sources` command and ignored state file.

## Assumptions

- `@aiDotEngineer` remains the approved default source; operators will use an explicit approved channel or uploads playlist for any other source.
- Playlist order is newest-first, as supplied by YouTube, so the first ID is a valid high-water marker.
- Candidate identity and publication approval remain a separate content/Hermes review responsibility.

## Risks and caveats

- The default 250 ms request pacing and bounded retry reduce burst pressure but do not replace Google Cloud quota monitoring or worker-level scheduling.
- An upload deleted or made inaccessible between playlist enumeration and metadata enrichment is omitted and requires review on a later full reconciliation.
- The stored high-water ID strategy assumes the uploads playlist preserves newest-first ordering. Run `--full` for periodic drift/reconciliation.
- Direct HTML/oEmbed discovery is deliberately not an automatic fallback (`fallback: none`), preventing silent source-method drift but requiring operator intervention during Data API outage/quota exhaustion.

## Dependencies

- Product/Operations: restricted server-side YouTube Data API key and approved source identifier(s).
- QA: expand mocked boundary coverage for exact 50-ID chunking, per-request pacing, retry/non-retry behavior, full versus incremental state, and atomic state persistence.
- Delivery Operations: supply the secret at worker runtime, schedule normal and periodic full runs, observe quota/error rate, and retain only intended state/audit outputs.
- Content/Hermes owners: review candidates before any catalog projection is changed.

## Validation

- Passed Prettier and ESLint for the changed scripts and discovery test, plus strict TypeScript compilation of both script entry points using installed project binaries.
- Passed `vite build` (client, SSR, and Nitro/Cloudflare output). The build emitted existing Vite/Nitro advisory warnings only, including `vite-tsconfig-paths` deprecation and ignored `inlineDynamicImports`.
- Root validation through `npx --yes bun` passed 12 tests / 159 assertions, TypeScript, production build, and lint with 0 errors plus 6 pre-existing UI Fast Refresh warnings.

## Decision points

| Decision Point             | Options                                                                     | Recommendation                                                                                       | Confidence | Impact If Wrong                                        | Owner Needed                 |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ | ---------------------------- |
| Approved source scope      | Default handle only; explicit channel ID; explicit uploads playlist         | Configure an approved uploads playlist in production, retain default handle for operator convenience | High       | Wrong uploads enter candidate queue                    | Product/content + Operations |
| Incremental reconciliation | High-water only; full crawl every run; high-water plus scheduled full crawl | High-water routine run plus scheduled `--full` reconciliation                                        | High       | Reordered/deleted uploads can remain undetected longer | Operations + QA              |
| Data API outage behavior   | Automatic oEmbed/HTML fallback; fail closed/manual retry                    | Fail closed with explicit `fallback: none`                                                           | High       | Automatic fallback can bypass API/terms/quota controls | Security + Product           |
