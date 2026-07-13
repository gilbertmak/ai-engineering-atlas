import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import heroAsset from "@/assets/hero-atlas.png.asset.json";
import { TRACKS, VIDEOS, type Track, type Video } from "@/data/videos";

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
    claim: "Separate the agent execution loop from domain expertise so each can evolve without tightly coupling the other.",
    implication: "Treat skills, tools, and orchestration primitives as versioned capability packages and keep the runtime deliberately small.",
    whenToUse: "When one system must support many domains or teams without growing a monolithic prompt or runtime.",
    caveat: "Composition adds coordination cost — start monolithic and split only when a boundary has proven itself.",
  },
  "Data & Eval": {
    claim: "Evaluation is a product surface, not a notebook artifact — build it before you scale prompts, models, or agents.",
    implication: "Treat eval datasets as living code: version them, review them, and gate every deploy on measurable behavior.",
    whenToUse: "Whenever a change to a prompt, model, or retrieval pipeline can silently regress user-facing quality.",
    caveat: "Bad evals give false confidence. Invest in dataset curation before chasing higher-fidelity scoring methods.",
  },
  Reliability: {
    claim: "Structure is cheaper than parsing — force the model into schemas the rest of your system can actually depend on.",
    implication: "Wrap LLM calls in typed contracts, retries, and validators so downstream code never negotiates with free text.",
    whenToUse: "When an LLM output feeds another program (tool call, database write, workflow step) rather than a human eye.",
    caveat: "Over-constraining schemas can strangle useful model behavior — leave room for reasoning, not just fields.",
  },
  Observability: {
    claim: "You cannot improve what you cannot see — traces, spans, and evals belong in the same pane as latency and cost.",
    implication: "Instrument every LLM call with inputs, outputs, tool spans, and user feedback so regressions are debuggable.",
    whenToUse: "As soon as a system leaves a single developer's laptop and starts serving real requests.",
    caveat: "Logging raw prompts and completions creates a PII surface — redact and retention-cap before scaling.",
  },
  "Safety & Control": {
    claim: "Guardrails are a system property, not a model property — layer them at input, output, and action boundaries.",
    implication: "Combine policy checks, red-team suites, and refusal audits with the same rigor as security tests.",
    whenToUse: "Any deployment where the model can take actions, quote sources, or reach users you don't personally know.",
    caveat: "Over-cautious guardrails erode trust and usefulness. Measure both false positives and missed harms.",
  },
  Deployment: {
    claim: "Shipping an LLM feature is a latency, cost, and quality tradeoff — pick two explicitly and design for the third.",
    implication: "Route requests across models by task, cache aggressively, and treat model choice as a runtime concern.",
    whenToUse: "Once a prototype needs to serve real traffic under a budget and an SLA rather than a demo audience.",
    caveat: "Premature multi-model routing hides bugs. Prove quality on one model before adding an escape hatch.",
  },
};

function Dashboard() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<Track | "All">("All");
  const [year, setYear] = useState<"All" | number>("All");
  const [open, setOpen] = useState<Video | null>(null);

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
            {String(filtered.length).padStart(2, "0")} results
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

        {/* Grid */}
        <div className="mt-8 grid grid-cols-1 gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v, i) => {
            const t = TRACKS.find((tr) => tr.name === v.track)!;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setOpen(v)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-ink/15 bg-card text-left shadow-[0_10px_30px_-15px_rgba(20,20,40,0.35)] transition-all hover:-translate-y-[2px] hover:border-ink/40 hover:shadow-[0_18px_40px_-15px_rgba(20,20,40,0.45)]"
              >
                <div className="relative aspect-video overflow-hidden border-b border-ink/15 bg-muted">
                  <img
                    src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span
                    className="absolute left-3 top-3 rounded-md border border-ink bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-widest shadow-sm"
                    style={{ color: `var(--${t.token})` }}
                  >
                    {t.code} · {v.track}
                  </span>
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
                {/* silence unused index warning */}
                <span className="hidden">{i}</span>
              </button>
            );
          })}
        </div>

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
          <div className="relative aspect-video overflow-hidden rounded-xl border border-ink/80 bg-ink shadow-inner">
            <img
              src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
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
              className="mt-2 flex items-center justify-between rounded-xl border border-ink bg-ink px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-paper shadow-[0_10px_24px_-12px_rgba(20,20,40,0.6)] hover:-translate-y-[1px]"
            >
              Watch on YouTube
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
      <div className="font-display text-lg leading-snug text-ink">{body}</div>
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
