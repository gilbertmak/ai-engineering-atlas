import { ZodError } from "zod";

import { getCatalogPage, getCatalogVideo } from "@/lib/atlas-catalog";
import { loadAtlasProjection, type AtlasProjection } from "@/server/atlas-projection-store";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60",
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: { ...JSON_HEADERS, ...init.headers } });
}

function etag(projection: AtlasProjection) {
  return `"${projection.manifest.projectionVersion}-${projection.manifest.contentHash}"`;
}

export async function handleAtlasApi(
  request: Request,
  projectionOverride?: AtlasProjection,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (
    !url.pathname.startsWith("/v1/") &&
    url.pathname !== "/healthz" &&
    url.pathname !== "/readyz"
  ) {
    return undefined;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method_not_allowed" }, { status: 405, headers: { allow: "GET, HEAD" } });
  }
  if (url.pathname === "/healthz") return new Response(null, { status: 204 });
  const projection = projectionOverride ?? (await loadAtlasProjection());
  if (url.pathname === "/readyz")
    return json({ ready: true, projectionVersion: projection.manifest.projectionVersion });
  if (request.headers.get("if-none-match") === etag(projection))
    return new Response(null, { status: 304, headers: { etag: etag(projection) } });

  try {
    if (url.pathname === "/v1/catalog/manifest")
      return json(projection.manifest, { headers: { etag: etag(projection) } });
    if (url.pathname === "/v1/catalog") {
      return json(getCatalogPage(Object.fromEntries(url.searchParams.entries()), projection), {
        headers: { etag: etag(projection) },
      });
    }
    const videoMatch = url.pathname.match(/^\/v1\/videos\/([^/]+)$/);
    if (videoMatch) {
      const record = getCatalogVideo(decodeURIComponent(videoMatch[1]!), projection.records);
      return record
        ? json({ manifest: projection.manifest, record }, { headers: { etag: etag(projection) } })
        : json({ error: "not_found" }, { status: 404 });
    }
    return json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    if (error instanceof ZodError) return json({ error: "invalid_request" }, { status: 400 });
    throw error;
  }
}
