# Solution Architecture Handoff: Cole Medin Transcript Assessment

## Task summary

Assessed `coleam00/cole-medin-knowledge-base` as a reference for collating AI Engineer YouTube transcripts without weakening the Hermes and provenance boundary.

## Key facts

- The reference repo's strongest reusable pattern is its knowledge model: immutable raw evidence, per-video source records, cross-video concepts/entities, and a two-pass extract then canonicalize workflow.
- Its transcript exporter is not portable acquisition infrastructure. It reads a private DynaChat/Postgres database already synchronized through Supadata.
- Its watch-page scraping fallback, suggested `yt-dlp` alternative, and public raw-transcript Git storage should not be adopted without explicit rights and policy approval.
- This repo already has stronger public-release controls: official uploads-playlist discovery, private `review_required` candidates, transcript digests, rights and review state, Hermes approval, and last-known-good projection fallback.

## Outputs and recommendation

Adopt the reference repo's synthesis and deterministic validation patterns, not its acquisition or raw-publication patterns.

Recommended flow:

1. Discover the channel through the official YouTube metadata API.
2. Create an acquisition request for each new video.
3. Acquire only through channel-owner export, authorized OAuth, or a licensed provider.
4. Store immutable transcript versions in encrypted private storage with digests.
5. Extract timestamped candidate evidence.
6. Require Hermes review and a rights decision.
7. Publish only approved paraphrases or separately permitted excerpts with video URL, timestamp, digest, and last-known-good rollback.

For a first authorized backfill, use a two-pass extract and canonicalize operation. For later videos, update incrementally using `youtubeId + transcriptDigest` as the idempotency key and a bounded reconciliation window.

## Assumptions

- "All transcripts" means an agreed AI Engineer channel scope; Shorts and livestreams remain an open product policy.
- An authorized or licensed transcript source may become available.
- Hermes remains authoritative for approval, evidence, supersession, and retraction.

## Risks and caveats

- Public captions do not by themselves establish download, retention, or redistribution rights.
- An API key supports metadata discovery but does not authorize caption download.
- Public raw-transcript storage complicates access control, deletion, and retraction.
- ASR errors make human review necessary before speaker attribution or display claims.
- A high-water marker alone will not detect deletions, privacy changes, or late metadata corrections.

## Dependencies

- Legal/content-owner approval for acquisition, retention, excerpts, paraphrases, and retraction.
- Channel-owner OAuth/export or a licensed provider.
- Hermes content review.
- Encrypted storage, secrets, scheduling, audit, backup/restore, and rollback operations.
- Revision-bound QA gates for rights, provenance, stale/retracted evidence, and public projection behavior.

## Validation

- Inspected the reference README, schema, ingestion workflow, roadmap, exporter, raw-manifest model, and validation approach.
- Inspected this repo's transcript evidence schema and provenance controls.
- No transcript was acquired and no external system was changed.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Transcript acquisition | Scrape; authorized OAuth; owner export; licensed provider | Authorized OAuth, owner export, or licensed provider only | High | Copyright or platform-policy breach | Legal and channel owner |
| Raw transcript retention | Public Git; private immutable store; no retention | Private immutable store with deletion policy | High | Irreversible redistribution or failed retraction | Legal and security |
| Public representation | Full transcript; excerpt; approved paraphrase with locator | Approved paraphrase with video URL, timestamp, and digest; excerpt only if permitted | High | Unsupported claims or rights breach | Content and legal |
| Corpus scope | All uploads; long-form only; include Shorts/livestreams | Define long-form scope first | Medium | Coverage, cost, and quality drift | Product owner |
| Canonicalization | Per-video pages only; two-pass backfill then incremental | Two-pass authorized backfill then incremental Hermes extensions | High | Duplicate and contradictory concepts | Hermes owner |
| Reconciliation | High-water only; full scan; bounded lookback plus periodic reconciliation | Bounded lookback plus periodic full metadata reconciliation | High | Missed removals or corrections | Delivery operations |

