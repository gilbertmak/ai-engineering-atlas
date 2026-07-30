const DEFAULT_SITE_URL = "https://ai-engineering-insights-atlas.lovable.app";

export const SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(
  /\/+$/,
  "",
);

export function siteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}
