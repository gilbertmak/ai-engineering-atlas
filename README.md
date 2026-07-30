# AI Engineering Insight Atlas

AI Engineering Insight Atlas is a Lovable-compatible TanStack Start application for exploring
practical lessons from AI engineering talks. It organises the catalog across six engineering
tracks and presents concise editorial summaries for readers who want the main ideas without
watching every session end to end.

The six tracks are:

- System Design
- Data & Eval
- Reliability
- Observability
- Safety & Control
- Deployment

## What the application provides

- Search and filtering by track, year and topic
- A responsive gallery of source videos
- Accessible detail modals with claims, implications, use cases, caveats and examples
- Direct links to the original YouTube sources
- MCP tools for searching talks, listing tracks and retrieving a talk summary
- Supabase-backed OAuth routes for authenticated MCP access
- Audit events for MCP tool calls

Transcript extraction and review are still in progress. The current summaries are editorial track
syntheses unless a talk has been explicitly reviewed against timestamped evidence. A video appearing
in the catalog does not automatically mean that its summary is transcript-backed.

## Source and rights boundary

The Atlas links to public YouTube sources and does not claim ownership of their videos. All rights
belong to the respective owners.

- Source metadata is verified before it is shown in the catalog.
- Transcript-derived claims require explicit review and timestamped evidence.
- Do not treat editorial track synthesis as speaker-attributed transcript evidence.
- Do not commit raw transcripts, reviewer notes, API keys, OAuth tokens or service-role credentials.
- YouTube Data API credentials belong in trusted server-side or worker environments only.

## Architecture

```text
Browser
  |
  v
TanStack Start application
  |
  +-- six-track video catalog and editorial summaries
  +-- accessible detail modal and YouTube source links
  +-- /auth and Lovable OAuth consent routes
  `-- /mcp read-only tools
        |
        +-- Supabase OAuth issuer and token claims
        +-- audited tool calls
        `-- search_talks, get_talk_summary, list_tracks
```

The MCP surface is read-only. OAuth is issued by Supabase and MCP tools validate authenticated
claims before returning catalog data. The browser never receives a service-role key.

## Technology

- React 19
- TanStack Start and TanStack Router
- TypeScript
- Vite and Nitro
- Tailwind CSS and Radix UI
- Lovable MCP SDK
- Supabase Auth and database types
- Bun for tests

## Local development

### Prerequisites

- Node.js 22
- npm
- Bun for the test suite
- A Lovable/Supabase project when exercising OAuth or MCP routes

### Start the application

```bash
npm ci --include=optional
cp .env.example .env
npm run dev
```

The development server prints its local URL after startup.

Set these values when connecting the app to Lovable Cloud or Supabase:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Only the publishable key may be exposed through a `VITE_` variable. Keep
`SUPABASE_SERVICE_ROLE_KEY` server-side and never commit a populated `.env` file.

`VITE_SITE_URL` controls canonical, sitemap and social-preview URLs. Set it to the final Lovable or
custom deployment origin.

## Validation commands

| Command                  | Purpose                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `npm run typecheck`      | Check TypeScript types                                                                     |
| `npm run lint`           | Run ESLint                                                                                 |
| `npm test`               | Run the Bun test suite                                                                     |
| `npm run evals:validate` | Run the catalog, insight, architecture and privacy gates and write a revision-bound report |
| `npm run build`          | Build the production application                                                           |
| `npm run verify:sources` | Verify catalog source metadata                                                             |
| `npm run format`         | Format project files with Prettier                                                         |

## MCP tools

The MCP manifest exposes three read-only tools:

- `search_talks` searches by free text, track and year.
- `get_talk_summary` returns one talk’s metadata and editorial synthesis.
- `list_tracks` returns the six tracks with talk counts and optional summaries.

The OAuth issuer is the project’s Supabase Auth host. Configure the Lovable MCP manifest and
Supabase project before testing an authenticated client.

## Deployment

Lovable is the primary deployment environment. The production build is created with:

```bash
npm ci --include=optional
npm run build
```

The repository includes Linux optional bindings for Rolldown, Lightning CSS and Tailwind’s native
oxide package so the build can run in glibc and Alpine-based environments.

Before release, verify that:

- Supabase OAuth issuer and audience match the deployed project.
- Server-only secrets are configured through the deployment environment.
- MCP tools return only the intended read-only catalog data.
- Source and transcript claims have the required review evidence.
- Canonical and social URLs point to the final deployment origin.
- `evals/requirements.md`, `evals/manifest.json` and `evals/catalog-baseline.json` match the intended catalog and release scope.
- `artifacts/evals/eval-report.json` is attached to the exact revision and any manual OAuth/browser evidence remains explicitly pending or attached.

## Contribution guardrails

- Preserve the MCP/OAuth/Supabase route and middleware boundaries.
- Do not expose service-role credentials to browser modules.
- Do not add a transcript-backed claim without approved timestamped evidence.
- Keep YouTube source links and rights notices intact.
- Update the independent catalog baseline and insight coverage in the same change as any intentional video addition, removal or correction.
- Treat a missing baseline record, missing video-specific insight or lost MCP/OAuth/Supabase path as a release-blocking regression.
- Do not hand-edit `src/routeTree.gen.ts`; regenerate it through the normal TanStack build.
- Run typecheck, lint, tests and the production build before merging.
