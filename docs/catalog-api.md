# Atlas catalog read API

The public read API serves the versioned **last-known-good** Atlas projection. It is a projection of reviewed source metadata, not the raw YouTube discovery feed and not a Hermes mutation API.

## Public contract

| Endpoint | Response | Notes |
| --- | --- | --- |
| `GET /healthz` | `204` | Liveness only. |
| `GET /readyz` | JSON readiness and projection version | Does not disclose dependency details. |
| `GET /v1/catalog/manifest` | Projection manifest | Includes `projectionVersion`, source-review time, content hash, review/publication state, and `lastKnownGood`. |
| `GET /v1/catalog?track=&q=&cursor=&limit=` | Paginated reviewed records plus manifest | `track` is a closed Atlas track; `q` is at most 120 characters; `limit` is 1–50. |
| `GET /v1/videos/{id}` | One reviewed record plus manifest | `404` for unknown IDs. |

Catalog responses have an `ETag`; matching `If-None-Match` requests return `304`. Only `GET` and `HEAD` are accepted. There are no public admin, discovery, review, Hermes, evidence, or publication endpoints.

## Projection semantics

The current seed is deliberately constrained:

- `contentScope: "reviewed_source_metadata_only"` means every record is reviewed source metadata. Once approved scheduled metadata is added it becomes `"mixed_approved_metadata"` and the manifest `reviewStatus` becomes `"mixed"`; each new record is separately marked `metadata_only` and unclassified.
- It contains no transcript text, raw YouTube candidate, private review data, Hermes draft, or speaker-attributed insight.
- The generic track synthesis shown in the UI remains editorial taxonomy and is not part of a video-specific API claim.
- The projection uses a deterministic browser-safe content fingerprint as an integrity/version marker. It is not a substitute for the signed immutable projection required for a production Hermes publication workflow.

The browser fetches this API after hydration. It accepts any schema-valid projection version; if the response is unavailable or invalid, it uses the bundled reviewed last-known-good fixture. The fallback never uses a discovery-candidate file.

## Discovery boundary and schedule gate

`bun run discover:sources` writes discovery results to a private `review_required` candidate handoff only. The daily `bun run discover:sources:scheduled` flow then accepts only exact approved-channel and approved-playlist metadata candidates, if both schedule and metadata-publication flags are enabled. It atomically writes a persisted catalog projection consumed by the API. New records are deliberately `metadata_only`, unclassified, and show “No reviewed insight yet”; Hermes/content review remains mandatory for any insight or attribution.

`YOUTUBE_DATA_API_KEY` remains worker-only. The only supported browser configuration is `VITE_ATLAS_API_BASE_URL`; it must contain an API origin, never a credential.
