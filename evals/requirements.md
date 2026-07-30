# Atlas requirements and eval contract

This file is the review contract for changes that touch the public catalog, insight data, modal or Lovable integration. The machine-readable eval manifest in `evals/manifest.json` and the executable checks in `tests/evals.test.ts` are the source of release gates. The catalog baseline in `evals/catalog-baseline.json` is deliberately versioned so a merge cannot silently remove a video.

## Requirements

| Requirement                               | Rule                                                                                                                                                                                             | Release impact |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `ATLAS-CAT-001` Catalog completeness      | The public Atlas retains all 984 baseline records with unique IDs, codes and YouTube IDs. Intentional additions, removals or corrections update the baseline in the same reviewed change.       | Blocker        |
| `ATLAS-CAT-002` Source identity           | Each record has a valid YouTube ID, source title, channel, track, publication date and positive duration. Source links are derived from the catalog ID.                                          | Blocker        |
| `ATLAS-INS-001` Insight completeness      | Exactly 348 records resolve to their reviewed video-specific mappings: 344 transcript-backed and four source-synthesis. The other 636 records explicitly remain unmapped metadata.              | Blocker        |
| `ATLAS-INS-002` Insight provenance        | Transcript-backed insights carry a reviewed timestamp and review date. Discovery `contentStatus` is separate from the explicit `insightReviewStatus` used to publish an approved mapping.       | Blocker        |
| `ATLAS-UI-001` Gallery and modal contract | The gallery initially renders 12 records, loads subsequent 12-record pages without drops or duplicates and resets on filtering. The modal retains category, clock/time, 75vh sizing, Insight, Why it matters, Use it when, Caveat and source-link behaviour. | Blocker        |
| `ATLAS-ARCH-001` Integration preservation | Catalog changes must preserve the Lovable MCP discovery/list/invoke routes, OAuth routes and Supabase integration boundaries.                                                                    | Blocker        |
| `ATLAS-SEC-001` Private-data boundary     | Local transcript evidence, projection snapshots, discovery queues, credentials and private reviewer material are ignored and absent from tracked files.                                          | Blocker        |
| `ATLAS-REL-001` Deterministic behaviour   | Catalog ordering, six-track vocabulary and baseline comparisons are deterministic and covered without live YouTube calls.                                                                        | Blocker        |
| `ATLAS-PERF-001` Initial loading boundary | Long-form talk insights are excluded from the initial gallery route and loaded only after a reviewed modal opens. Infinite-scroll pagination remains 12 records per increment.                    | Blocker        |
| `ATLAS-EVID-001` Revision-bound evidence  | CI records the exact revision and runs the eval validator, typecheck, tests and production build. A manifest declaration alone is not a passing result.                                          | Blocker        |

## Change protocol

When adding or removing a video, update the public-safe catalog, `evals/catalog-baseline.json`, `evals/insight-baseline.json`, insight coverage and the relevant test evidence in one pull request. The PR description must state whether the change is an intentional catalog revision or a regression repair.

When changing the modal or integration architecture, update the requirement row, the executable assertion and the PR validation output. Do not resolve a merge conflict by taking a whole file from one branch without checking catalog count, baseline IDs, insight coverage and integration paths.

## Release gate

All blocker evals must execute and pass on the candidate revision. Missing Bun evidence, failed build/typecheck, baseline drift, missing insight coverage, private-data exposure or MCP/OAuth/Supabase route loss is a no-go. Manual browser visual/accessibility evidence remains required for substantial UI changes even when deterministic checks pass.
