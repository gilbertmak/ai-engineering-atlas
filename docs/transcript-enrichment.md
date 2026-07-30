# Atlas local transcript enrichment

Transcript enrichment is a local, reviewed-projection workflow. `bun run build:transcript-projection` reads ignored JSON artifacts from `data/transcript-evidence/`, validates provenance, rights, review state, digest, timestamped evidence, and explicit attribution eligibility, then atomically replaces the configured catalog projection.

It makes no network request. Raw transcript segments, private locations, credentials, and reviewer notes are not accepted into the public projection. An approved evidence item is published only when its video ID and digest match an `acquired`, `available`, reviewed transcript with redistribution permission. Retracted, superseded, restricted, stale, failed, unknown, or pending records have no public evidence rows.

Themes are the existing six navigation labels and may be empty or contain multiple unique values. Their `themeClassification` records the approved local source, basis, review date, and review version; themes do not imply speaker endorsement or transcript availability.

Official YouTube Data API caption operations (`captions.list` and `captions.download`) require OAuth authorization. OAuth, caption downloading, scraping, provider retrieval, and scheduled transcript acquisition are deliberately out of scope for this slice.

The browser receives only approved paraphrase/excerpt text, timestamp, public YouTube source link, and review-safe provenance. It falls back to the bundled last-known-good projection if a persisted projection is absent or malformed.
