# Project Manager handoff: infinite scroll and loading performance

## Task summary

Verify the complete Atlas infinite-scroll experience, reduce initial loading work and establish repeatable before/after product performance documentation.

## Key facts

- Infinite scroll already existed on the restoration branch: 12 initial cards, 12 per increment, `IntersectionObserver` and an accessible Load-more fallback.
- The initial route eagerly included all 348 long-form insights even though they are only used inside a modal.
- The complete 984-record catalog remains the shared gallery and MCP source.

## Outputs

- Deferred `talk-insights` loading until a reviewed modal opens.
- Added an accessible modal loading state.
- Retained the 12-record infinite-scroll, filter-reset and session-restoration behavior.
- Added `docs/performance.md` with the benchmark method, raw samples, before/after results, limitations and recommended ongoing metrics.
- Added `ATLAS-PERF-001` and `EVAL-PERF-001` to prevent the initial insight import from returning.

## Validation

- Initial route: 1,133.60 KB to 421.58 KB uncompressed and 329.17 KB to 100.89 KB gzip.
- Warm local gallery-ready median: 199 ms to 153 ms.
- Warm local p75: 225 ms to 153 ms.
- Browser verified 12 to 24 of 984 records, search reset and deferred DeepSWE insight loading.
- Eval validation, typecheck and production build passed.

## Risks and caveats

- Local warm-cache timings are directional and are not production Core Web Vitals.
- The deferred modal chunk remains large. A later content-storage or per-record chunking design could reduce modal-open transfer further.
- Durable product statistics still require an analytics destination rather than the tab-local debug buffer.

## Decision points

| Decision point | Options | Recommendation | Confidence | Impact if wrong | Owner needed |
| --- | --- | --- | --- | --- | --- |
| Catalog loading | Keep bundled; fetch separately | Keep bundled because a separate request reduced warm gallery readiness in local comparison | High | First grid becomes slower despite a smaller route | Engineering |
| Insight loading | Eager; modal-triggered | Modal-triggered | High | Initial route regains roughly 230 KB gzip | Engineering |
| Performance reporting | Local directional; production Web Vitals | Retain local evidence now and add production p75 measurement later | High | Local numbers are mistaken for user experience | Product + Delivery Ops |
