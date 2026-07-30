# AI Engineering Insight Atlas

AI Engineering Insight Atlas is a personal learning project for exploring practical lessons from
AI engineering talks. It organises videos across six domains and presents concise summaries for
readers who want the main engineering ideas without watching every session end to end.

The six domains are:

- System Design
- Data & Eval
- Reliability
- Observability
- Safety & Control
- Deployment

## What the Atlas provides

- Search and filtering by theme, year and topic
- A responsive gallery of source videos
- Modal summaries with practical implications, use cases and caveats
- Timestamped references where reviewed transcript evidence is available
- Direct links to the original YouTube videos
- A versioned catalog API with a bundled last-known-good fallback

Transcript extraction and review are still in progress. A video appearing in the catalog does not
automatically mean that its insight summary is transcript-backed.

## Evidence and source boundaries

The public application consumes a reviewed catalog projection. It does not expose raw discovery
candidates, credentials, reviewer notes or private transcript files.

- Source discovery uses the official YouTube Data API for public metadata.
- Discovery results remain private candidates until they pass review and publication controls.
- Transcript-derived evidence is published only after its video identity, digest, review state,
  rights state and timestamps pass validation.
- Metadata-only records must not be presented as transcript-backed insight.
- A YouTube Data API key does not grant access to caption downloads. Caption operations require
  separate OAuth authorisation.

All video rights belong to their respective owners. The Atlas links back to the original sources.

## Technology

- React 19
- TanStack Start and TanStack Router
- TypeScript
- Vite
- Tailwind CSS
- Nitro
- Bun for tests and local worker scripts
- Lovable-compatible deployment configuration

## Local development

### Prerequisites

- Node.js 22
- npm
- Bun 1.2.21 or a compatible version for tests and worker scripts

### Start the application

```bash
npm ci --include=optional
cp .env.example .env
npm run dev
```

The development server prints its local URL after startup.

`VITE_SITE_URL` controls canonical, sitemap and social-preview URLs. Set it to the final Lovable or
custom deployment origin.

Never place API keys or other secrets in a `VITE_` environment variable. Vite exposes those values
to browser code.

## Validation commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Bun test suite |
| `npm run build` | Build the production application |
| `npm run verify:sources` | Verify catalog source metadata |
| `npm run build:transcript-projection` | Build a reviewed local transcript projection |
| `npm run discover:sources` | Discover metadata candidates using the official YouTube API |

Run the production-readiness checks with:

```bash
./ops/validate-production-readiness.sh
```

## Architecture

```text
Browser
  |
  v
TanStack application
  |
  +-- reviewed catalog API
  |     |
  |     +-- persisted versioned projection
  |     `-- bundled last-known-good fallback
  |
  `-- public YouTube source links

Private worker environment
  |
  +-- paced YouTube metadata discovery
  +-- review-required candidate handoff
  `-- validated transcript projection build
```

The browser has no discovery credentials and no publication capability. Discovery and transcript
processing are separate server-side workflows that fail closed when required evidence or review
state is missing.

## Deployment

The application is designed to build in Lovable and GitHub Actions using:

```bash
npm ci --include=optional
npm run build
```

Linux native packages used by Rolldown, Lightning CSS and Tailwind are declared as optional
dependencies for glibc and Alpine-compatible builds.

A hardened local Docker deployment is also available:

```bash
cp .env.example .env
docker compose up --build
```

Docker Compose binds the service to `127.0.0.1` by default. Keep it private until a separately
reviewed TLS proxy and access-control boundary are in place.

## Project documentation

- [Catalog API](docs/catalog-api.md)
- [Source discovery](docs/source-discovery.md)
- [Transcript enrichment](docs/transcript-enrichment.md)
- [Operations and recovery](docs/operations.md)
- [Transcript processing handoff](docs/transcript-processing-handoff-2026-07-30.md)
- [Project-local transcript batch skill](skills/atlas-transcript-batch/SKILL.md)

## Contribution guardrails

- Do not commit API keys, OAuth tokens, raw transcripts or private discovery state.
- Do not publish a transcript-backed claim without approved timestamped evidence.
- Keep discovery candidates separate from the public catalog projection.
- Preserve the generated TanStack route tree by editing route files rather than
  `src/routeTree.gen.ts`.
- Run typecheck, lint, tests and the production build before merging.
