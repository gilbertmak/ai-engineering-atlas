# Atlas requirements and eval contract

This file is the review contract for changes that touch the public catalog, insight data, modal or Lovable integration. The machine-readable eval manifest in `evals/manifest.json` and the executable checks in `tests/evals.test.ts` are the source of release gates. The catalog baseline in `evals/catalog-baseline.json` is deliberately versioned so a merge cannot silently remove a video.

## Requirements

| Requirement                               | Rule                                                                                                                                                                                             | Release impact |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `ATLAS-CAT-001` Catalog completeness      | Every baseline video ID, code and YouTube ID must remain present and unique. Intentional additions, removals or corrections update the baseline in the same reviewed change.                     | Blocker        |
| `ATLAS-CAT-002` Source identity           | Each record has a valid YouTube ID, source title, channel, track, publication date and positive duration. Source links are derived from the catalog ID.                                          | Blocker        |
| `ATLAS-INS-001` Insight completeness      | Every catalog record resolves to a video-specific insight or an explicit, tested fallback. A restored video cannot silently show another video’s insight.                                        | Blocker        |
| `ATLAS-INS-002` Insight provenance        | Transcript-backed insights carry a reviewed timestamp and review date. Editorial track synthesis must not be labelled as transcript-backed.                                                      | Blocker        |
| `ATLAS-UI-001` Modal contract             | The modal retains category, clock/time, 75vh sizing, Insight, Why it matters, Use it when, Caveat and source-link behaviour. Removed labels and illustrative-example sections must not reappear. | Blocker        |
| `ATLAS-ARCH-001` Integration preservation | Catalog changes must preserve the Lovable MCP discovery/list/invoke routes, OAuth routes and Supabase integration boundaries.                                                                    | Blocker        |
| `ATLAS-SEC-001` Private-data boundary     | Local transcript evidence, projection snapshots, discovery queues, credentials and private reviewer material are ignored and absent from tracked files.                                          | Blocker        |
| `ATLAS-REL-001` Deterministic behaviour   | Catalog ordering, six-track vocabulary and baseline comparisons are deterministic and covered without live YouTube calls.                                                                        | Blocker        |
| `ATLAS-EVID-001` Revision-bound evidence  | CI records the exact revision and runs the eval validator, typecheck, tests and production build. A manifest declaration alone is not a passing result.                                          | Blocker        |

## Change protocol

When adding or removing a video, update the source catalog, `evals/catalog-baseline.json`, insight coverage and the relevant test evidence in one pull request. The PR description must state whether the change is an intentional catalog revision or a regression repair.

When changing the modal or integration architecture, update the requirement row, the executable assertion and the PR validation output. Do not resolve a merge conflict by taking a whole file from one branch without checking catalog count, baseline IDs, insight coverage and integration paths.

## Release gate

All blocker evals must execute and pass on the candidate revision. Missing Bun evidence, failed build/typecheck, baseline drift, missing insight coverage, private-data exposure or MCP/OAuth/Supabase route loss is a no-go. Manual browser visual/accessibility evidence remains required for substantial UI changes even when deterministic checks pass.
