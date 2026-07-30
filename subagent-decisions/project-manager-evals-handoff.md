# Project Manager handoff: complete Atlas restoration

## Task summary

Restore the pre-merge Atlas catalog, infinite-scroll gallery and modal while preserving the newer Lovable TanStack, MCP, OAuth and Supabase architecture. Convert the loss into a deterministic release gate.

## Key facts

- The complete public-safe catalog contains 984 unique video records.
- The reviewed insight map contains 348 mappings: 344 `transcript_backed` and four `source_synthesis`.
- 347 mapped insights contain a source timestamp.
- The remaining 636 catalog records are explicitly `unmapped` and show a metadata-only state.
- The gallery renders 12 cards initially and adds 12 per observer or accessible “Load more” action.
- The canonical modal is the pre-merge contract: category, clock and duration, 75vh desktop height, embedded player, Insight, Why it matters, Use it when, Caveat and YouTube source action.

## Outputs

- `src/data/atlas-public-catalog.json`: reviewed allowlisted public metadata only.
- `src/data/talk-insights.ts`: restored 348-entry insight map.
- `src/lib/atlas-catalog.ts` and `src/lib/atlas-catalog-client.ts`: shared bundled catalog boundary compatible with Lovable deployment.
- `src/routes/index.tsx`: restored infinite scrolling, multi-theme filters and canonical modal.
- MCP search and summary tools now consume the same 984-record catalog.
- Catalog and insight baseline fixtures plus executable evals enforce 984 / 348 / 344 / 4 / 636 counts.

## Assumptions

- The 984-record reviewed projection is the intended complete Atlas.
- The user’s “344 mapped entries” refers to the exact transcript-backed subset; four additional mappings are source syntheses.
- Approved insight prose and timestamps are publishable while raw transcripts, evidence rows and reviewer metadata remain private.

## Risks and caveats

- The bundled catalog and insight map increase the main route payload. This is acceptable for restoration but should be code-split in a later performance change.
- Live OAuth and MCP authorization still require deployed-environment evidence.
- The 15-record `VIDEOS` array remains a verified seed used by legacy source tests and alias resolution. It is not the public gallery source or completeness baseline.

## Dependencies

- Bun 1.2.21 in CI for the complete test suite.
- Lovable/Supabase deployment environment for live OAuth evidence.
- Browser accessibility review for mobile layout and full keyboard behavior.

## Validation

- `npm run evals:validate`: passed locally.
- `npm run typecheck`: passed locally.
- `npm run build`: passed locally.
- Browser runtime: confirmed 12 / 984 initial results, “Load 12 more” advancing to 24 / 984 and the DeepSWE mapped modal with the canonical information hierarchy.
- The browser validation tab and local development server were closed after the check.

## Decision points

| Decision point | Options | Recommendation | Confidence | Impact if wrong | Owner needed |
| --- | --- | --- | --- | --- | --- |
| Catalog scope | Publish 984; restrict to 348 mapped records | Publish all 984 and distinguish mapped from unmapped | High | Videos silently disappear again | Product owner |
| Public catalog storage | Bundled safe snapshot; Supabase runtime table | Use bundled snapshot for restoration, migrate later if runtime editorial publishing is required | High | Lovable build depends on unavailable private files | Engineering |
| Insight publication state | Reuse discovery `contentStatus`; separate review state | Keep explicit `insightReviewStatus` | High | Approved mappings are hidden or unsupported mappings are shown | Content owner |
| Payload optimization | Optimize during restoration; follow-up code splitting | Preserve behavior first and optimize in a separate measured change | Medium | Larger initial JavaScript payload | Product + Engineering |
