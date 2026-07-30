# Atlas loading performance

This page records directional loading benchmarks for the Atlas and the measurement protocol used to compare changes. It is product documentation, not a substitute for production Core Web Vitals.

## 30 July 2026: defer modal-only insights

The gallery previously shipped all 348 long-form talk insights in the initial route bundle even though readers only need an insight after opening a modal. The refactor keeps the complete 984-record catalog available for search and infinite scroll but loads the insight module only when a reviewed modal opens.

| Metric | Before (`c17255e`) | After refactor | Change |
| --- | ---: | ---: | ---: |
| Initial route JavaScript, uncompressed | 1,133.60 KB | 421.58 KB | −62.8% |
| Initial route JavaScript, gzip | 329.17 KB | 100.89 KB | −69.3% |
| Warm gallery-ready median | 199 ms | 153 ms | −23.1% |
| Warm gallery-ready p75 | 225 ms | 153 ms | −32.0% |
| Initial cards | 12 of 984 | 12 of 984 | No change |
| Infinite-scroll increment | 12 | 12 | No change |

The deferred insight chunk is 712.92 KB uncompressed and 229.67 KB gzip. It is requested only after a reader opens a reviewed modal.

### Runtime samples

The runtime measurement used the same local Mac, Codex in-app browser, Vite development server, desktop viewport and warm browser cache. Each run measured navigation start to the visible `12 / 984 results` state. Six runs were collected and the first development-compilation run was excluded.

- Before: `4933, 357, 166, 155, 199, 225 ms`
- After: `352, 154, 153, 150, 153, 152 ms`

The first values are retained for transparency but excluded because Vite dependency compilation made them non-comparable. The remaining five samples produced the median and p75 values above.

### Validation

- The gallery initially showed 12 of 984 talks.
- The accessible Load-more action advanced the gallery to 24 of 984.
- Search reset the visible result set correctly.
- The DeepSWE modal displayed a loading placeholder then rendered its reviewed insight from the deferred chunk.
- Typecheck, production build and Atlas evals remained required release gates.

### Interpretation

The bundle-size reduction is deterministic production-build evidence. The millisecond figures are directional local measurements and should not be presented as production-user latency. Network conditions, device class, CDN cache state and Lovable deployment location can materially change the result.

## Recommended ongoing product statistics

For each material performance change, capture:

- Git revision and deployment URL
- Browser, viewport, device and network profile
- At least 10 cold-cache and 10 warm-cache runs
- Median and p75 for first contentful paint, largest contentful paint and first 12 cards ready
- Initial JavaScript bytes, total transferred bytes and request count
- Infinite-scroll append latency from trigger to the next 12 visible cards
- Search/filter response time
- Modal-open to reviewed-insight-ready time
- Thumbnail and catalog-load failure rates

Store raw traces alongside the summarized table. Production statistics should use a durable analytics destination rather than the current tab-local debug buffer.

