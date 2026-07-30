# Delivery Operations handoff — manual YouTube activation and recovery drill

## Task summary

Executed one manual, direct `--full` YouTube Data API crawl using the local
ignored environment source and a local npm-exec Bun runtime. Built and read a
local metadata-only projection without enabling its automatic publisher or
scheduler. Performed an isolated encrypted backup/restore drill using a
temporary one-day GPG key under `/tmp`; no durable credential configuration was
changed.

## Key facts

- The crawl completed successfully in approximately 45 seconds under the
  worker's paced request behavior.
- Resolved source: channel `AI Engineer`, channel ID
  `UCLKPca3kwwd-B59HNr-_lvA`, handle `@aidotengineer`, and uploads playlist
  `UULKPca3kwwd-B59HNr-_lvA`.
- Result: 980 candidates, of which 970 were `new` and 10 `known`.
- Provenance: `source: youtube-data-api-v3`, `fallback: none`, `full: true`,
  `scheduled: false`, and `publicationStatus: review_required`.
- State was atomically updated at `data/youtube-discovery-state.json`; private
  candidate handoff was atomically updated at
  `data/youtube-discovery-candidates.json`. State reported a high-water ID.
- A local metadata-only projection was built for validation: 984 records total,
  comprising 970 `metadata_only` and 14 reviewed records. It was latest-first;
  the read API returned all 984 records across 20 paged responses.
- Automatic metadata publication and scheduling remain disabled in the ignored,
  mode-600 `.env`; no Hermes/insight publication was attempted.
- The temporary encrypted backup/restore drill included state, candidates, and
  projection. All three restored byte-identically, and the projection content
  hash was preserved.

## Outputs

- Live, non-secret operational evidence captured above and in this handoff.
- Updated ignored local discovery state and review-required candidate handoff,
  as the intended consequence of the one authorized full crawl.
- Local projection/API pagination and encrypted backup/restore evidence.

## Assumptions

- The configured default channel is the approved initial source, pending
  Product/Content confirmation of the resolved channel and uploads playlist
  before any future scheduler enablement.
- Candidate count is not an approval or publication count; every new record
  remains outside the public projection until the separately gated process.

## Risks and caveats

- The 970 new candidates require content/source review; candidate metadata is
  not evidence for any insight or speaker-attributed claim.
- The crawler uses remote YouTube API behavior that can change; this one run
  validates current channel resolution, quota availability, pacing, and local
  state persistence only.
- The restore drill proves the backup workflow, not a transfer-ready recovery
  package. Its temporary one-day key and archive are not suitable for the Mac
  Mini transfer; final transfer must encrypt to a durable recipient controlled
  by the Mac Mini owner with documented custody and rotation.

## Dependencies

- Delivery Manager/Product/Content: approve the resolved uploads playlist and
  review the candidate handoff before any metadata-only automation.
- Security/Operations: provide a durable Mac Mini-controlled recipient and
  encrypted destination, then create and retain the actual transfer package.
- QA: validate candidate-to-projection negative paths and attach revision-bound
  API/Bun evidence before scheduler activation.

## Validation

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Manual full crawl | Pass | One direct full run completed; source/fallback and counts recorded above. |
| Scheduler gate | Not invoked | Result explicitly reports `scheduled: false`; no launchd action taken. |
| Local metadata-only projection | Pass | 984 records: 970 metadata-only and 14 reviewed; latest-first API returned all records over 20 pages. |
| Automatic metadata/Hermes publication | Not invoked | Automatic publisher/scheduler remain disabled in ignored mode-600 `.env`; no Hermes action ran. |
| State/candidate persistence | Pass | Both intended ignored files exist after the run; state has high-water marker. |
| Encrypted backup/restore drill | Pass, temporary evidence | State, candidates, and projection restored byte-identically; projection content hash preserved. |
| Mac Mini transfer package | Not ready | Temporary one-day `/tmp` key/archive is intentionally not durable transfer material. |

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Scheduler activation | Keep disabled; enable discovery; enable discovery plus metadata-only projection | Keep disabled until channel/playlist approval, candidate review, durable Mac Mini transfer package, health/monitoring evidence, and revision-bound QA evidence exist | High | Wrong sources, quota issue, or unintended public metadata change | Delivery Manager + Operations + QA + Content |
| Backup recipient | Reuse temporary key; use durable Mac Mini-controlled recipient | Encrypt final transfer material to a durable recipient controlled by the Mac Mini owner, with documented custody/rotation | High | Unrecoverable or inaccessible backup | Security + Operations |
| Candidate handling | Auto-publish all; metadata-only exact-match process; manual review only | Maintain review-required state now; apply exact-match metadata-only gate only after explicit approval | High | Unsupported or semantically wrong public records | Content + Product + Security |
