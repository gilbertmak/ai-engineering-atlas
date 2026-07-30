# Quality Assurance Handoff: Atlas transcript enrichment and provenance slice

## Task summary

Prepared a deterministic, risk-based test and release-evidence plan for the next Atlas slice. Scope: transcript acquisition/provenance and the legal availability boundary; zero-to-many existing themes per video; transcript-backed evidence in the detail modal; the requested modal removals; uncoloured filter labels with accessible hero-motif icons; and loading, empty, unavailable, and error states.

No application code was changed. This handoff is written for the Full-stack implementation and Product Design handoff now in progress.

## Key facts

- The current public contract is deliberately metadata-only. `CatalogVideo` contains source metadata, one nullable `track`, and optional `contentStatus`; neither the persisted projection nor public API contains transcript, evidence, content availability, rights, review, or retraction fields.
- The current modal derives `Claim`, `Implication`, `When to use`, `Illustrative example`, and `Caveat` from a shared in-route `TRACK_SUMMARIES` map. `TALK_INSIGHTS` is empty. Therefore current text is an editorial track synthesis, not video-specific evidence.
- Current source policy is correctly fail-closed for discovery: candidates are private, scheduled publication can add only exact approved metadata, and those records are `metadata_only` and unclassified. The next slice must preserve this boundary: successful transcript acquisition alone is not approval to publish a transcript-derived claim.
- Existing deterministic coverage is API/catalog-centric (`tests/atlas-catalog.test.ts`, `tests/videos.test.ts`); it does not exercise modal rendering, filter interaction, accessibility, transcript data, legal availability, or visual states. The project currently has no browser/E2E runner declared.
- The local working tree contains other agents' uncommitted implementation changes. Preserve them. Current PM evidence records 19 Bun tests / 192 assertions and typecheck, lint, build, and local API checks, but the next slice requires fresh revision-bound execution evidence.

## Required testable content and provenance contract

### Publication model

Treat source acquisition, legal availability, extraction, review, publication, and retraction as distinct states. A public record must never make an evidence claim unless its published evidence object passes the complete contract below.

| Entity / field | Required rule | Public visibility | QA invariant |
| --- | --- | --- | --- |
| `video.id`, `youtubeId`, source title/channel/URL | Stable source identity; URL derived from/consistent with `youtubeId`; canonical video remains in approved catalog | Yes | Evidence cannot attach to a different video or unapproved source. |
| `themes: Track[]` | Array, unique closed-vocabulary values, deterministic presentation order; `[]` permitted | Yes | A video can have zero, one, or many themes. No theme is implied by transcript availability. |
| `transcript.status` | Closed enum: `not_requested`, `acquired`, `unavailable`, `restricted`, `failed`, `stale`, `superseded` | Summary only, no raw content | Unknown/failed/restricted is visibly not transcript-backed and does not become a generic success. |
| Transcript provenance | `sourceUrl`, `provider`, `sourceType`, retrieval time, language/locale, transcript version or source timestamp, content digest, acquisition-run ID | Summary, with safe source link | Missing/invalid provenance blocks evidence publication. Digest must identify exactly the reviewed transcript revision. |
| Legal availability | `availability` (`available`, `unavailable`, `restricted`, `unknown`), `availabilityCheckedAt`, `termsBasis`, `rightsBasis`, `redistributionAllowed`, `attributionRequired`, optional expiry/recheck time | Summary, not confidential notes | `unknown`, `restricted`, or `redistributionAllowed: false` blocks raw transcript display/export and any verbatim excerpt. It may not be silently represented as "no transcript". |
| Evidence item | Stable `evidenceId`, `videoId`, `claim`, `locator` (timestamp start/end mandatory for transcript evidence), evidence type, `transcriptDigest`, reviewer ID/version, approved/reviewed time, status (`approved`, `retracted`, `superseded`) | Only approved/current item | Every displayed transcript-backed claim maps to one current evidence item whose video, digest, locator, and review state agree. |
| Publication envelope | `projectionVersion`, generated time, record count, content hash, policy/schema version, LKG flag | Yes | Content fingerprint includes themes, availability state, evidence identifiers/statuses, locators, and transcript digest; mid-read changes fall back as today. |

### Boundary rules

1. Acquisition may retain raw transcript only in the approved private store. The browser/public catalog must receive neither raw transcript nor a retrievable private transcript URL.
2. A transcript-backed modal may show an approved paraphrase and provenance/locator. It must show a quotation only when the rights policy allows it and length/purpose policy passes. Do not construct citations from model output.
3. `restricted`, `unknown`, `failed`, `stale`, `superseded`, and `retracted` must remove/withhold transcript-backed claims, timestamps, excerpts, and export actions. They must retain a clear source-link fallback and non-differential user-safe explanation.
4. A theme is editorial taxonomy. It is not a claim of speaker endorsement, transcript availability, or legal permission. This is especially important for zero-theme records.
5. Transcript-derived publication requires a reviewer-approved record linked to immutable/retrievable internal evidence. It must not be produced by the existing metadata auto-publisher.

## Risk-based deterministic coverage

| Test ID | Requirement / risk | Deterministic scenario and assertions | Priority | Level / evidence |
| --- | --- | --- | --- | --- |
| TE-API-01 | Schema fail-closed | Parse valid records for zero/one/many themes and approved transcript evidence; reject duplicate/unknown themes, evidence/video mismatch, invalid YouTube ID/URL, missing digest/locator/reviewer, invalid date, and unrecognised enum. | P0 | Unit schema tests |
| TE-API-02 | No unsupported display claims | Attempt to publish `acquired` transcript with no legal basis, `unknown` availability, no approval, mismatched transcript digest, retracted/superseded evidence, or unsupported excerpt. Assert public API omits evidence and yields the specified unavailable/review-pending state. | P0 | Publisher/projection/API tests |
| TE-API-03 | Availability boundary | Fixture each availability/status combination: available+approved; unavailable; restricted; failed; stale; unknown; metadata-only. Assert response status/data are truthful, no raw transcript or private location appears, and source-link fallback is present where expected. | P0 | API contract / snapshot tests |
| TE-API-04 | Legal recheck | A legal/review expiry after `availabilityCheckedAt`/expiry must demote or omit evidence on regeneration. A new approval of the same transcript digest can restore it; a changed digest requires new review. | P0 | Publisher tests with fixed clock |
| TE-API-05 | Retraction | Retract one evidence item then regenerate: its claim/locator/action disappear, manifest fingerprint changes, LKG does not retain stale retracted content, unrelated approved records remain. | P0 | Projection/API tests |
| TE-API-06 | Many themes | Fixture `themes: []`, `[Data & Eval]`, and `[System Design, Reliability, Safety & Control]`; assert stable ordering, no duplicates, searching/filtering matches any assigned theme, and no result is lost/duplicated. | P0 | Unit + API + UI tests |
| TE-UI-01 | Transcript-backed modal evidence | Open each fixture state. For approved evidence, assert claim label identifies transcript-backed basis, exposes source/provider, reviewed date, timestamp link/locator, and does not label speaker attribution unless evidence says so. Locator opens/seeks the canonical source correctly. | P0 | Component/browser test + screenshot |
| TE-UI-02 | Modal unavailable/error fallbacks | For unavailable, restricted, failed, stale, metadata-only, and network/API failure, modal retains title/source metadata and safe YouTube fallback; it shows the correct plain-language state and has no transcript claim, excerpt, timestamp, or export control. Retry only appears for retriable client fetch failure. | P0 | Component/browser tests |
| TE-UI-03 | Specified modal removals | Create an explicit removal allowlist in the implementation ticket/design handoff. DOM and visual tests must assert every named removal is absent in all approved, unavailable, and error states, while close, source link, title, and provenance remain operable. | P0 | DOM assertions + desktop/mobile screenshots |
| TE-UI-04 | Theme filter labels | Verify filter names have the required uncoloured text treatment in default, hover, focus-visible, active, disabled/unavailable, and forced-colors modes. Do not use colour alone to signal selection. | P1 | Browser visual + computed-style/a11y test |
| TE-UI-05 | Hero-motif filter icons | Each filter icon has an accessible name supplied by its labelled button, is decorative if redundant (`aria-hidden`), has no duplicate announcement, and does not become a separate tab stop. Verify 24x24px minimum target/icon legibility and contrast at desktop/mobile. | P1 | Axe/manual keyboard + screenshot |
| TE-UI-06 | Filter state machine | Pointer and keyboard activation update `aria-pressed`, selection, live result count, result grid, and zero-result recovery. Test multiple assigned themes, All reset, query + theme intersection, and Reset. | P0 | Browser/component test |
| TE-UI-07 | Dialog accessibility | Card -> modal focus moves to dialog; Tab/Shift+Tab stays trapped; Escape/Close/overlay behaviour follows approved design; close restores focus to trigger; title/description valid; no background focus; 320px and 1440px layout has no clipping. | P0 | Browser a11y + screenshots |
| TE-UI-08 | Error/load/fallback | Skeleton -> populated, empty catalog, malformed API response, 4xx/5xx/timeout, mid-page version change, thumbnail failure, player failure, and source API fallback. Assert state is announced, no stale evidence appears, and fallback provenance is visible if content origin changes. | P0 | Client/API tests + manual runtime evidence |
| TE-REG-01 | Existing catalog behaviour | Preserve pagination, search, ETag/304, LKG fallback, metadata-only unclassified cards, no public candidate/admin endpoint, API method handling, and browser-safe client bundle (no `node:*` imports). | P0 | Existing suite expanded |
| TE-SEC-01 | Public data minimisation | Static/API scan forbids transcript body, signed captions/transcript URLs, credentials, private review comments, reviewer PII beyond approved display identity, and unredacted acquisition errors in browser payload/logs. | P0 | Contract assertions + build/static scan |
| TE-OPS-01 | Revision-bound evidence | Run full suite, typecheck, lint, production build, and browser smoke on exact commit/build. Capture test count, build ID/projection version/content hash, browser/viewport, fixtures, and screenshots. | P0 | CI/release record |

## Test fixtures and acceptance evidence

Maintain named deterministic fixtures, with fixed timestamps and content digests, rather than live YouTube/transcript calls in CI:

- `approved-multi-theme`: three themes, available/legal/reviewed transcript, two approved timestamped evidence items.
- `approved-zero-theme`: no themes, one approved evidence item. Confirms transcript evidence does not require a taxonomy assignment.
- `metadata-only`: no transcript and no evidence.
- `restricted-rights`: acquired privately but redistribution false/restricted. No public evidence/excerpt.
- `unavailable`: source has no obtainable transcript; metadata and source link only.
- `failed-retriable` and `failed-final`: acquisition/runtime errors without sensitive details.
- `stale-or-superseded`: old digest and evidence are withheld until reviewed again.
- `retracted`: formerly approved item removed without affecting unrelated records.
- `malformed-projection` and `mid-read-change`: validate existing LKG/atomic-read fallback.

Required evidence per implemented PR: requirement-to-test mapping, fixture payload hashes, automated output, build/version/projection hash, mobile and desktop modal/filter screenshots, automated accessibility output plus a keyboard pass, and explicit manual check of source-link/timestamp navigation. A manifest or test-file alone is not passing release evidence.

## UAT plan

1. Content reviewer opens an approved multi-theme talk, verifies every displayed claim against the private reviewed evidence record and timestamp, then confirms public UI contains no raw transcript or unsupported attribution.
2. Reviewer opens restricted/unavailable/stale records and confirms the difference is intelligible, no transcript claim is shown, and the canonical source remains reachable.
3. A keyboard and screen-reader user filters by a multi-theme video, opens and closes a modal, and returns to the originating card without duplicate icon labels or lost focus.
4. Product owner validates the final modal-removal list against the design before QA baselines visual assertions. This is a required input, not a QA inference.

## Defect triage and release quality gate

**Block release (Severity 1):** any claim/excerpt/timestamp attributed to a video without a current approved evidence record; legal status bypass; raw/private transcript/credential disclosure; retracted evidence remaining public; wrong-video evidence; broken modal keyboard/focus trap; or a specified removal still visible.

**Do not block metadata-only continuation but block transcript-enrichment launch (Severity 2):** incorrect/missing availability explanation, wrong/duplicate theme filter result, inaccessible icon name/selection state, missing source fallback, visual clipping at supported viewports, or stale evidence after cache/projection update.

Go only when all P0 tests pass on the release revision, no Sev 1/2 defects are open without a documented approved waiver, the legal/content owner has approved the content policy and evidence fixtures, and required visual/accessibility/UAT evidence is attached. Otherwise **no-go for transcript-backed publication**; the existing metadata-only/LKG catalog can remain independently releasable if its current gates pass.

## Assumptions

- Hermes/content review remains canonical for approvals, evidence, retractions, and rights decisions; this repository receives only a public-safe projection.
- "Specified modal removals" have not been enumerated in the task input or current code. The Product Owner/Product Design must provide the exact removed controls/sections before visual regression can be objectively accepted.
- A transcript may be acquired for internal review without being legal to redistribute. Legal availability must be explicitly modelled; it is not inferred from a reachable YouTube video or captions toggle.

## Risks and caveats

- **High provenance/legal risk:** the current broad track synthesis is UI-local and unlinked to any video evidence. Reusing it for transcript-backed content would create unsupported display claims.
- **High coverage gap:** there is no current browser automation runner for dialog/filter/accessibility/visual states; implementation must add one or define an equivalent deterministic component/browser harness before calling this slice release-ready.
- **Medium cache risk:** current API `cache-control: public, max-age=60` needs retraction/staleness verification so a public client cannot retain a revoked claim beyond the approved cache policy.
- **Medium integration risk:** live transcript providers and terms are intentionally excluded from CI; use fixtures for determinism and obtain a separate approved, rate-limited, rights-aware integration proof.

## Dependencies

- Product Owner and legal/content owner: approve source-rights policy, publication/retraction semantics, and exact modal-removal list.
- Full-stack: add the versioned public-safe transcript/evidence projection, server-side acquisition boundary, fail-closed publisher, schema, deterministic fixtures, and browser-test harness.
- Product Design: final modal information architecture, removal list, icon assets/semantics, supported breakpoints, error copy, and contrast/token specification.
- Delivery Operations: immutable private evidence storage, acquisition job provenance, retention/access controls, cache invalidation/retraction procedure, and revision-bound CI artifact retention.

## Validation performed

- Inspected current source catalog, API/projection schemas, source discovery/publisher, client fallback, dashboard/modal/filter implementation, test suite, API documentation, and migration handoffs.
- Confirmed current UI labels its modal material as editorial track synthesis and not a transcript summary; confirmed no transcript/evidence/legal schema currently exists.
- Did not execute or modify application code for this QA planning work. No live transcript/provider/legal availability was checked.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Public transcript representation | Raw transcript; approved excerpt; approved paraphrase plus locator | Default to approved paraphrase plus timestamp/provenance; permit excerpts only through explicit rights policy | High | Copyright/terms breach or unsupported claims | Legal + Content owner |
| Legal status model | Boolean available; explicit availability/rights/recheck model | Use explicit availability, rights basis, redistribution permission, and expiry/recheck fields | High | Cannot distinguish unavailable from restricted or stale content | Legal + Architecture |
| Theme cardinality | One track; optional zero-to-many themes | Use zero-to-many unique ordered themes, independent from evidence status | High | Lossy taxonomy and misleading filter behaviour | Product owner |
| Modal removals | Infer from current UI; enumerate in design/acceptance criteria | Enumerate exact removals and retain the list as visual-regression assertions | High | Subjective acceptance and reintroduced UI | Product owner + Product Design |
| Browser test approach | Unit/API only; deterministic browser/a11y/visual harness | Add deterministic browser coverage for filters and modal states before release | High | Regressions in primary interaction/accessibility path | Full-stack + QA |

## Quality recommendation

**No-go for transcript-backed public release until the schema, legal/content policy, exact modal-removal acceptance criteria, and revision-bound deterministic browser/API evidence above are delivered.** Confidence: high that this gate preserves the existing provenance boundary; medium on final interaction details until Product Design supplies the exact modal-removal and icon specification. Metadata-only catalog operation remains a separate, lower-risk release surface and must not be used to imply transcript enrichment is ready.
