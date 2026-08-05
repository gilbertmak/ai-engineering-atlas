import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AtlasNavigation } from "@/components/atlas-navigation";
import { LAST_KNOWN_GOOD_CATALOG } from "@/lib/atlas-catalog";
import { siteUrl } from "@/lib/site";
import { catalogTagCounts } from "@/lib/tag-statistics";
import type { Track } from "@/data/videos";

const TRACK_TOKENS: Record<Track, string> = {
  "System Design": "track-1",
  "Data & Eval": "track-2",
  Reliability: "track-3",
  Observability: "track-4",
  "Safety & Control": "track-5",
  Deployment: "track-6",
  Knowledge: "track-7",
  "Developer Workflows": "track-8",
  "Models & Training": "track-9",
};

export const Route = createFileRoute("/statistics")({
  head: () => ({
    links: [{ rel: "canonical", href: siteUrl("/statistics") }],
    meta: [
      { title: "Atlas statistics · AI Engineering Insights Atlas" },
      {
        name: "description",
        content: "Video counts for every controlled tag in the AI Engineering Insights Atlas.",
      },
      { property: "og:title", content: "Atlas statistics · AI Engineering Insights Atlas" },
      {
        property: "og:description",
        content: "Video counts for every controlled tag in the AI Engineering Insights Atlas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StatisticsPage,
});

function StatisticsPage() {
  const counts = useMemo(() => catalogTagCounts(LAST_KNOWN_GOOD_CATALOG), []);
  const maxCount = counts[0]?.count ?? 1;
  const taggedAssignments = counts.reduce((total, item) => total + item.count, 0);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AtlasNavigation current="statistics" />
      <main className="mx-auto max-w-[1400px] px-6 pb-24 pt-10">
        <section aria-labelledby="statistics-title">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Catalog coverage
          </p>
          <h1 id="statistics-title" className="mt-2 font-display text-3xl md:text-4xl">
            Videos by tag
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Videos can appear in more than
            one tag, so the bar total is higher than the number of catalog entries.
          </p>
        </section>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Catalog videos" value={LAST_KNOWN_GOOD_CATALOG.length} />
          <Stat label="Controlled tags" value={counts.length} />
          <Stat label="Tag assignments" value={taggedAssignments} />
        </dl>

        <figure className="mt-8 rounded-2xl border border-ink/20 bg-card p-5 shadow-[0_10px_30px_-15px_rgba(20,20,40,0.25)] md:p-7">
          <figcaption className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Video count by controlled tag
          </figcaption>
          <div
            className="mt-6 space-y-3"
            role="list"
            aria-label="Bar plot of the number of videos for each Atlas tag"
          >
            {counts.map((item) => {
              const percent = Math.max((item.count / maxCount) * 100, 1.5);
              const videoCountLabel = `${item.count} video${item.count === 1 ? "" : "s"}`;
              return (
                <div
                  key={item.tag}
                  role="listitem"
                  className="grid grid-cols-[minmax(9rem,14rem)_1fr_auto] items-center gap-3"
                >
                  <span className="text-sm capitalize text-ink">{item.label}</span>
                  <div
                    className="h-5 overflow-hidden rounded-sm bg-muted"
                    role="img"
                    aria-label={`${item.label}: ${videoCountLabel}`}
                  >
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: `var(--${TRACK_TOKENS[item.track]})`,
                      }}
                    />
                  </div>
                  <data
                    value={item.count}
                    className="w-9 text-right font-mono text-xs tabular-nums text-muted-foreground"
                  >
                    {item.count}
                  </data>
                </div>
              );
            })}
          </div>
        </figure>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-ink/15 bg-card p-4 shadow-[0_8px_24px_-16px_rgba(20,20,40,0.28)]">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 font-display text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
