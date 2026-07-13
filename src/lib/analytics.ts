// Lightweight client-side event tracking + error logging.
//
// Events are queued and flushed in batches to window.dataLayer (GTM / GA if
// configured) to avoid spamming during rapid interactions or infinite scroll.
// A short-window throttle collapses duplicate events (same name + dedupe key)
// so scroll/resize/keystroke firehoses don't drown the pipeline.
//
// Every event is also mirrored into an in-memory ring buffer that the
// /analytics debug page reads via subscribe().

import { reportLovableError } from "./lovable-error-reporting";

type EventProps = Record<string, unknown>;

export type LoggedEvent = {
  id: number;
  event: string;
  props: EventProps;
  ts: number;
  kind: "event" | "error" | "perf";
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

// --- Ring buffer + subscribers (for the debug page) -------------------------

const RING_MAX = 500;
const ring: LoggedEvent[] = [];
let nextId = 1;
type Listener = (e: LoggedEvent) => void;
const listeners = new Set<Listener>();

function record(kind: LoggedEvent["kind"], event: string, props: EventProps) {
  const entry: LoggedEvent = { id: nextId++, event, props, ts: Date.now(), kind };
  ring.push(entry);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
  for (const fn of listeners) {
    try {
      fn(entry);
    } catch {}
  }
  return entry;
}

export function getRecentEvents(): LoggedEvent[] {
  return ring.slice();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearRecentEvents() {
  ring.length = 0;
  for (const fn of listeners) {
    try {
      fn({ id: nextId++, event: "__cleared__", props: {}, ts: Date.now(), kind: "event" });
    } catch {}
  }
}

// --- Batched queue + throttle ----------------------------------------------

const FLUSH_MS = 400;
const MAX_BATCH = 50;
const THROTTLE_MS = 250; // collapse duplicates within this window

let queue: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const lastSeen = new Map<string, number>();

function scheduleFlush() {
  if (typeof window === "undefined") return;
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_MS);
}

function flush() {
  flushTimer = null;
  if (!queue.length || typeof window === "undefined") return;
  const batch = queue;
  queue = [];
  try {
    const dl = (window.dataLayer ||= []);
    for (const item of batch) dl.push(item);
  } catch {}
}

function throttleKey(event: string, props: EventProps): string | null {
  // Callers may pass a `dedupe` prop with a stable id (e.g. videoId) so we
  // collapse rapid repeats of the same logical event without collapsing
  // unrelated events that happen to share a name.
  const d = props.dedupe;
  if (d === false) return null; // opt out
  if (typeof d === "string" || typeof d === "number") return `${event}:${d}`;
  return event;
}

function shouldThrottle(event: string, props: EventProps): boolean {
  const key = throttleKey(event, props);
  if (!key) return false;
  const now = Date.now();
  const prev = lastSeen.get(key);
  if (prev && now - prev < THROTTLE_MS) return true;
  lastSeen.set(key, now);
  // Bound the map so it can't grow forever in long sessions.
  if (lastSeen.size > 200) {
    const cutoff = now - THROTTLE_MS * 4;
    for (const [k, t] of lastSeen) if (t < cutoff) lastSeen.delete(k);
  }
  return false;
}

// --- Public API -------------------------------------------------------------

export function trackEvent(event: string, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  if (shouldThrottle(event, props)) return;
  const { dedupe: _drop, ...rest } = props;
  const payload = { event, ...rest, ts: Date.now() };
  queue.push(payload);
  if (queue.length >= MAX_BATCH) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flush();
  } else {
    scheduleFlush();
  }
  record("event", event, rest);
}

export function logClientError(
  message: string,
  context: EventProps = {},
  error?: unknown,
) {
  if (typeof window === "undefined") return;
  if (shouldThrottle(`err:${message}`, context)) return;
  const err = error instanceof Error ? error : new Error(message);
  // eslint-disable-next-line no-console
  console.error("[client-error]", message, { ...context, error });
  queue.push({ event: "client_error", message, ...context, ts: Date.now() });
  scheduleFlush();
  record("error", message, context);
  reportLovableError(err, { source: "client_log", message, ...context });
}

// Performance timing helper — returns a function you call when the operation
// finishes; it records a perf event with the measured duration in ms.
export function perfMark(name: string, context: EventProps = {}) {
  const start =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  let done = false;
  return (extra: EventProps = {}) => {
    if (done) return 0;
    done = true;
    const end =
      typeof performance !== "undefined" && performance.now
        ? performance.now()
        : Date.now();
    const duration_ms = Math.round((end - start) * 100) / 100;
    const props = { ...context, ...extra, duration_ms };
    queue.push({ event: `perf:${name}`, ...props, ts: Date.now() });
    scheduleFlush();
    record("perf", name, props);
    return duration_ms;
  };
}

// Best-effort flush on tab hide so we don't lose the tail of a session.
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
