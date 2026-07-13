import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  clearRecentEvents,
  getRecentEvents,
  subscribe,
  type LoggedEvent,
} from "@/lib/analytics";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics debug · Video Atlas" },
      {
        name: "description",
        content:
          "Live client-side event, error, and performance timing stream for the Video Atlas app.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AnalyticsDebugPage,
});

type Filter = "all" | "event" | "error" | "perf";

function AnalyticsDebugPage() {
  const [events, setEvents] = useState<LoggedEvent[]>(() => getRecentEvents());
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Seed once on mount in case events accumulated before this route rendered.
    setEvents(getRecentEvents());
    const unsub = subscribe((e) => {
      if (paused) return;
      if (e.event === "__cleared__") {
        setEvents([]);
        return;
      }
      setEvents((prev) => {
        const next = prev.concat(e);
        return next.length > 500 ? next.slice(next.length - 500) : next;
      });
    });
    return () => {
      unsub();
    };
  }, [paused]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => (filter === "all" ? true : e.kind === filter))
      .filter((e) => {
        if (!q) return true;
        return (
          e.event.toLowerCase().includes(q) ||
          JSON.stringify(e.props).toLowerCase().includes(q)
        );
      })
      .slice()
      .reverse();
  }, [events, filter, query]);

  const stats = useMemo(() => {
    const s = { event: 0, error: 0, perf: 0 };
    for (const e of events) s[e.kind]++;
    const perfEvents = events.filter((e) => e.kind === "perf");
    const perfByName = new Map<string, number[]>();
    for (const p of perfEvents) {
      const d = Number((p.props as any).duration_ms);
      if (!Number.isFinite(d)) continue;
      const arr = perfByName.get(p.event) ?? [];
      arr.push(d);
      perfByName.set(p.event, arr);
    }
    const perfSummary = Array.from(perfByName.entries()).map(([name, ds]) => {
      const sorted = ds.slice().sort((a, b) => a - b);
      const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
      return { name, count: ds.length, avg, p95, last: ds[ds.length - 1] };
    });
    return { ...s, perfSummary };
  }, [events]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between border-b border-ink/20 px-6 py-5">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex h-8 items-center justify-center rounded-md border border-ink px-2 font-mono text-xs font-medium tracking-wider hover:bg-ink hover:text-paper"
          >
            ← Atlas
          </Link>
          <span className="font-display text-sm font-medium tracking-tight">
            Analytics · debug stream
          </span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          client-side · in-memory · this tab only
        </span>
      </header>

      <section className="mx-auto max-w-[1200px] px-6 pt-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Events" value={stats.event} />
          <Stat label="Errors" value={stats.error} tone="danger" />
          <Stat label="Perf marks" value={stats.perf} />
          <Stat label="Buffered" value={events.length} sub="max 500" />
        </div>

        {stats.perfSummary.length > 0 && (
          <div className="mt-6 rounded-2xl border border-ink/20 bg-card p-5 shadow-[0_10px_30px_-15px_rgba(20,20,40,0.25)]">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Performance summary
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left font-mono text-xs">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="pb-2">Mark</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">Last (ms)</th>
                    <th className="pb-2 text-right">Avg (ms)</th>
                    <th className="pb-2 text-right">p95 (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {stats.perfSummary.map((p) => (
                    <tr key={p.name}>
                      <td className="py-2">{p.name}</td>
                      <td className="py-2 text-right">{p.count}</td>
                      <td className="py-2 text-right">{p.last.toFixed(1)}</td>
                      <td className="py-2 text-right">{p.avg.toFixed(1)}</td>
                      <td className="py-2 text-right">{p.p95.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl border border-ink/20 bg-card p-1 font-mono text-[11px] uppercase tracking-widest">
            {(["all", "event", "error", "perf"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-lg px-3 py-1.5 transition " +
                  (filter === f
                    ? "bg-ink text-paper"
                    : "text-muted-foreground hover:text-ink")
                }
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Filter by name or prop…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[220px] rounded-xl border border-ink/20 bg-card px-4 py-2 font-mono text-xs text-ink outline-none placeholder:text-muted-foreground/70"
          />
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-xl border border-ink/40 bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-widest hover:bg-ink hover:text-paper"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            onClick={() => {
              clearRecentEvents();
              setEvents([]);
            }}
            className="rounded-xl border border-ink bg-ink px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-paper hover:opacity-90"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 space-y-2 pb-24">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/40 p-12 text-center font-mono text-sm text-muted-foreground">
              No events yet. Interact with the app in another tab or return to
              <Link to="/" className="ml-1 underline">the atlas</Link>.
            </div>
          ) : (
            filtered.map((e) => <EventRow key={e.id} e={e} />)
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-2xl border border-ink/20 bg-card p-4 shadow-[0_8px_24px_-16px_rgba(20,20,40,0.35)]">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={
          "mt-2 font-display text-2xl " +
          (tone === "danger" && Number(value) > 0 ? "text-[color:var(--track-5)]" : "")
        }
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}

function EventRow({ e }: { e: LoggedEvent }) {
  const [open, setOpen] = useState(false);
  const time = new Date(e.ts).toLocaleTimeString(undefined, { hour12: false });
  const badgeColor =
    e.kind === "error"
      ? "border-[color:var(--track-5)] text-[color:var(--track-5)]"
      : e.kind === "perf"
      ? "border-ink text-ink"
      : "border-ink/40 text-muted-foreground";
  const propKeys = Object.keys(e.props);
  return (
    <div className="rounded-xl border border-ink/15 bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="w-20 font-mono text-[10px] tabular-nums text-muted-foreground">
          {time}
        </span>
        <span
          className={
            "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest " +
            badgeColor
          }
        >
          {e.kind}
        </span>
        <span className="flex-1 truncate font-mono text-xs text-ink">
          {e.event}
        </span>
        {propKeys.length > 0 && (
          <span className="hidden md:inline truncate max-w-[420px] font-mono text-[11px] text-muted-foreground">
            {propKeys.slice(0, 4).map((k) => `${k}=${formatVal((e.props as any)[k])}`).join("  ")}
          </span>
        )}
        <span className="font-mono text-[10px] text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <pre className="overflow-x-auto border-t border-ink/10 bg-paper/60 px-4 py-3 font-mono text-[11px] leading-relaxed text-ink">
{JSON.stringify(e.props, null, 2)}
        </pre>
      )}
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v == null) return String(v);
  if (typeof v === "string") return v.length > 40 ? v.slice(0, 40) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "…";
}
