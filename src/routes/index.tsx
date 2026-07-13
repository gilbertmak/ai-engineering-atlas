import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import heroAsset from "@/assets/hero-atlas.png.asset.json";
import { TRACKS, VIDEOS, type Track } from "@/data/videos";

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

function Dashboard() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<Track | "All">("All");
  const [year, setYear] = useState<"All" | number>("All");

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

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between border-b border-ink/20 px-6 py-5">
        <a href="#top" className="flex items-center gap-3">
          <span className="inline-flex h-8 items-center justify-center rounded-sm border border-ink px-2 font-mono text-xs font-medium tracking-wider">
            AI/E
          </span>
          <span className="font-display text-sm font-medium tracking-tight">
            Video Atlas
          </span>
        </a>
        <div className="hidden gap-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:flex">
          <span>Edition 01</span>
          <span>{VIDEOS.length} talks indexed</span>
          <a
            href="https://www.youtube.com/@aiDotEngineer"
            target="_blank"
            rel="noreferrer"
            className="text-ink hover:underline"
          >
            Channel ↗
          </a>
        </div>
      </header>

      {/* HERO */}
      <section
        id="top"
        aria-label="AI Engineer Video Atlas introduction"
        className="mx-auto max-w-[1400px] px-6 pt-8"
      >
        <div className="crosshair border border-ink/90 bg-paper p-3 md:p-5">
          <img
            src={heroAsset.url}
            alt="AI Engineer Video Atlas. Build AI systems that survive reality. Six visual panels represent system design, data & eval, reliability, observability, safety & control, and deployment."
            width={1731}
            height={909}
            className="block h-auto w-full border border-ink/80"
          />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 border-b border-ink/20 pb-10 md:grid-cols-[1fr_1.15fr] md:gap-12">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              // Pilot 01 · Curated
            </span>
            <h1 className="mt-3 font-display text-3xl leading-[0.95] md:text-5xl">
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
            className="flex flex-1 min-w-[260px] items-center gap-3 border border-ink/60 bg-paper px-4 py-3"
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
            <kbd className="hidden rounded-sm border border-ink/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">
              /
            </kbd>
          </label>
          <button
            onClick={() => {
              setQuery("");
              setTrack("All");
              setYear("All");
            }}
            className="border border-ink px-4 py-3 font-mono text-[11px] uppercase tracking-widest hover:bg-ink hover:text-paper"
          >
            Reset
          </button>
        </div>

        {/* Track chips */}
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter by track">
          <TrackChip
            code="00"
            label="All tracks"
            active={track === "All"}
            onClick={() => setTrack("All")}
          />
          {TRACKS.map((t) => (
            <TrackChip
              key={t.code}
              code={t.code}
              label={t.name}
              token={t.token}
              active={track === t.name}
              onClick={() => setTrack(t.name)}
            />
          ))}
          <label className="ml-auto flex items-center gap-2 border border-ink/60 px-3 py-2 font-mono text-[11px] uppercase tracking-widest">
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
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col border border-ink/25 bg-card transition-colors hover:border-ink"
              >
                <div className="relative aspect-video overflow-hidden border-b border-ink/25 bg-muted">
                  <img
                    src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span
                    className="absolute left-3 top-3 border border-ink bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-widest"
                    style={{ color: `var(--${t.token})` }}
                  >
                    {t.code} · {v.track}
                  </span>
                  <span className="absolute bottom-3 right-3 border border-ink bg-ink px-2 py-1 font-mono text-[10px] text-paper">
                    {v.duration}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>
                      {String(i + 1).padStart(2, "0")} / {v.code}
                    </span>
                    <span>{v.year}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg leading-tight">
                    {v.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm text-muted-foreground">
                    {v.speaker} · {v.org}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-ink/15 pt-3 font-mono text-[11px] uppercase tracking-widest">
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
                      Watch ↗
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="border border-dashed border-ink/40 p-12 text-center font-mono text-sm text-muted-foreground">
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
    </div>
  );
}

function TrackChip({
  code,
  label,
  token,
  active,
  onClick,
}: {
  code: string;
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
        "inline-flex items-center gap-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors " +
        (active
          ? "border-ink bg-ink text-paper"
          : "border-ink/40 text-ink hover:border-ink")
      }
    >
      <span
        className="font-mono text-[10px]"
        style={token && !active ? { color: `var(--${token})` } : undefined}
      >
        {code}
      </span>
      {label}
    </button>
  );
}
