# Full-stack handoff: Atlas transcript enrichment

## Task summary

Implemented a local-only, fail-closed transcript/evidence projection slice. It supports zero-to-many existing themes, approved timestamped evidence, LKG/API propagation, multi-select OR filters, and an evidence-only modal. No transcript provider, captions endpoint, OAuth flow, environment file, or network request was added.

## Key facts

- `themes` is the canonical zero-to-many closed vocabulary; legacy `track`/`tracks` remain temporarily for the current catalog migration.
- Local artifacts require source identity, acquisition/version/digest, availability and rights basis, review state, reviewer version, timestamped evidence, and explicit speaker-attribution eligibility.
- Public evidence fails closed unless it matches the video and digest and its transcript is acquired, available, reviewed, and redistribution-permitted. Raw transcript fields are not in the artifact/projection contract.
- The modal shows approved evidence rows only. Otherwise it says `No transcript-backed evidence is available for this talk yet.` and retains the canonical YouTube action.
- The rebuilt local projection contains 984 records: 468 metadata-classified, 82 multi-theme, and 516 intentionally unassigned. Theme counts are System Design 306, Deployment 105, Data & Eval 64, Reliability 59, Safety & Control 18, and Observability 11.

## Outputs

- `src/lib/atlas-catalog.ts`: strict projection, evidence, provenance, and query validation; content hash includes provenance/evidence fields.
- `scripts/build-transcript-projection.ts`: deterministic ignored local-artifact parser and atomic projection merger. `scripts/transcript-enrichment.ts` is now a compatible local-only entry point, not a raw transcript/caption path.
- `src/routes/index.tsx`: OR multi-select theme filters with decorative icons and plain-text labels; evidence-only modal with timestamped YouTube links; removal of editorial claim rows and requested modal metadata.
- `tests/transcript-enrichment.test.ts` and `docs/transcript-enrichment.md`.

## Assumptions

- Local artifacts are already approved by content/legal owners and contain public-safe paraphrases/excerpts only.
- `approved_local_metadata` is acceptable provenance for automatic taxonomy classification; it does not authorize evidence or attribution.

## Risks and caveats

- Transcript acquisition remains unavailable without a rightsholder OAuth or approved local-artifact path; this implementation deliberately does not treat the existing Data API key as caption access.
- Browser evidence is desktop-scoped for this revision. Narrow viewport, forced-colors, and full automated visual-regression coverage remain follow-up quality evidence for a broader public release.
- Existing `track` compatibility fields must be removed only after the parallel migration consumers are updated.

## Dependencies

- Content/legal: approve artifact policy, rights basis, reviewer identity/version, and any public excerpt policy.
- QA: retain and extend revision-bound Bun/browser accessibility tests, including narrow viewport and forced-colors states.
- Operations: retain ignored private artifacts and atomically publish approved projections; no scheduler or acquisition workflow is included.

## Validation

- Passed: 21 Bun tests / 213 assertions after correcting a misplaced exported function.
- Passed: typecheck; lint with 0 errors and 6 existing Fast Refresh warnings; production build; operations gate; and `git diff --check`.
- Passed browser check at 1440×900: 984 records loaded; System Design returned 306; System Design plus Data & Eval returned 356 under OR matching; monochrome hero icons, modal removals, multi-theme header, evidence-empty state, outside-click close, and focus return to the initiating card behaved as specified.
- Projection evidence: 984 rebuilt records with the distribution stated above; hero and footer copy were corrected in the same integration pass.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Public evidence text | Approved paraphrase; raw transcript/excerpt | Keep public-safe approved paraphrase by default | High | Rights or provenance breach | Content and Legal |
| Legacy taxonomy fields | Keep during migration; remove now | Retain temporarily, then remove with all consumers | High | API/client migration breakage | PM and Full-stack |
| Caption integration | OAuth/rightsholder flow; local artifacts | Keep local artifacts only for this slice | High | Unauthorized provider access | Product and Legal |
