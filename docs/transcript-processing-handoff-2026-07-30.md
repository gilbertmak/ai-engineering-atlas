# AI Engineer Atlas transcript-processing handoff

Date: 2026-07-30 16:18 Singapore time  
Status: paused at the user’s request. Do not treat the Atlas as fully processed.

## Resume point

The current catalog projection contains 984 records. The latest audit reports:

- 348 catalog videos have a mapped modal insight.
- 79 catalog records have reviewed transcript evidence.
- 636 catalog videos remain in the processing queue.
- The next queue item is `DeM_u2Ik0sk`, followed by `a2muGkT4WD4`, `6IxSbMhT7v4`, `mYSRn6PC1mc`, `_gVFUEdhCyI`, `XKup1pj-34M`, `8txf05vVVl4` and `v3Fr2JR47KA`.

The full next queue can be regenerated rather than copied from this note. The first twelve IDs at pause were:

| YouTube ID | Title |
| --- | --- |
| `DeM_u2Ik0sk` | AIE Miami Day 2 ft. Cerebras, OpenCode, Cursor, Arize AI, and more! |
| `a2muGkT4WD4` | Running LLMs on your iPhone: 40 tok/s Gemma 4 with MLX — Adrien Grondin, Locally AI |
| `6IxSbMhT7v4` | AIE Miami Keynote & Talks ft. OpenCode, Google DeepMind, OpenAI and more! |
| `mYSRn6PC1mc` | Full Workshop: Build Your Own Deep Research Agents — Louis-François Bouchard, Paul Iusztin, Samridhi |
| `_gVFUEdhCyI` | Gemma, DeepMind’s Family of Open Models — Omar Sanseviero, Google DeepMind |
| `XKup1pj-34M` | The New Application Layer — Malte Ubl, CTO Vercel |
| `8txf05vVVl4` | Code Mode: Let the Code do the Talking — Sunil Pai, Cloudflare |
| `v3Fr2JR47KA` | The Future of MCP — David Soria Parra, Anthropic |
| `zZsTVBXcbow` | How Google DeepMind is researching the next Frontier of AI for Gemini — Raia Hadsell, VP of Research |
| `_Zcw_sVF6hU` | The Friction is Your Judgment — Armin Ronacher and Cristina Poncela Cubeiro, Earendil |
| `zgNvts_2TUE` | State of the Claw — Peter Steinberger |
| `am_oeAoUhew` | Harness Engineering: How to Build Software When Humans Steer, Agents Execute — Ryan Lopopolo, OpenAI |

The `a2muGkT4WD4` browser fetch was started during the pause turn but was interrupted before its result was confirmed. Treat it as unprocessed until availability, transcript digest and an evidence artifact are verified.

## Work completed in the paused run

The following transcript-backed modal entries and evidence artifacts were added or refreshed. Each has `contentBasis: "transcript_backed"`, a reviewed timestamp and an inline timestamped synthesis:

| ID | Topic | Evidence artifact | Batch |
| --- | --- | --- | --- |
| `CD6R4Wf3jnY` | Gateways are All You Need — Karan Sampath, Anthropic | `data/transcript-evidence/youtube-CD6R4Wf3jnY.json` | 52 |
| `ClWD8OEYgp8` | Collaborative AI Engineering — Maggie Appleton, GitHub | `data/transcript-evidence/youtube-ClWD8OEYgp8.json` | 53 |
| `YBYUvGOuotE` | MCP = Mega Context Problem — Matt Carey, Cloudflare | `data/transcript-evidence/youtube-YBYUvGOuotE.json` | 54 |
| `kR64LOqBBCU` | AgentCraft: Putting the Orc in Orchestration — Ido Salomon | `data/transcript-evidence/youtube-kR64LOqBBCU.json` | 55 |
| `-QFHIoCo-Ko` | Full Walkthrough: Workflow for AI Coding — Matt Pocock | `data/transcript-evidence/youtube--QFHIoCo-Ko.json` | 56 |
| `R7A8rX-09Zw` | What Do Models Still Suck At? — Peter Gostev, Arena.ai | `data/transcript-evidence/youtube-R7A8rX-09Zw.json` | 57 |
| `4fntwuOoedA` | The End of Apps — Kitze, Sizzy.co | `data/transcript-evidence/youtube-4fntwuOoedA.json` | 58 |
| `v4F1gFy-hqg` | Software Fundamentals Matter More Than Ever — Matt Pocock | `data/transcript-evidence/youtube-v4F1gFy-hqg.json` | 59 |
| `XNtkiQJ49Ps` | Agents Need More Than a Chat — Jacob Lauritzen, Legora | `data/transcript-evidence/youtube-XNtkiQJ49Ps.json` | 60 |
| `xOP1PM8fwnk` | Building Generative Image & Video Models at Scale — Sander Dieleman, Google DeepMind | `data/transcript-evidence/youtube-xOP1PM8fwnk.json` | 61 |
| `CS5Cmz5FssI` | How AI Is Changing Software Engineering — Gergely Orosz | `data/transcript-evidence/youtube-CS5Cmz5FssI.json` | 62 |
| `wjk0ulMAkbc` | Taste & Craft — Tuomas Artman and Gergely Orosz | `data/transcript-evidence/youtube-wjk0ulMAkbc.json` | 63 |

Static modal insights live in `src/routes/index.tsx` under `TALK_INSIGHTS`. The projection was rebuilt after the latest completed batch and currently reports:

```text
projectionVersion: atlas-transcript-projection-2026-07-30
recordCount: 984
contentHash: fnv1a64:bbb61000faddac0e
contentScope: mixed_approved_metadata
reviewStatus: mixed
lastKnownGood: true
```

## Safe processing procedure

Use the in-app browser skill and process one video at a time. Keep the deliberately slow sequence:

1. Open one new tab and navigate to the YouTube URL.
2. Wait about 7 seconds for the page to settle.
3. Find and click `...more`, then wait about 1.2 seconds.
4. Find and click `Show transcript`, then wait about 5 seconds.
5. Read the transcript entries in small slices. Do not dump a long transcript and do not open many tabs concurrently.
6. Compute a digest from the ordered transcript entries before writing evidence.
7. Add one evidence JSON file and one `TALK_INSIGHTS` entry. Keep the evidence text as a concise synthesis, not a transcript reproduction.
8. Rebuild the projection after a small batch and run typecheck plus the coverage audit.

The persistent Node helper used in this run was `getTranscriptPaced(tab, url)`. A new session may need to recreate it after reading the browser skill. Do not assume the old Node REPL tabs or transcript bindings still exist.

## Validation commands

Run from the project root:

```sh
npx --yes tsx scripts/build-transcript-projection.ts
npx tsc --noEmit
npm run lint
```

The projection rebuild may need approved escalation because the sandboxed `tsx` process can fail with an IPC `listen EPERM`. The latest typecheck passed. Lint previously passed with six existing Fast Refresh warnings and no errors. Bun was unavailable in the prior run, so do not claim Bun-based tests passed without rechecking.

Use the coverage script from the prior handoff or regenerate it by comparing `data/atlas-catalog-projection.json` with `TALK_INSIGHTS` and the supported static video mappings in `src/data/videos.ts`.

## Product and evidence constraints to preserve

- Keep the modal copy suitable for a semi-technical reader and number multiple points in each section.
- Put timestamps inline at the end of the relevant sentence, for example `(04:04)`.
- Do not restore “Transcript-backed insight”, “Evidence from transcript”, “Example” or the withheld-transcript disclaimer that the user asked to remove.
- Preserve the six practical themes and the clock icon in the modal.
- Keep the metadata-only guard in `getInsightContent` so records without approved transcript evidence do not display unsupported static claims.
- Do not claim that the catalog is fully transcript-backed. The projection intentionally remains mixed and the release is not a public transcript-insight release.

## Known release-review gaps

The project-manager audit identified these follow-up items after transcript enrichment:

1. Evidence rows establish video and digest eligibility but do not yet bind every individual claim, implication, use case and caveat to a specific evidence span.
2. `contentBasis` is computed but is not currently rendered in the modal.
3. Timestamps are displayed as text rather than canonical source links.
4. The full 984-record catalog still contains metadata-only records and many unmapped modal insights.

Resolve those gaps separately from transcript batching. Do not widen the scraping rate or bypass the in-app browser pacing.
