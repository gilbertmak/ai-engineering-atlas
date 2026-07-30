---
name: atlas-transcript-batch
description: Project-local workflow for extracting, reviewing and checkpointing AI Engineer Atlas YouTube transcripts with bounded pacing, faster safe waits, resumable queue state and guaranteed cleanup of worker-owned browser tabs. Use when continuing Atlas transcript enrichment or repairing an interrupted transcript batch.
---

# Atlas transcript batch

Use this skill only for `/Users/gilbertmak/Documents/AI Engineer infographics`. It governs browser-based YouTube transcript extraction for the Atlas. It does not authorize public scraping, transcript redistribution or changes to global Codex skills.

## Operating defaults

- Process one video at a time in one worker-owned tab. Reuse that tab within a batch instead of opening a new tab for every video.
- Default batch size is 5 videos. Checkpoint after each video and finalize the tab at the end of every batch.
- Use the fast-safe pacing profile: wait 4 seconds after navigation, 0.8 seconds after clicking `...more` and 2.5 seconds after clicking `Show transcript`.
- Add a 2–4 second jitter between videos. Do not run parallel YouTube pages.
- If a control is missing, wait an additional 3 seconds and retry once. After two page-control failures, stop the batch and use the slow profile for the next attempt: 7 seconds, 1.5 seconds and 5 seconds.
- Never dump a full transcript into tool output. Read small indexed slices, retain only the ordered entries needed for review and discard page data after the digest is computed.
- Avoid screenshots and other large browser payloads unless visual inspection is required to locate a control.

## Queue and checkpointing

1. Read `docs/transcript-processing-handoff-2026-07-30.md` and regenerate coverage from `data/atlas-catalog-projection.json`, `src/routes/index.tsx` and `src/data/videos.ts` before selecting work.
2. Skip a video only when an approved evidence artifact has a matching transcript digest and the mapped insight is present. Treat interrupted or partially fetched videos as pending.
3. For each completed video, record the YouTube ID, title, source URL, availability, ordered-entry digest, batch ID, reviewed timestamp and artifact path before starting the next video.
4. Write evidence to `data/transcript-evidence/youtube-<id>.json` and the reviewed modal insight to `src/routes/index.tsx` under `TALK_INSIGHTS`.
5. Rebuild the projection after each batch, then run typecheck and the coverage audit. Do not claim full completion while the projection is `mixed` or pending records remain.

## Browser lifecycle

Track worker-created tab IDs separately from any user-owned tabs. Use a `try/finally` around every video and every batch:

```js
const workerTabIds = new Set();
let tab;
try {
  tab = await browser.tabs.new();
  workerTabIds.add(tab.id);
  // navigate, reveal More, reveal Show transcript, read small slices
} finally {
  if (tab) await browser.tabs.finalize(tab.id);
  workerTabIds.delete(tab?.id);
}
```

Use the browser client’s documented tab-finalization method if the exact signature differs. On interruption or before resuming, list tabs and finalize only IDs in `workerTabIds` or the persisted worker-session ledger. Never close the user’s active YouTube tab. At batch completion assert that no worker-owned tabs remain. If the browser runtime exposes a session close or disconnect operation, call it after all worker tabs are finalized.

## Transcript extraction

Use the in-app browser skill and click controls semantically:

1. Navigate to the public YouTube URL.
2. Wait using the active pacing profile.
3. Click `...more` if present, wait and click `Show transcript`.
4. If the transcript is unavailable, checkpoint `unavailable` and finalize the tab without retry loops.
5. Read transcript entries in slices such as `0–40`, `40–80` and so on. Capture chapter markers and timestamps but do not reproduce the transcript in the Atlas.
6. Compute a stable SHA-256 digest from the ordered entries before writing evidence.
7. Close or finalize the tab immediately after the evidence is written or the video is marked unavailable.

Use a fresh worker session after a batch, not a long-lived collection of page bindings. If memory or browser errors appear, stop, finalize all owned tabs, wait at least 30 seconds and resume from the last checkpoint.

## Review and evidence contract

Each approved artifact must preserve the project schema and include:

- `contentBasis: "transcript_backed"` in the mapped insight.
- Matching `videoId` and transcript digest.
- `status: "acquired"`, `availability: "available"`, reviewed state and redistribution permission.
- At least one concise approved evidence synthesis with `timestampSeconds`.
- Theme classification using the Atlas’s six practical themes.

Write reader-friendly insight sections with numbered points when there are multiple points. Put timestamps inline at the end of the relevant sentence, for example `(04:04)`. Do not add transcript dumps, Oxford commas, “Transcript-backed insight”, “Evidence from transcript” or “Example” sections.

Keep the metadata-only guard in `getInsightContent`. Evidence eligibility does not prove every sentence in a modal, so avoid unsupported claims and preserve caveats for extrapolations.

## Validation

Run from the project root after each small batch:

```sh
npx --yes tsx scripts/build-transcript-projection.ts
npx tsc --noEmit
npm run lint
```

Recompute mapped, reviewed and pending counts. Report only checkpoint status during an explicitly ongoing batch. Report completion only when the queue audit confirms no pending records and validation is clean.
