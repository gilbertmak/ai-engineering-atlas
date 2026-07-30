# Product Design Handoff — Transcript Enrichment and Theme Controls

## Task summary

Defined the UX, interaction, accessibility, and provenance acceptance criteria for enriching the Atlas from one optional track per video to zero-to-many themes, displaying transcript-backed evidence in the detail modal, and simplifying the modal metadata. This is a design handoff only; no product source files were changed.

## Journey and design recommendation

**User goal:** start from a production problem, narrow the Atlas by one or more themes, then decide whether the detail view contains evidence from the talk or only source metadata.

1. The user sees the six hero motifs and the Atlas introduction. Themes are descriptive filters, not a statement that every video has exactly one theme.
2. They select or combine theme filters, or search. Each matching card may show zero, one, or several plain-text theme labels.
3. They open a talk. The modal places the video title and published metadata first, then makes the evidence state immediately legible.
4. If approved transcript evidence is available, the modal displays the evidence text, speaker only when verified by the transcript/source record, and a timestamp link/seek action. If not, it presents a non-attributed metadata-only state and directs the user to the primary YouTube source.

**Recommendation:** use a multi-select, OR-within-themes filter model (a video matches any selected theme) and state the match count in the live result announcement. Retain the hero’s visual motifs solely as iconography. Use neither theme colour nor a numeric/code prefix as semantic information in filters, card theme labels, or the modal eyebrow. This makes labels readable without colour perception and prevents a single editorial classification from looking like source evidence.

## Information architecture and content contract

### Video themes

- A video has `themes: Theme[]`, where the allowed set remains the six existing practical labels. The collection may be empty, and duplicate labels must not render or affect filtering.
- The modal/card presents themes as literal text (for example, `Themes: System Design · Reliability`) or `No theme assigned` when the set is empty. Do not display `01`, `SYS`, `UNCLASSIFIED`, or another implementation/code value.
- A theme is a navigation aid, not transcript evidence and not a speaker statement. It must not use an accent colour to indicate its meaning. The selected control may use the existing high-contrast selected surface, but its state cannot depend on colour alone.

### Evidence basis

- A speaker-attributed assertion may be rendered only when the record supplies approved transcript evidence with: quoted/paraphrased evidence text, a seekable timestamp (seconds), source/transcript identity, transcript review state/date, and a speaker identity explicitly present in the source/transcript record.
- Do not infer a speaker from the title, video description, channel, guest name, anonymous transcript label, or theme. If a transcript has anonymous speakers, show the evidence without a person name (for example, `Transcript excerpt at 12:34`), not an inferred name.
- Editorial synthesis may remain only if Product explicitly retains it, and it must be visually and verbally separated from transcript evidence as `Editorial context — not from the talk`. It must never appear under a label such as Claim, Evidence, Takeaway, or Quote. The preferred migration state is to suppress editorial synthesis from the enriched modal until approved evidence exists.
- Metadata-only content must say `No transcript-backed evidence is available for this talk yet.` It must not display synthetic claim/implication/example/caveat rows that could be mistaken for content from the talk.

### Modal simplification

- Remove the `Source channel:` prefix from the modal description. Keep the useful published date and duration as plain metadata; the title already identifies the selected source.
- Remove the complete `YouTube source` sidebar block.
- Remove `Code`, `Review`, and `Verified` fields and the source-catalog verification date from the modal. Keep one `Open on YouTube` primary-source action.
- Replace the current coloured code/unclassified header with the plain-text theme line above. No `Unclassified` eyebrow or coloured taxonomy label is shown.

## States and interaction rules

| Surface | State | Required behaviour and copy |
| --- | --- | --- |
| Theme filters | None selected | `All themes` is active; all records, including unthemed records, remain eligible. |
| Theme filters | One or more selected | Results match any selected theme. The control exposes checked/pressed state and the result count announces the active selection. A clear-all action returns to all themes. |
| Theme filters | Theme has zero matches in the loaded catalog | Keep the control available and selectable; show `0 results` and the existing reset path. Do not hide a valid theme based on the current search. |
| Card | Zero themes | Show `No theme assigned` as plain text, never a fallback first theme, coloured dot, or `Unclassified` code. |
| Card | One/many themes | Show text labels in stable catalog order. On narrow widths wrap labels; do not truncate a label without an accessible full name. |
| Modal | Transcript-backed | Show an `Evidence from transcript` section before any interpretive content, timestamp formatted `m:ss`/`h:mm:ss`, and a visible evidence-basis note. Timestamp action seeks the embedded player when available; otherwise opens the YouTube URL at the timestamp. |
| Modal | Evidence loading | Reserve the evidence section with a labelled loading state. Do not show editorial fallback content while evidence is loading. |
| Modal | Evidence unavailable/error | Show the metadata-only copy above and the YouTube action. Do not retry or fabricate evidence in the UI. Log an operational error separately from content status. |
| Modal | Transcript exists but lacks approved attribution/timestamp | Render only the approved general evidence state, omit speaker attribution and/or seek action as applicable, and state the missing capability plainly. |
| Modal | Multiple excerpts | Preserve transcript order or an explicitly supplied relevance order; every excerpt carries its own timestamp and attribution eligibility. Do not merge excerpts into a new quotation. |

## Accessible motif icons for search/filter controls

- Replace the small coloured dots in filter controls with six small, consistent line icons derived from the existing hero motifs (for example: architecture grid, evaluation check/list, reliability shield, observability eye/radar, safety lock, deployment arrow/launch). Final glyph mapping must be visually distinct at 16px and documented next to the token mapping.
- Each icon is decorative when adjacent to its visible text: use `aria-hidden="true"`; the text label is the accessible name. Never rely on icon shape alone.
- Filter targets are buttons with an accessible name containing the theme and selected state, minimum 44 by 44 CSS px touch target, visible focus ring, and keyboard activation by Enter and Space.
- Use a grouped control with a programmatic group label such as `Filter by theme`. If multi-select is implemented as toggle buttons, expose `aria-pressed`; if implemented as checkboxes, expose native checkbox semantics. Do not claim a radiogroup when multiple selections are allowed.
- Keep the current `/` search shortcut from firing while a modal, select menu, or editable field owns keyboard focus. On modal close, restore focus to the initiating card; Escape closes the modal.
- Text/icon and selected-state contrast must meet WCAG 2.2 AA (4.5:1 for normal text; 3:1 for non-text indicator/focus boundary). Check default, hover, focus-visible, pressed, disabled, and forced-colors modes.

## Testable acceptance criteria

1. Given a record with `[System Design, Reliability]`, selecting either theme returns the record; selecting both returns it once; clearing filters returns it once.
2. Given a record with `[]`, it appears with no theme filter selected, is excluded when any theme is selected, and displays `No theme assigned` without a code, coloured dot, or unclassified label.
3. Every active/inactive filter has visible text plus a motif icon, a 44px minimum hit target, keyboard activation, visible focus, and a programmatically exposed selected state. Screen-reader output does not depend on the icon or colour.
4. The filter controls contain no colour-dot element, and modal/card theme labels use no theme colour or numeric/code prefix.
5. The modal contains neither `Source channel:`, a `YouTube source` section, nor `Code:`, `Review:`, or `Verified:` fields. `Open on YouTube` remains available and opens the exact video in a new tab.
6. For approved transcript evidence, the modal displays each excerpt with its exact supplied timestamp, evidence-basis label, and a speaker name only if supplied as verified transcript/source metadata. Activating the timestamp seeks/opens the same video at that time.
7. For no transcript evidence, delayed evidence, failed evidence load, anonymous speaker labels, and missing timestamp, the interface never presents a named speaker quotation or speaker-attributed insight. It uses the defined metadata-only/loading/error copy and remains usable.
8. Editorial material, if retained, is labelled `Editorial context — not from the talk` adjacent to the material and is never mixed into transcript evidence or labelled as a claim/quote/takeaway.
9. At 320px and 200% browser zoom, filters wrap without overlap, every label remains discoverable, modal controls remain reachable, and modal focus is trapped/restored correctly.
10. Visual regression covers light/default theme, reduced motion, forced-colors/high contrast, zero/one/many themes, no results, transcript-backed, metadata-only, error, and multiple-excerpt modal states.

## Key facts

- The current route has a single `track` filter and uses coloured dots/tokens in chips, cards, and the modal.
- The current detail modal labels content as editorial track synthesis and already states it is not a transcript summary, but its claim-like content structure remains too easy to scan as source-derived content.
- The existing catalog contract intentionally permits new approved uploads to be metadata-only and unthemed; transcript/Hermes review is outside automatic source discovery.

## Assumptions

- Product intends themes to remain the six current practical categories and intends OR matching for a multi-select filter. AND matching or a new uncontrolled taxonomy needs a Product decision.
- A future transcript-evidence record can supply stable timestamp seconds, transcript/review identity, approval state, and speaker-attribution eligibility; the current public catalog does not yet expose this contract.
- The existing hero image is retained and provides an appropriate visual language for non-semantic decorative filter icons.

## Risks and caveats

- The highest risk is provenance laundering: summary copy, inferred speakers, or a theme classification can look like a statement by the video guest. Treat absence of approved transcript evidence as a fail-closed content state.
- More than one theme can increase filter complexity; the OR rule and visible selection count must be tested with search and year filters together.
- Timestamp seeking depends on the embedded YouTube player and caption/video availability. A timestamped outbound YouTube URL is the accessible functional fallback.
- Do not communicate source verification through removed UI fields; release/source verification belongs in the catalog pipeline and audit evidence, not as unhelpful modal metadata.

## Dependencies and handoffs

- **Full-stack developer:** evolve the video/projection and modal evidence contract before rendering; implement icon components, multi-select semantics, timestamp action, and fail-closed evidence state. Preserve existing user changes and avoid automatic editorial-to-transcript promotion.
- **QA:** add DOM and keyboard tests for zero-to-many filtering, provenance states, removal criteria, focus return, and icon accessible names; execute visual checks at desktop/mobile/200%/forced-colors.
- **Business Analyst/Product:** confirm taxonomy governance, OR vs AND behaviour, and the authoritative transcript-review fields/approval workflow.
- **Transformation:** update any onboarding/help copy to explain that themes aid discovery and evidence status determines attribution.

## Validation

- Reviewed `src/routes/index.tsx`, `src/data/videos.ts`, the hero/token styles, and migration handoffs from Full-stack and QA.
- No source, configuration, or deployment files were changed. Runtime/browser verification remains for the implementation team after the data and UI changes land.

## Decision points

| Decision Point | Options | Recommendation | Confidence | Impact If Wrong | Owner Needed |
| --- | --- | --- | --- | --- | --- |
| Multi-theme match logic | OR; AND | OR across selected themes | High | Relevant talks disappear under combined discovery filters | Product Manager |
| Editorial synthesis after modal enrichment | Suppress until evidence; retain with explicit adjacent label | Suppress from enriched modal unless there is a distinct editorial-context need | High | Users mistake editorial copy for speaker evidence | Product + Hermes owner |
| Evidence data contract | Transcript text + timestamp only; add review/source/speaker-attribution fields | Require review/source identity and explicit attribution eligibility in addition to text/timestamp | High | Unsupported speaker claims or non-auditable evidence | Hermes owner + Solution Architecture |

