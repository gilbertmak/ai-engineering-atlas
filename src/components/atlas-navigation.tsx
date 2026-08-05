import { Link } from "@tanstack/react-router";

type AtlasNavigationProps = {
  current: "insights" | "statistics";
};

const navItemClass =
  "rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]";

export function AtlasNavigation({ current }: AtlasNavigationProps) {
  return (
    <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 border-b border-ink/20 px-6 py-4">
      <Link to="/" className="flex shrink-0 items-center gap-3">
        <span className="inline-flex h-8 items-center justify-center rounded-md border border-ink px-2 font-mono text-xs font-medium tracking-wider">
          AI/E
        </span>
        <span className="font-display text-sm font-medium tracking-tight">
          AI Engineering Insights Atlas
        </span>
      </Link>
      <nav aria-label="Atlas navigation" className="flex items-center gap-1">
        <Link
          to="/"
          aria-current={current === "insights" ? "page" : undefined}
          className={`${navItemClass} ${
            current === "insights"
              ? "bg-ink text-paper"
              : "text-muted-foreground hover:bg-ink/5 hover:text-ink"
          }`}
        >
          Insights
        </Link>
        <Link
          to="/statistics"
          aria-current={current === "statistics" ? "page" : undefined}
          className={`${navItemClass} ${
            current === "statistics"
              ? "bg-ink text-paper"
              : "text-muted-foreground hover:bg-ink/5 hover:text-ink"
          }`}
        >
          Statistics
        </Link>
      </nav>
    </header>
  );
}
