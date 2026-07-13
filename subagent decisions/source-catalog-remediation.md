# Source catalog remediation handoff

## Task summary

Audited all 47 legacy video records for reachability and semantic identity. Checked every original YouTube ID through oEmbed, captured canonical title/channel for every reachable source, inspected watch-page structured metadata for publication date and duration, and searched exact title plus speaker combinations for unavailable or mismatched records. The defensible live catalog contains 14 records: 13 current sources plus one exact replacement for v24. The remaining 33 should be removed from the public catalog.

Machine-usable decisions are in `source-catalog-remediation.json`.

## Key facts

- A 200 oEmbed response proves reachability, not catalog correctness.
- Eleven reachable IDs point to the wrong or merely related talk and must not be retained: v01, v02, v11, v14, v26, v27, v28, v31, v36, v41, and v45.
- Twenty-three original IDs return oEmbed 404. One of those, v24, has an exact replacement; the other 22 have no confidently verified exact replacement.
- The exact v24 replacement is YouTube ID `7wwWRph3Jls`, canonical title “Agent Engineering with Pydantic + Graphs — with Samuel Colvin, CEO of Pydantic Logfire,” channel Latent Space, published `2025-02-06T14:58:45-08:00`, duration 3,735 seconds.
- The defensible set is v03, v04, v05, v06, v08, v12, v17–v24, with v24 using the replacement ID.
- Nine of the 14 defensible sources are on AI Engineer; five are exact/official external sources (v05 MLOps.community, v06 Anthropic, v08 Hamel Husain, v24 Latent Space; v03/v04/v12/v17-v23 are AI Engineer). The AI Engineer count is actually ten: v03, v04, v12, and v17-v23.
- v06 is medium-confidence because its legacy generic title/team attribution must be canonicalized to the official Anthropic video title; every other retained record is high-confidence.

## Outputs

- `subagent decisions/source-catalog-remediation.json`: complete 47-record disposition, canonical metadata for all live records, observed metadata for reachable mismatches, evidence URLs, validation method, and known gap.
- This handoff: concise implementation and review guidance.

## Assumptions

- The intended identity of a record is the legacy title plus named speaker, not just its theme.
- Exact external-channel sources are acceptable when they are the intended talk; the AI Engineer channel is a preference, not an absolute restriction.
- Canonical source metadata should replace legacy paraphrased titles, dates, and durations.
- A record with no exact discoverable source should be absent from the live catalog rather than shown with a disabled or misleading source link.

## Risks and caveats

- YouTube/web search indexing is not exhaustive. A removed source could be private, unlisted, renamed beyond confident matching, or published later.
- v06 should be removed too if the project requires exact legacy title and named-person matching rather than official-topic continuity.
- Future verification that checks only HTTP status will reintroduce semantic false positives. It needs an allowlist or expected canonical metadata assertions.
- Current working `src/data/videos.ts` was observed retaining all 23 oEmbed-reachable records. That includes the 11 semantic mismatches listed above and conflicts with this audit.

## Dependencies

- The app data owner must rebuild the public catalog from the 14-record `live_catalog` array.
- Tests/verifier must assert expected canonical title and channel per retained ID, not merely reachability.
- Search/filter counts, empty states, and any “47 talks” UI copy must derive from the remediated catalog.
- Re-admission of removed records requires exact source verification and canonical metadata capture.

## Validation

- 47/47 original IDs checked through YouTube oEmbed.
- 24/47 were reachable; canonical title/channel captured.
- Watch-page publish date/upload date and duration captured for reachable candidates.
- Exact title-plus-speaker searches run for unavailable/mismatched records.
- v24 replacement independently validated through oEmbed, YouTube watch metadata, and the publisher page at `https://www.latent.space/p/pydantic/`.
- JSON parsed successfully: 14 live + 33 remove = 47 unique IDs.

## Decision points

| Decision Point                                          | Options                                                                            | Recommendation                                                            | Confidence | Impact If Wrong                                                                                      | Owner Needed                    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- | ------------------------------- |
| Retain v06 official Anthropic prompt-engineering video? | Retain with canonical metadata; remove for lack of exact legacy-title/person match | Retain, label medium confidence, and canonicalize metadata                | Medium     | One catalog record may represent a broader official resource rather than the originally phrased talk | Project Manager / content owner |
| Display removed records?                                | Omit from live catalog; show disabled historical entries                           | Omit from live catalog and keep only in audit data                        | High       | Disabled/mismatched entries undermine provenance claims and search usability                         | Project Manager                 |
| Future source verification                              | Reachability only; canonical allowlist plus title/channel assertions               | Canonical allowlist plus exact metadata assertions and fail-closed review | High       | Reachable but wrong videos can silently ship again                                                   | Full-stack / QA                 |
