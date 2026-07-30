# Atlas transcript enrichment and theme delivery plan

**Status:** Theme slice integrated and evidenced locally; transcript acquisition/publication remains gated (28 July 2026)  
**Objective:** Add zero-to-many existing hero/filter themes and transcript-backed modal enrichment without creating unsupported claims or increasing source-request volume unnecessarily.

## Source and provenance decision

The existing YouTube Data API key is sufficient for public video metadata discovery, but not captions. Official YouTube documentation requires OAuth authorization for [`captions.list`](https://developers.google.com/youtube/v3/docs/captions/list) and [`captions.download`](https://developers.google.com/youtube/v3/docs/captions/download); a Data API key alone must not be treated as transcript access. The implementation therefore uses only approved, locally stored transcript artifacts with a per-video source URL, retrieval time, rights/availability status, content hash, and timestamped evidence spans. It does not scrape public watch pages or caption endpoints, add OAuth, or claim transcript availability when no approved artifact exists.

## Milestones

| Milestone | Owner | Exit criteria | Status |
| --- | --- | --- | --- |
| UX and accessibility contract | Product Design | Themes, filter icon semantics, modal states, and removals are testable | Complete |
| Provenance and regression contract | QA | Content schema, fixtures, negative paths, and release gates defined | Complete |
| Local transcript/evidence integration | Full-stack | Versioned ignored artifacts, zero-to-many classification, evidence-backed modal, no-network default | Complete |
| Integration acceptance | Project Manager | Handoffs reconciled; tests/build and user-visible states evidenced | Complete locally; transcript acquisition/rightsholder approval remains pending |

## RAID

| Type | Description | Owner | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- | --- |
| Decision | Transcript source under current API key | PM + content owner | High provenance/legal risk | No key-only caption calls or scraping; allow only approved local artifacts until OAuth/rightsholder path is approved | Decided |
| Risk | Theme assignment or modal prose becomes unsupported | Full-stack + content | High | Require evidence spans, source fingerprint, and explicit no-evidence UI state | Open |
| Risk | Transcript ingestion causes high request volume | Full-stack | Medium | Local ignored artifacts; no automatic remote transcript fetch | Open |
| Dependency | Approved transcript artifacts or rightsholder OAuth/permission path | Content + legal/rights owner | Feature coverage limited | Pilot locally stored artifacts; escalate source authorization separately | Open |
| Fact | Revision-bound Bun/API and browser evidence completed: 21 Bun tests / 213 assertions, desktop interaction/accessibility checks, typecheck, lint, build, operations gate, and diff check pass | PM + QA + Full-stack | Theme/modal slice is supported by executed evidence | Preserve output with release record; repeat target-runtime checks for Mac Mini deployment | Complete |
| Fact | Local projection builder parses private local classification input, derives unique zero-to-many themes, and discards raw text before the public projection | Full-stack | Implements no-network classification without a caption entitlement | Tested through deterministic fixtures; content/legal approval still required | Complete |
| Fact | Local projection rebuilt: 984 records; 468 metadata-classified, 82 multi-theme, 516 unassigned | Full-stack | Confirms classification and zero-to-many UI operate at current catalog scale | Monitor thematic quality through content review; unassigned remains an allowed state | Complete |
| Scope | Existing six themes only | Product + Design | Medium | Allow zero-to-many, no new taxonomy in this slice | Decided |

## Release gate

No transcript-derived statement may render as speaker-attributed without a stored timestamped evidence span and content hash. Videos without approved evidence retain a truthful “no transcript-backed evidence is available” state. The modal no longer shows source-channel prefix, YouTube Source, Code, Review, or Verified fields; it uses plain theme labels and decorative hero-motif icons. Scheduler and metadata auto-publication remain out of scope and disabled.

## Final integration evidence

- **Automated:** 21 Bun tests / 213 assertions, typecheck, lint with 0 errors and 6 existing Fast Refresh warnings, production build, operations gate, and diff check passed after correcting a misplaced exported function.
- **Projection:** 984 records rebuilt. Theme distribution: System Design 306, Deployment 105, Data & Eval 64, Reliability 59, Safety & Control 18, and Observability 11. Of the catalog, 468 records are metadata-classified, 82 are multi-theme, and 516 intentionally remain unassigned.
- **Browser, 1440×900:** 984 records loaded; System Design filter returned 306; adding Data & Eval returned 356 under OR semantics. Monochrome hero-motif icons, exact modal removals, multi-theme header, evidence-empty state, outside-click close, focus restoration to the card, and corrected hero/footer copy were verified.
- **Residual release condition:** transcript acquisition still requires a rightsholder OAuth/approved local-artifact path. No automatic acquisition, schedule enablement, or transcript-backed publication is authorized by this evidence alone.
