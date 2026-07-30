# Project Manager handoff: Atlas requirements and eval update

## Task summary

Convert the catalog-loss regression into a deterministic, binary-gated release contract so future changes cannot silently remove videos, insights or the Lovable integration architecture.

## Key facts

- The current public catalog baseline is 15 records, including DeepSWE (`Yk87oUPVaxU`).
- The current insight set contains 11 transcript-backed records and 4 source-synthesis records.
- The prior merge dropped one catalog record and the video-specific insight map while preserving MCP/OAuth/Supabase routes.
- Bun is the repository test runtime but is unavailable in the current local environment.
- `.env` was tracked and is being removed from the Git index while the local file remains untouched.

## Outputs

- `evals/requirements.md`: requirement IDs and release rules.
- `evals/manifest.json`: machine-readable eval definitions, ownership, privacy classification, evidence paths and manual gates.
- `evals/catalog-baseline.json`: independent 15-record catalog fixture with source identity, dates and durations.
- `tests/evals.test.ts`: Bun coverage for catalog, insights, modal contract, architecture, private-data boundary and deterministic ordering.
- `scripts/validate-evals.ts`: revision-, dirty-worktree-, fixture-digest- and lockfile-bound JSON/Markdown report writer.
- `.github/workflows/ci.yml`: blocking eval, typecheck, Bun test and production-build workflow with retained eval artifact.

## Assumptions

- The checked-in 15-record catalog is the approved public baseline for this release. The private 984-record projection is not a public fixture.
- Browser visual/accessibility and live OAuth/MCP invocation require a disposable deployed environment and remain manual pending gates.
- No raw transcripts, reviewer notes or private candidate queues belong in the repository or eval artifacts.

## Risks and caveats

- Static architecture assertions prove file and audit-boundary preservation, not successful OAuth or Supabase runtime authorization.
- The current static `transcript_backed` model has timestamp/review fields but not a full evidence digest/rights object. A future provenance slice must add those fields before expanding transcript publication.
- Repository-wide lint currently has pre-existing formatting failures in Lovable-generated files; CI intentionally gates the new evals, typecheck, tests and build while that separate lint cleanup is pending.

## Dependencies

- Bun 1.2.21 in CI for executable eval/test evidence.
- Disposable Supabase/Lovable environment for `EVAL-OAUTH-001`.
- QA/Product Design evidence for responsive modal and keyboard/accessibility checks.

## Validation

- `npm run typecheck`: passed locally.
- `npm run build`: passed locally.
- Scoped ESLint for new eval/test files: passed locally.
- `npm run evals:validate` and `npm test`: blocked locally because Bun is unavailable; CI is the required revision-bound execution environment.

## Decision points

| Decision point | Options | Recommendation | Confidence | Impact if wrong | Owner needed |
| --- | --- | --- | --- | --- | --- |
| Transcript-backed meaning | Keep static timestamp/review fields; require evidence digest/rights before publication | Keep current slice bounded and add full evidence contract before new transcript expansion | High | Unsupported claims or rights breach | Content + Legal |
| OAuth gate | Manual deployed check; disposable integration environment | Keep manual pending until disposable environment exists | High | MCP route regression reaches production | Engineering + Security |
| Catalog change process | Edit source only; edit source plus independent baseline | Require source, baseline, insight coverage and eval evidence in one PR | High | Silent video loss during merge | Product + QA |
