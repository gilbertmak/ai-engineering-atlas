import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import heroAsset from "@/assets/hero-atlas.png.asset.json";
import { TRACKS, VIDEOS, type Track, type Video } from "@/data/videos";
import { trackEvent, logClientError } from "@/lib/analytics";

const SCROLL_KEY = "atlas:scroll-v1";

function placeholderThumb(v: Video, token: string) {
  // Deterministic SVG placeholder when the YouTube thumbnail is unavailable.
  // Uses the track color and encodes speaker initials + video code so the
  // card still communicates identity without a fetched image.
  const initials = v.speaker
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const color = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim() || "#1a1a2a";
  const svg = `<?xml version='1.0' encoding='UTF-8'?>
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360' role='img'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${color}' stop-opacity='0.95'/>
      <stop offset='100%' stop-color='#0f0f14' stop-opacity='0.95'/>
    </linearGradient>
    <pattern id='dots' width='16' height='16' patternUnits='userSpaceOnUse'>
      <circle cx='1' cy='1' r='1' fill='#ffffff' fill-opacity='0.08'/>
    </pattern>
  </defs>
  <rect width='640' height='360' fill='url(#g)'/>
  <rect width='640' height='360' fill='url(#dots)'/>
  <text x='40' y='90' font-family='ui-monospace, monospace' font-size='16' fill='#ffffff' fill-opacity='0.7' letter-spacing='4'>${v.code.toUpperCase()} · ${v.year}</text>
  <text x='40' y='210' font-family='ui-serif, Georgia, serif' font-size='120' font-weight='700' fill='#ffffff'>${initials || "AI"}</text>
  <text x='40' y='300' font-family='ui-sans-serif, system-ui' font-size='20' fill='#ffffff' fill-opacity='0.85'>${escapeXml(v.speaker)}</text>
  <text x='40' y='328' font-family='ui-sans-serif, system-ui' font-size='14' fill='#ffffff' fill-opacity='0.6'>${escapeXml(v.track)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));
}

function Thumbnail({ video, token, eager }: { video: Video; token: string; eager: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const src = errored
    ? placeholderThumb(video, token)
    : `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted" aria-hidden />
      )}
      <img
        src={src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!errored) {
            logClientError("thumbnail_failed", {
              videoId: video.youtubeId,
              code: video.code,
              speaker: video.speaker,
            });
            setErrored(true);
            setLoaded(true);
          }
        }}
        className={
          "h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.03] " +
          (loaded ? "opacity-100" : "opacity-0")
        }
      />
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ink/15 bg-card shadow-[0_10px_30px_-15px_rgba(20,20,40,0.35)]">
      <div className="aspect-video animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        property: "og:image",
        content: `https://id-preview--479a156a-0221-4e65-9751-9ad7cb8bd539.lovable.app${heroAsset.url}`,
      },
      {
        name: "twitter:image",
        content: `https://id-preview--479a156a-0221-4e65-9751-9ad7cb8bd539.lovable.app${heroAsset.url}`,
      },
    ],
  }),
  component: Dashboard,
});

const TRACK_SUMMARIES: Record<Track, { claim: string; implication: string; whenToUse: string; caveat: string }> = {
  "System Design": {
    claim:
      "The interesting design decision in an LLM system is not the model — it's the boundary between the agent's execution loop and the domain-specific expertise it draws on. Keep the loop small, generic, and inspectable; move the knowledge, tools, and policies into versioned skills you can review and swap independently. Systems that survive teams and model upgrades treat orchestration as infrastructure and expertise as content.",
    implication:
      "Treat every capability (a tool call, a retrieval strategy, a domain-specific playbook) as a first-class artifact with a version, an owner, an eval, and a rollback story. The runtime becomes thin — a scheduler for skills — and each skill can evolve, be A/B tested, or be retired without touching the surrounding system. This also makes on-call diagnosable: a regression maps to a specific skill version, not a monolithic prompt no one dares to change.",
    whenToUse:
      "Reach for this pattern once a single agent starts serving multiple domains, once more than one team contributes to prompts, or once you find yourself branching one giant system prompt on user attributes. It is also the right shape when compliance or safety reviewers need to sign off on capabilities in isolation rather than reading a 12-page monolithic prompt.",
    caveat:
      "Every abstraction has a coordination cost. Splitting too early creates ceremony without payoff — three skills owned by one engineer is just three files. Start monolithic, extract a skill only when a real seam has appeared (a second consumer, a distinct owner, a divergent eval), and be honest about which skills are load-bearing versus decorative.",
  },
  "Data & Eval": {
    claim:
      "Evaluation is a product surface, not a notebook artifact. The talks that hold up in production frame evals the way backend engineers frame tests: they are the thing that lets you change the system safely. If you cannot measure a regression, you cannot ship an improvement — you can only ship vibes and hope the next user is generous.",
    implication:
      "Treat eval datasets as living code. Version them, review them in PRs, grow them from real production traces, and gate every deploy on a set of behaviors that matter to the business. Combine cheap heuristic checks with human-labeled slices and LLM-as-judge only where it has itself been calibrated against humans. The output is not a single accuracy number; it's a dashboard of behaviors you refuse to regress.",
    whenToUse:
      "Any time a change to a prompt, model, retrieval pipeline, or tool schema can silently degrade user-facing quality. That is essentially every change in an LLM system. Adopt evals before scaling traffic, before swapping models, and before letting more than one person edit the prompt — retrofitting evals under production pressure is where teams stall.",
    caveat:
      "Bad evals are worse than no evals: they encode false confidence. A benchmark that looks green while users churn is telling you your dataset is off, not that your system is good. Invest in dataset curation, labeled failure modes, and honest sampling from production before chasing more sophisticated scoring — an LLM judge on top of a shallow dataset just launders bad taste into a number.",
  },
  Reliability: {
    claim:
      "Structure is cheaper than parsing. The moment an LLM output feeds another program, free text becomes a liability — you are one unlucky sampling away from a runtime exception, a corrupted row, or a silently wrong tool call. Force the model into schemas the rest of the system can depend on, and reliability stops being a prayer and starts being a property.",
    implication:
      "Wrap every LLM call in typed contracts, validators, and bounded retries. Use structured-output APIs where they exist, function/tool schemas where they don't, and a small validation + repair loop for the edges. Downstream code should never negotiate with the model — it should consume a validated object or fail closed with a legible error you can trace.",
    whenToUse:
      "Any path where an LLM decision drives a tool call, a database write, a workflow branch, or a UI component with fixed props. Also whenever you find yourself writing regex to extract fields out of a completion — that is the signal to move the constraint upstream into the model call itself.",
    caveat:
      "Over-constraining schemas can strangle useful reasoning. If every field is required and every enum is closed, the model will fabricate to satisfy the shape instead of surfacing uncertainty. Leave room for 'unknown', 'needs_human', and short free-text rationale fields — reliability is about predictable failure modes, not fake certainty.",
  },
  Observability: {
    claim:
      "You cannot improve what you cannot see, and in LLM systems 'see' means more than latency and error rate. Prompts, tool spans, retrieved chunks, model versions, user feedback, and eval scores all belong in the same pane as your existing SRE signals. Observability is the difference between debugging a regression in an afternoon and rewriting the prompt on a hunch at 2am.",
    implication:
      "Instrument every LLM call with the inputs, outputs, tool spans, model version, and user or automated feedback tied back to a trace ID. Feed those traces into your eval sets, your error triage, and your product analytics. When quality drops, you should be able to filter to the exact 200 traces that changed and diff them against last week.",
    whenToUse:
      "The moment a system leaves one developer's laptop and starts serving real requests — even internal traffic counts. Retrofitting tracing after an incident is expensive and lossy; the cheapest time to add it is before you need it, and the second-cheapest is right now.",
    caveat:
      "Logging raw prompts and completions creates a PII and IP surface that legal will care about eventually. Bake in redaction, per-tenant retention limits, and access controls from day one. An observability system that leaks user data is a bigger incident than the bug it was meant to help you find.",
  },
  "Safety & Control": {
    claim:
      "Guardrails are a system property, not a model property. No single prompt, classifier, or fine-tune is going to make an agent safe on its own — safety comes from layered checks at the input, the output, and the action boundary, plus the humility to fail closed when any layer is uncertain. Treat it the way you treat security: defense in depth, assumed breach.",
    implication:
      "Combine policy checks, refusal audits, red-team suites, and human-in-the-loop escalation with the same rigor you apply to authz and secrets. Every high-impact action (payments, emails, deletions, external calls) should have an explicit allowlist, a rate limit, and a reversible path. Measure not only what you blocked but what you should have blocked and didn't.",
    whenToUse:
      "Any deployment where the model can take actions with real-world consequences, quote external sources users will trust, or reach users you don't personally know. That includes internal tools once they touch production data — 'it's just for the team' is where most incidents start.",
    caveat:
      "Over-cautious guardrails erode trust and usefulness faster than most teams admit. A model that refuses half of legitimate requests trains users to route around it, which is worse than a permissive system with good audit trails. Measure false positives and user friction alongside missed harms, and be willing to loosen when the data supports it.",
  },
  Deployment: {
    claim:
      "Shipping an LLM feature is a latency, cost, and quality tradeoff — pick two explicitly and design for the third. Every architectural choice, from model selection to caching to prompt length, is a move along that triangle. Teams that try to optimize all three at once end up with a system that is mediocre at all three and expensive to reason about.",
    implication:
      "Route requests across models by task, cache aggressively at the semantic layer, and treat model choice as a runtime concern behind a stable interface. Instrument p50/p95 latency and cost-per-request alongside quality metrics, and set explicit SLOs so tradeoffs are made deliberately rather than accidentally when the bill arrives.",
    whenToUse:
      "Once a prototype needs to serve real traffic under a budget and an SLA rather than a demo audience. The transition from 'it works in the notebook' to 'it works at 100 QPS at a price the business can absorb' is where most projects discover they built for the wrong point on the triangle.",
    caveat:
      "Premature multi-model routing hides bugs and makes evals harder — a regression in one model in one route can look like noise. Prove quality on a single model with clean traces first, then add routing as an escape hatch with its own tests. Complexity in the serving path should be earned, not assumed.",
  },
};


function Dashboard() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<Track | "All">("All");
  const [year, setYear] = useState<"All" | number>("All");
  const [open, setOpen] = useState<Video | null>(null);

  // Brief initial-load state so users see structure (skeletons) instead of a
  // pop-in of fully-rendered cards. Also gives images a beat to warm up.
  const [booting, setBooting] = useState(true);

  const years = useMemo(
    () => Array.from(new Set(VIDEOS.map((v) => v.year))).sort((a, b) => b - a),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VIDEOS.filter((v) => {
      if (track !== "All" && v.track !== track) return false;
      if (year !== "All" && v.year !== year) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.speaker.toLowerCase().includes(q) ||
        v.org.toLowerCase().includes(q) ||
        v.track.toLowerCase().includes(q)
      );
    });
  }, [query, track, year]);

  const PAGE_SIZE = 12;
  // Restore visibleCount from sessionStorage so returning to the page keeps
  // the same amount of content mounted — otherwise a scroll restore would
  // land past the end of the rendered grid.
  const [visibleCount, setVisibleCount] = useState<number>(() => {
    if (typeof window === "undefined") return PAGE_SIZE;
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { count?: number };
        if (parsed.count && parsed.count > PAGE_SIZE) return parsed.count;
      }
    } catch {}
    return PAGE_SIZE;
  });
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const restoredScrollRef = useRef(false);

  useEffect(() => {
    // End the boot skeleton on the next frame after mount.
    const id = requestAnimationFrame(() => setBooting(false));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reset pagination whenever the filtered set changes so users always start
  // from the top of the new result list. Skip on the very first render so we
  // don't stomp the restored visibleCount from sessionStorage.
  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    // Reset pagination so the new result set starts at PAGE_SIZE, but keep
    // the user's current scroll position — jumping to top on every keystroke
    // is jarring while searching.
    setVisibleCount(PAGE_SIZE);
  }, [query, track, year]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, filtered.length]);

  // Persist scroll position (throttled via rAF) and restore once the grid has
  // rendered enough cards to reach the saved offset.
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(
            SCROLL_KEY,
            JSON.stringify({ y: window.scrollY, count: visibleCount }),
          );
        } catch {}
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visibleCount]);

  useEffect(() => {
    if (restoredScrollRef.current || booting) return;
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      if (!raw) {
        restoredScrollRef.current = true;
        return;
      }
      const { y } = JSON.parse(raw) as { y?: number };
      if (typeof y === "number" && y > 0) {
        // Wait a frame so the grid has painted before jumping.
        requestAnimationFrame(() => window.scrollTo({ top: y }));
      }
      restoredScrollRef.current = true;
    } catch {
      restoredScrollRef.current = true;
    }
  }, [booting]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);


  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between border-b border-ink/20 px-6 py-5">
        <a href="#top" className="flex items-center gap-3">
          <span className="inline-flex h-8 items-center justify-center rounded-md border border-ink px-2 font-mono text-xs font-medium tracking-wider">
            AI/E
          </span>
          <span className="font-display text-sm font-medium tracking-tight">
            Video Atlas
          </span>
        </a>
        <a
          href="https://www.youtube.com/@aiDotEngineer"
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] uppercase tracking-widest text-ink hover:underline"
        >
          Channel ↗
        </a>
      </header>

      {/* HERO */}
      <section
        id="top"
        aria-label="AI Engineer Video Atlas introduction"
        className="mx-auto max-w-[1400px] px-6 pt-8"
      >
        <div className="crosshair rounded-xl border border-ink/90 bg-paper p-3 shadow-[0_20px_60px_-20px_rgba(20,20,40,0.25)] md:p-5">
          <img
            src={heroAsset.url}
            alt="AI Engineer Video Atlas. Build AI systems that survive reality. Six visual panels represent system design, data & eval, reliability, observability, safety & control, and deployment."
            width={1731}
            height={909}
            className="block h-auto w-full rounded-lg border border-ink/80"
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 border-b border-ink/20 pb-10 md:grid-cols-[1fr_1.15fr] md:gap-12">
          <div>
            <h1 className="font-display text-3xl leading-[0.95] md:text-5xl">
              Every AI Engineer talk, mapped to the pattern it teaches.
            </h1>
          </div>
          <p className="max-w-xl self-end font-sans text-base leading-relaxed text-muted-foreground md:ml-[10%] md:text-lg">
            The AI Engineer conference ships hundreds of talks a year. This
            atlas keeps only the ones that survived contact with production —
            grouped by the six tracks that decide whether your system holds up
            on Tuesday.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section
        aria-labelledby="explore-title"
        className="mx-auto max-w-[1400px] px-6 pt-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Browse the atlas
            </span>
            <h2
              id="explore-title"
              className="mt-2 font-display text-2xl md:text-3xl"
            >
              Find the talk behind the problem.
            </h2>
          </div>
          <span
            aria-live="polite"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
          >
            {String(visible.length).padStart(2, "0")} / {String(filtered.length).padStart(2, "0")} results
          </span>
        </div>

        {/* Search */}
        <div className="mt-6 flex flex-wrap gap-3">
          <label
            htmlFor="atlas-search"
            className="flex flex-1 min-w-[260px] items-center gap-3 rounded-xl border border-ink/20 bg-card px-4 py-3 shadow-[0_8px_24px_-12px_rgba(20,20,40,0.25)] transition-shadow focus-within:shadow-[0_12px_32px_-12px_rgba(20,20,40,0.35)]"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Search
            </span>
            <input
              id="atlas-search"
              type="search"
              placeholder='Try "evals" or "agents" or "RAG"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent font-sans text-sm text-ink outline-none placeholder:text-muted-foreground/70"
            />
            <kbd className="hidden rounded-md border border-ink/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
              /
            </kbd>
          </label>
          <button
            onClick={() => {
              setQuery("");
              setTrack("All");
              setYear("All");
            }}
            className="rounded-xl border border-ink bg-ink px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-paper shadow-[0_8px_24px_-12px_rgba(20,20,40,0.5)] transition-transform hover:-translate-y-[1px]"
          >
            Reset
          </button>
        </div>

        {/* Track chips */}
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter by track">
          <TrackChip
            label="All tracks"
            active={track === "All"}
            onClick={() => setTrack("All")}
          />
          {TRACKS.map((t) => (
            <TrackChip
              key={t.code}
              label={t.name}
              token={t.token}
              active={track === t.name}
              onClick={() => setTrack(t.name)}
            />
          ))}
          <label className="ml-auto flex items-center gap-2 rounded-xl border border-ink/20 bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-widest shadow-[0_6px_18px_-12px_rgba(20,20,40,0.25)]">
            Year
            <select
              value={year}
              onChange={(e) =>
                setYear(e.target.value === "All" ? "All" : Number(e.target.value))
              }
              className="bg-transparent font-mono text-[11px] outline-none"
            >
              <option value="All">All</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Grid — only `visible` slice is mounted; sentinel below reveals more */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {booting
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => <CardSkeleton key={`sk-${i}`} />)
            : visible.map((v, i) => {
                const t = TRACKS.find((tr) => tr.name === v.track)!;
                const eager = i < 3;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setOpen(v)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-ink/15 bg-card text-left shadow-[0_10px_30px_-15px_rgba(20,20,40,0.35)] transition-all hover:-translate-y-[2px] hover:border-ink/40 hover:shadow-[0_18px_40px_-15px_rgba(20,20,40,0.45)]"
                  >
                    <div className="relative aspect-video overflow-hidden border-b border-ink/15 bg-muted">
                      <Thumbnail video={v} token={t.token} eager={eager} />
                      <span className="absolute bottom-3 right-3 rounded-md border border-ink bg-ink px-2 py-1 font-mono text-[10px] text-paper shadow-sm">
                        {v.duration}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span>{v.code}</span>
                        <span>{v.year}</span>
                      </div>
                      <h3 className="mt-2 font-display text-lg leading-tight">
                        {v.title}
                      </h3>
                      <p className="mt-2 font-sans text-sm text-muted-foreground">
                        {v.speaker} · {v.org}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3 font-mono text-[11px] uppercase tracking-widest">
                        <span
                          className="inline-flex items-center gap-2"
                          style={{ color: `var(--${t.token})` }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: `var(--${t.token})` }}
                          />
                          {t.name}
                        </span>
                        <span className="text-ink group-hover:underline">
                          Summary →
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
          {!booting && hasMore &&
            Array.from({ length: Math.min(3, filtered.length - visibleCount) }).map((_, i) => (
              <CardSkeleton key={`sk-more-${i}`} />
            ))}
        </div>

        {/* Sentinel — IntersectionObserver reveals the next page when it
            approaches the viewport. When exhausted, shows an end marker. */}
        {!booting && hasMore ? (
          <div ref={sentinelRef} aria-hidden="true" className="mt-10 flex justify-center pb-24">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Loading more talks…
            </span>
          </div>
        ) : (
          !booting && filtered.length > 0 && (
            <div className="mt-10 flex justify-center pb-24">
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                End of atlas · {filtered.length} talks
              </span>
            </div>
          )
        )}


        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink/40 p-12 text-center font-mono text-sm text-muted-foreground">
            No talks match. Try resetting filters.
          </div>
        )}
      </section>


      <footer className="border-t border-ink/20">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-6 py-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>© Video Atlas · fixture edition</span>
          <span>Built for engineers who ship on Tuesday</span>
        </div>
      </footer>

      {open && <SummaryModal video={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TrackChip({
  label,
  token,
  active,
  onClick,
}: {
  label: string;
  token?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 font-mono text-[11px] uppercase tracking-widest transition-all " +
        (active
          ? "border-ink bg-ink text-paper shadow-[0_8px_20px_-10px_rgba(20,20,40,0.6)]"
          : "border-ink/20 bg-card text-ink shadow-[0_4px_14px_-10px_rgba(20,20,40,0.35)] hover:-translate-y-[1px] hover:border-ink/50")
      }
    >
      {token && !active && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: `var(--${token})` }}
        />
      )}
      {label}
    </button>
  );
}




function SummaryModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const t = TRACKS.find((tr) => tr.name === video.track)!;
  const s = TRACK_SUMMARIES[video.track];
  
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Summary of ${video.title}`}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm md:p-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1100px] overflow-hidden rounded-2xl border border-ink/20 bg-paper shadow-[0_40px_80px_-20px_rgba(20,20,40,0.55)]"
      >
        {/* Modal header bar */}
        <div className="flex items-center justify-between border-b border-ink/15 bg-card px-6 py-3">
          <span
            className="font-mono text-[11px] uppercase tracking-widest"
            style={{ color: `var(--${t.token})` }}
          >
            {video.code.toUpperCase()} · {t.code} {video.track}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-ink"
          >
            Close ✕
          </button>
        </div>

        {/* Hero row */}
        <div className="grid grid-cols-1 gap-6 border-b border-ink/15 p-6 md:grid-cols-[1.05fr_1fr] md:p-8">
          <div>
            <h2 className="font-display text-3xl leading-[1.02] md:text-4xl">
              {video.title}
            </h2>
            <p className="mt-4 font-sans text-sm text-muted-foreground">
              A talk by <span className="text-ink">{video.speaker}</span> ·{" "}
              {video.org} · {video.year} · {video.duration}
            </p>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-ink/80 bg-ink shadow-[0_20px_50px_-20px_rgba(20,20,40,0.55)]">
            <EmbeddedPlayer video={video} />
          </div>
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_320px]">
          <div className="divide-y divide-ink/10">
            <Row label="Claim" body={s.claim} />
            <Row label="Implication" body={s.implication} />
            <Row label="When to use" body={s.whenToUse} />
            <Row
              label="Example"
              body={
                <div className="rounded-xl border border-ink/20 bg-card p-4 shadow-[0_8px_24px_-16px_rgba(20,20,40,0.35)]">
                  <div
                    className="font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: `var(--${t.token})` }}
                  >
                    Illustrative scenario
                  </div>
                  <p className="mt-2 font-display text-lg leading-snug">
                    Applying "{video.title}" in a production team.
                  </p>
                  <div className="mt-3 border-t border-ink/10 pt-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      What this makes visible
                    </div>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      Engineering teams can adopt the pattern without rewriting
                      surrounding infrastructure, and can measure whether the
                      change actually improves the metric it was chosen for.
                    </p>
                  </div>
                </div>
              }
            />
            <Row label="Caveat" body={<span className="text-[color:var(--track-5)]">{s.caveat}</span>} />
          </div>

          {/* Sidebar */}
          <aside className="border-t border-ink/15 bg-card p-6 md:border-l md:border-t-0">
            <SideBlock label="Track">
              <span
                className="inline-flex items-center gap-2 font-display text-base"
                style={{ color: `var(--${t.token})` }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: `var(--${t.token})` }}
                />
                {t.code} · {video.track}
              </span>
            </SideBlock>
            <SideBlock label="Speaker">
              <div className="font-display text-base">{video.speaker}</div>
              <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {video.org}
              </div>
            </SideBlock>
            <SideBlock label="Record status">
              <div className="font-sans text-sm">Year: {video.year}</div>
              <div className="font-sans text-sm">Duration: {video.duration}</div>
              <div className="font-sans text-sm">Code: {video.code}</div>
            </SideBlock>

            <a
              href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex w-full items-center justify-between rounded-xl border border-ink bg-ink px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-paper shadow-[0_10px_24px_-12px_rgba(20,20,40,0.6)] transition-transform hover:-translate-y-[1px]"
            >
              Open on YouTube
              <span>↗</span>
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}


function Row({ label, body }: { label: string; body: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-[140px_1fr] md:px-8">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="font-sans text-[15px] leading-relaxed text-ink">{body}</div>
    </div>
  );
}


function SideBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 border-b border-ink/10 pb-4 last:border-b-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
