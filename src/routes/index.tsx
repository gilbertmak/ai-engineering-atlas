import { createFileRoute } from "@tanstack/react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SOURCE_CATALOG_VERIFIED_AT,
  TRACKS,
  VIDEOS,
  videoDuration,
  videoPublishedDate,
  videoYear,
  type Track,
  type Video,
} from "@/data/videos";
import { TRACK_EXAMPLES, TRACK_SUMMARIES, type IllustrativeExample } from "@/data/summaries";

import { trackEvent, logClientError, perfMark } from "@/lib/analytics";
import { siteUrl } from "@/lib/site";

const SCROLL_KEY = "atlas:scroll-v1";

function placeholderThumb(v: Video, token: string) {
  // Deterministic SVG placeholder when the YouTube thumbnail is unavailable.
  // Uses the track color and encodes channel initials + video code so the
  // card still communicates identity without a fetched image.
  const initials = v.sourceChannel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const color =
    getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim() || "#1a1a2a";
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
  <text x='40' y='90' font-family='ui-monospace, monospace' font-size='16' fill='#ffffff' fill-opacity='0.7' letter-spacing='4'>${v.code.toUpperCase()} · ${videoYear(v)}</text>
  <text x='40' y='210' font-family='ui-serif, Georgia, serif' font-size='120' font-weight='700' fill='#ffffff'>${initials || "AI"}</text>
  <text x='40' y='300' font-family='ui-sans-serif, system-ui' font-size='20' fill='#ffffff' fill-opacity='0.85'>${escapeXml(v.sourceChannel)}</text>
  <text x='40' y='328' font-family='ui-sans-serif, system-ui' font-size='14' fill='#ffffff' fill-opacity='0.6'>${escapeXml(v.track)}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
  return s.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
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
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted"
          aria-hidden
        />
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
              sourceChannel: video.sourceChannel,
            });
            setErrored(true);
            setLoaded(true);
          }
        }}
        className={
          "h-full w-full object-cover transition-all duration-500 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none " +
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
      { property: "og:url", content: siteUrl("/") },
      {
        property: "og:image",
        content: siteUrl("/hero-atlas.webp"),
      },
      {
        name: "twitter:image",
        content: siteUrl("/hero-atlas.webp"),
      },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${siteUrl("/")}#website`,
              url: siteUrl("/"),
              name: "AI Engineering Insight Atlas",
              description: "Explore practical industry insights across six engineering domains.",
              inLanguage: "en",
            },
            {
              "@type": "CollectionPage",
              "@id": `${siteUrl("/")}#collection`,
              url: siteUrl("/"),
              name: "AI Engineering Insight Atlas",
              isPartOf: { "@id": `${siteUrl("/")}#website` },
              mainEntity: { "@id": `${siteUrl("/")}#talks` },
            },
            {
              "@type": "ItemList",
              "@id": `${siteUrl("/")}#talks`,
              name: "AI engineering talks",
              numberOfItems: VIDEOS.length,
              itemListElement: VIDEOS.map((video, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
                item: {
                  "@type": "VideoObject",
                  name: video.title,
                  description: `${video.title} from ${video.sourceChannel}.`,
                  uploadDate: video.publishedAt,
                  duration: isoDuration(video.durationSeconds),
                  thumbnailUrl: `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`,
                  contentUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
                  embedUrl: `https://www.youtube.com/embed/${video.youtubeId}`,
                },
              })),
            },
          ],
        },
      },
    ],
    links: [
      { rel: "canonical", href: siteUrl("/") },
      { rel: "preload", href: "/hero-atlas.webp", as: "image", fetchPriority: "high" },
    ],
  }),
  component: Dashboard,
});

function isoDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `PT${hours ? `${hours}H` : ""}${minutes ? `${minutes}M` : ""}${seconds ? `${seconds}S` : ""}`;
}

type ContentBasis = "track_synthesis" | "transcript_backed";

type TalkInsight = {
  claim: string;
  implication: string;
  whenToUse: string;
  caveat: string;
  example: IllustrativeExample;
  contentBasis: ContentBasis;
  timestampSeconds: number | null;
  reviewedAt: string | null;
};

// Populate only after a talk has been reviewed against a timestamped source.
// Until then the UI deliberately falls back to an editorial track synthesis.
const TALK_INSIGHTS: Partial<Record<Video["id"], TalkInsight>> = {};

function getInsightContent(video: Video): TalkInsight {
  return (
    TALK_INSIGHTS[video.id] ?? {
      ...TRACK_SUMMARIES[video.track],
      example: TRACK_EXAMPLES[video.track],
      contentBasis: "track_synthesis",
      timestampSeconds: null,
      reviewedAt: null,
    }
  );
}

function Dashboard() {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<Track | "All">("All");
  const [year, setYear] = useState<"All" | number>("All");
  const [open, setOpen] = useState<Video | null>(null);
  const lastCardTriggerRef = useRef<HTMLButtonElement | null>(null);

  const closeSummary = () => {
    setOpen(null);
    requestAnimationFrame(() => lastCardTriggerRef.current?.focus());
  };

  // Brief initial-load state so users see structure (skeletons) instead of a
  // pop-in of fully-rendered cards. Also gives images a beat to warm up.
  const [booting, setBooting] = useState(true);

  const years = useMemo(() => Array.from(new Set(VIDEOS.map(videoYear))).sort((a, b) => b - a), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VIDEOS.filter((v) => {
      if (track !== "All" && v.track !== track) return false;
      if (year !== "All" && videoYear(v) !== year) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        v.sourceChannel.toLowerCase().includes(q) ||
        v.track.toLowerCase().includes(q)
      );
    });
  }, [query, track, year]);

  const PAGE_SIZE = 12;
  // Always start at PAGE_SIZE on both server and client to avoid a hydration
  // mismatch — the restored value from sessionStorage is applied in the
  // effect below, after hydration.
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [loadAnnouncement, setLoadAnnouncement] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const restoredScrollRef = useRef(false);

  useEffect(() => {
    // Restore visibleCount (post-hydration) so returning to the page keeps
    // the same amount of content mounted before we try to restore scroll.
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { count?: number };
        if (parsed.count && parsed.count > PAGE_SIZE) setVisibleCount(parsed.count);
      }
    } catch {
      // Session storage is optional; continue with the default page size.
    }
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

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((current) => {
            const next = Math.min(current + PAGE_SIZE, filtered.length);
            setLoadAnnouncement(
              `${next - current} more talks loaded; showing ${next} of ${filtered.length}.`,
            );
            return next;
          });
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
        } catch {
          // Browsers may deny session storage; scrolling should still work.
        }
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
    trackEvent("modal_open", {
      videoId: open.youtubeId,
      code: open.code,
      track: open.track,
      sourceChannel: open.sourceChannel,
    });
    const openedAt = performance.now();
    return () => {
      trackEvent("modal_close", {
        videoId: open.youtubeId,
        code: open.code,
        dwell_ms: Math.round(performance.now() - openedAt),
      });
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
            AI Engineering Insights Atlas
          </span>
        </a>
      </header>

      {/* HERO */}
      <section
        id="top"
        aria-label="AI Engineering Insight Atlas introduction"
        className="mx-auto max-w-[1400px] px-6 pt-8"
      >
        <div className="crosshair rounded-xl border border-ink/90 bg-paper p-3 shadow-[0_20px_60px_-20px_rgba(20,20,40,0.25)] md:p-5">
          <picture>
            <source srcSet="/hero-atlas.webp" type="image/webp" />
            <img
              src="/hero-atlas.png"
              alt="AI Engineering Insight Atlas. Build AI systems that survive reality. Six visual panels represent system design, data & eval, reliability, observability, safety & control, and deployment."
              width={1731}
              height={909}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full rounded-lg border border-ink/80"
            />
          </picture>
        </div>
        <div className="mt-6 border-b border-ink/20 pb-10">
          <h1 className="sr-only">AI Engineering Insight Atlas</h1>
          <p className="max-w-2xl font-sans text-base leading-relaxed text-muted-foreground md:text-lg">
            Explore practical industry insights across six engineering domains. Transcript
            extraction is still in progress, so the knowledge layer matures over time.
          </p>
        </div>
        <div className="mt-5 rounded-xl border border-[color:var(--track-4)]/45 bg-card px-4 py-3 font-sans text-sm leading-relaxed text-muted-foreground">
          Source catalog was checked against YouTube on 30 Jul 2026. All rights belong to the
          respective owners.
        </div>
      </section>

      {/* Filters */}
      <section aria-labelledby="explore-title" className="mx-auto max-w-[1400px] px-6 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Browse the atlas
            </span>
            <h2 id="explore-title" className="mt-2 font-display text-2xl md:text-3xl">
              Find the talk behind the problem.
            </h2>
          </div>
          <span
            aria-live="polite"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
          >
            {String(visible.length).padStart(2, "0")} / {String(filtered.length).padStart(2, "0")}{" "}
            results
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
          <TrackChip label="All tracks" active={track === "All"} onClick={() => setTrack("All")} />
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
              onChange={(e) => setYear(e.target.value === "All" ? "All" : Number(e.target.value))}
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
                    aria-labelledby={`card-title-${v.id}`}
                    onClick={(event) => {
                      lastCardTriggerRef.current = event.currentTarget;
                      setOpen(v);
                    }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-ink/15 bg-card text-left shadow-[0_10px_30px_-15px_rgba(20,20,40,0.35)] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper motion-safe:hover:-translate-y-[2px] hover:border-ink/40 hover:shadow-[0_18px_40px_-15px_rgba(20,20,40,0.45)]"
                  >
                    <div className="relative aspect-video overflow-hidden border-b border-ink/15 bg-muted">
                      <Thumbnail video={v} token={t.token} eager={eager} />
                      <span className="absolute bottom-3 right-3 rounded-md border border-ink bg-ink px-2 py-1 font-mono text-[10px] text-paper shadow-sm">
                        {videoDuration(v)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        <span>{v.code}</span>
                        <span>{videoPublishedDate(v)}</span>
                      </div>
                      <h3
                        id={`card-title-${v.id}`}
                        className="mt-2 font-display text-lg leading-tight"
                      >
                        {v.title}
                      </h3>
                      <p className="mt-2 font-sans text-sm text-muted-foreground">
                        YouTube · {v.sourceChannel}
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
                        <span className="text-ink group-hover:underline">Summary →</span>
                      </div>
                    </div>
                  </button>
                );
              })}
          {!booting &&
            hasMore &&
            Array.from({ length: Math.min(3, filtered.length - visibleCount) }).map((_, i) => (
              <CardSkeleton key={`sk-more-${i}`} />
            ))}
        </div>

        {/* Sentinel — IntersectionObserver reveals the next page when it
            approaches the viewport. When exhausted, shows an end marker. */}
        <span className="sr-only" aria-live="polite">
          {loadAnnouncement}
        </span>
        {!booting && hasMore ? (
          <div ref={sentinelRef} className="mt-10 flex justify-center pb-24">
            <button
              type="button"
              onClick={() => {
                setVisibleCount((current) => {
                  const next = Math.min(current + PAGE_SIZE, filtered.length);
                  setLoadAnnouncement(
                    `${next - current} more talks loaded; showing ${next} of ${filtered.length}.`,
                  );
                  return next;
                });
              }}
              className="min-h-11 rounded-xl border border-ink/30 bg-card px-5 py-3 font-mono text-[11px] uppercase tracking-widest shadow-[0_8px_24px_-14px_rgba(20,20,40,0.4)] transition hover:-translate-y-px hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            >
              Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
            </button>
          </div>
        ) : (
          !booting &&
          filtered.length > 0 && (
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
          <span className="flex items-center gap-4">
            <a href="/analytics" className="hover:text-ink">
              Analytics debug
            </a>
            <span>Built for engineers who ship on Tuesday</span>
          </span>
        </div>
      </footer>

      {open && <SummaryModal video={open} onClose={closeSummary} />}
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
        <span className="h-2 w-2 rounded-full" style={{ background: `var(--${token})` }} />
      )}
      {label}
    </button>
  );
}

// Loads the YouTube IFrame API once so we can listen for caption state
// changes on any embedded player. The first load is timed as a perf mark.
type YouTubePlayerEvent = { data?: unknown };
type YouTubePlayer = {
  destroy?: () => void;
  getOption?: (module: string, option: string) => unknown;
};
type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events: {
        onApiChange: () => void;
        onError: (event: YouTubePlayerEvent) => void;
        onReady: () => void;
        onStateChange: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
};
type WindowWithYouTube = Window & {
  YT?: YouTubeApi;
  onYouTubeIframeAPIReady?: () => void;
};

let ytApiPromise: Promise<YouTubeApi> | null = null;
function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  const w = window as WindowWithYouTube;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  const endMark = perfMark("yt_api_load");
  ytApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      endMark({ outcome: "ok" });
      if (w.YT) resolve(w.YT);
      else reject(new Error("YouTube API loaded without a Player constructor"));
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = (e) => {
      endMark({ outcome: "error" });
      logClientError("youtube_api_load_failed", {}, e);
      reject(new Error("Failed to load YouTube IFrame API"));
    };
    document.head.appendChild(s);
  });
  return ytApiPromise;
}

function EmbeddedPlayer({ video }: { video: Video }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const captionsActive = useRef(false);
  const captionsLang = useRef<string | null>(null);
  const playReported = useRef(false);
  const captionsProbeEnd = useRef<((extra?: Record<string, unknown>) => number) | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    captionsActive.current = false;
    captionsLang.current = null;
    playReported.current = false;
    if (!iframeRef.current) return;
    let player: YouTubePlayer | undefined;
    let cancelled = false;
    const readyEnd = perfMark("player_ready", { videoId: video.youtubeId });
    // Captions module loads asynchronously after playback starts. We start a
    // timer at player-ready and close it the first time captions surface,
    // giving us a "how long from playback to CC available" measurement.
    captionsProbeEnd.current = perfMark("captions_probe", {
      videoId: video.youtubeId,
    });

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !iframeRef.current) return;
        player = new YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              readyEnd({ outcome: "ok" });
            },
            onError: (ev: YouTubePlayerEvent) => {
              readyEnd({ outcome: "error", errorCode: ev?.data });
              logClientError("youtube_player_error", {
                videoId: video.youtubeId,
                code: video.code,
                errorCode: ev?.data,
              });
              setFailed(true);
            },
            onStateChange: (ev: YouTubePlayerEvent) => {
              // YT.PlayerState.PLAYING === 1
              if (ev?.data === 1 && !playReported.current) {
                playReported.current = true;
                trackEvent("player_play", {
                  videoId: video.youtubeId,
                  code: video.code,
                  track: video.track,
                });
              }
            },
            onApiChange: () => {
              try {
                const opt =
                  player?.getOption?.("captions", "track") ?? player?.getOption?.("cc", "track");
                const optionRecord =
                  typeof opt === "object" && opt !== null ? (opt as Record<string, unknown>) : null;
                const hasTrack = optionRecord !== null && Object.keys(optionRecord).length > 0;
                const lang =
                  hasTrack && typeof optionRecord.languageCode === "string"
                    ? optionRecord.languageCode
                    : null;

                if (hasTrack && !captionsActive.current) {
                  captionsActive.current = true;
                  captionsLang.current = lang;
                  captionsProbeEnd.current?.({ outcome: "captions_available" });
                  captionsProbeEnd.current = null;
                  trackEvent("captions_enabled", {
                    videoId: video.youtubeId,
                    code: video.code,
                    track: video.track,
                    language: lang,
                    dedupe: video.youtubeId,
                  });
                } else if (!hasTrack && captionsActive.current) {
                  // User toggled captions off.
                  captionsActive.current = false;
                  trackEvent("captions_disabled", {
                    videoId: video.youtubeId,
                    code: video.code,
                    language: captionsLang.current,
                    dedupe: video.youtubeId,
                  });
                  captionsLang.current = null;
                } else if (hasTrack && lang && lang !== captionsLang.current) {
                  // User switched caption language.
                  const prevLang = captionsLang.current;
                  captionsLang.current = lang;
                  trackEvent("captions_language_changed", {
                    videoId: video.youtubeId,
                    from: prevLang,
                    to: lang,
                  });
                }
              } catch (err) {
                logClientError("captions_probe_failed", { videoId: video.youtubeId }, err);
              }
            },
          },
        });
      })
      .catch(() => {
        readyEnd({ outcome: "api_load_failed" });
        setFailed(true);
      });
    return () => {
      cancelled = true;
      // If captions never surfaced, close the probe with an outcome so the
      // debug page shows how long we waited before teardown.
      captionsProbeEnd.current?.({ outcome: "unmounted" });
      captionsProbeEnd.current = null;
      try {
        player?.destroy?.();
      } catch {
        // The iframe API may already have disposed the player.
      }
    };
  }, [video]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink p-6 text-center font-sans text-sm text-paper">
        <div>The embedded player couldn’t load.</div>
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            trackEvent("open_on_youtube_click", {
              videoId: video.youtubeId,
              from: "player_fallback",
            })
          }
          className="rounded-full border border-paper/40 px-3 py-1 text-xs uppercase tracking-widest hover:bg-paper hover:text-ink"
        >
          Watch on YouTube ↗
        </a>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0&modestbranding=1&enablejsapi=1`}
      title={video.title}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      onError={() => {
        logClientError("iframe_error", { videoId: video.youtubeId });
        setFailed(true);
      }}
      className="absolute inset-0 h-full w-full"
    />
  );
}

function SummaryModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const t = TRACKS.find((tr) => tr.name === video.track)!;
  const insight = getInsightContent(video);

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 w-full overflow-y-auto overscroll-contain border-ink/20 bg-paper shadow-[0_40px_80px_-20px_rgba(20,20,40,0.55)] focus:outline-none sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-[1100px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border">
          {/* Modal header bar */}
          <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-ink/15 bg-card/95 px-6 py-3 backdrop-blur-sm">
            <span
              className="font-mono text-[11px] uppercase tracking-widest"
              style={{ color: `var(--${t.token})` }}
            >
              {video.code.toUpperCase()} · {t.code} {video.track}
            </span>
            <DialogPrimitive.Close className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]">
              Close ✕
            </DialogPrimitive.Close>
          </div>

          {/* Hero row */}
          <div className="grid grid-cols-1 gap-6 border-b border-ink/15 p-6 md:grid-cols-[1.05fr_1fr] md:p-8">
            <div>
              <DialogPrimitive.Title className="font-display text-3xl leading-[1.02] md:text-4xl">
                {video.title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-4 font-sans text-sm text-muted-foreground">
                Source channel: <span className="text-ink">{video.sourceChannel}</span> · published{" "}
                {videoPublishedDate(video)} · {videoDuration(video)}
              </DialogPrimitive.Description>
              <div className="mt-4 inline-flex rounded-full border border-ink/20 bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Track synthesis · not a transcript summary
              </div>
            </div>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-ink/80 bg-ink shadow-[0_20px_50px_-20px_rgba(20,20,40,0.55)]">
              <EmbeddedPlayer video={video} />
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_320px]">
            <div className="order-2 divide-y divide-ink/10 md:order-1">
              <Row label="Claim" body={insight.claim} />
              <Row label="Implication" body={insight.implication} />
              <Row label="When to use" body={insight.whenToUse} />
              <Row
                label="Illustrative example"
                body={
                  <div className="rounded-xl border border-ink/20 bg-card p-4 shadow-[0_8px_24px_-16px_rgba(20,20,40,0.35)]">
                    <div
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: `var(--${t.token})` }}
                    >
                      Editorial scenario · not from the talk
                    </div>
                    <div className="mt-3 space-y-3">
                      <ExamplePart label="Situation" body={insight.example.situation} />
                      <ExamplePart label="Application" body={insight.example.application} />
                      <ExamplePart
                        label="Observable outcome"
                        body={insight.example.observableOutcome}
                      />
                    </div>
                  </div>
                }
              />
              <Row
                label="Caveat"
                body={<span className="text-[color:var(--track-5)]">{insight.caveat}</span>}
              />
            </div>

            {/* Sidebar */}
            <aside className="order-1 border-b border-ink/15 bg-card p-6 md:order-2 md:border-b-0 md:border-l">
              <div className="mb-5 rounded-xl border border-ink/20 bg-paper p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Content basis
                </div>
                <div className="mt-2 font-display text-base">Editorial track synthesis</div>
                <p className="mt-1 font-sans text-xs leading-relaxed text-muted-foreground">
                  The claim, implication, caveat, and example are not attributed to this speaker.
                  Transcript-backed notes require a reviewed timestamp.
                </p>
              </div>
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
              <SideBlock label="YouTube source">
                <div className="font-display text-base">{video.sourceChannel}</div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Exact YouTube metadata
                </div>
              </SideBlock>
              <SideBlock label="Record status">
                <div className="font-sans text-sm">Published: {videoPublishedDate(video)}</div>
                <div className="font-sans text-sm">Duration: {videoDuration(video)}</div>
                <div className="font-sans text-sm">Code: {video.code}</div>
                <div className="font-sans text-sm">Review: source metadata verified</div>
                <div className="font-sans text-sm">
                  Verified:{" "}
                  {new Date(SOURCE_CATALOG_VERIFIED_AT).toLocaleDateString("en", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </SideBlock>

              <a
                href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent("open_on_youtube_click", {
                    videoId: video.youtubeId,
                    code: video.code,
                    track: video.track,
                    sourceChannel: video.sourceChannel,
                  })
                }
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-ink bg-ink px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-paper shadow-[0_10px_24px_-12px_rgba(20,20,40,0.6)] transition-transform hover:-translate-y-[1px]"
              >
                Open source on YouTube
                <span>↗</span>
              </a>
            </aside>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ExamplePart({ label, body }: { label: string; body: string }) {
  return (
    <div className="border-t border-ink/10 pt-3 first:border-t-0 first:pt-0">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <p className="mt-1 font-sans text-sm leading-relaxed text-ink">{body}</p>
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
