// Lightweight client-side event tracking + error logging.
// Events are pushed to window.dataLayer (picked up by GTM / GA if configured)
// and also mirrored to console for local visibility. Errors additionally
// go through Lovable's runtime capture so they surface in the error panel.

import { reportLovableError } from "./lovable-error-reporting";

type EventProps = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: string, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  const payload = { event, ...props, ts: Date.now() };
  try {
    (window.dataLayer ||= []).push(payload);
  } catch {}
  // Prefixed so it's easy to filter in the console.
  // eslint-disable-next-line no-console
  console.info("[track]", event, props);
}

export function logClientError(
  message: string,
  context: EventProps = {},
  error?: unknown,
) {
  if (typeof window === "undefined") return;
  const err = error instanceof Error ? error : new Error(message);
  // eslint-disable-next-line no-console
  console.error("[client-error]", message, { ...context, error });
  try {
    (window.dataLayer ||= []).push({
      event: "client_error",
      message,
      ...context,
      ts: Date.now(),
    });
  } catch {}
  reportLovableError(err, { source: "client_log", message, ...context });
}
