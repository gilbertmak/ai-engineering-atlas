import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  catalogPageSchema,
  type CatalogManifest,
  type CatalogVideo,
} from "@/lib/atlas-catalog";

export type CatalogLoadResult = {
  records: readonly CatalogVideo[];
  manifest: CatalogManifest;
  source: "api" | "last_known_good";
};

const localFallback: CatalogLoadResult = {
  records: LAST_KNOWN_GOOD_CATALOG,
  manifest: ATLAS_CATALOG_MANIFEST,
  source: "last_known_good",
};

export function atlasApiUrl(path: string) {
  const baseUrl = import.meta.env.VITE_ATLAS_API_BASE_URL?.trim();
  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

export async function loadAtlasCatalog(
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogLoadResult> {
  try {
    const records: CatalogVideo[] = [];
    let manifest: CatalogManifest | undefined;
    let cursor: string | null = null;

    // The public API deliberately caps each response at 50 records. Follow its
    // opaque cursor so the gallery is not silently limited to the first page.
    for (let pageNumber = 0; pageNumber < 1_000; pageNumber += 1) {
      const query = new URLSearchParams({ limit: "50" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetchImpl(atlasApiUrl(`/v1/catalog?${query}`), {
        headers: { accept: "application/json" },
      });
      if (!response.ok) return localFallback;
      const page = catalogPageSchema.parse(await response.json());
      if (
        manifest &&
        (page.manifest.projectionVersion !== manifest.projectionVersion ||
          page.manifest.contentHash !== manifest.contentHash)
      ) {
        return localFallback;
      }
      manifest ??= page.manifest;
      records.push(...page.records);
      cursor = page.nextCursor;
      if (!cursor) {
        // A schema-valid projection may be newer than the bundled seed.
        return { records, manifest, source: "api" };
      }
    }
    return localFallback;
  } catch {
    return localFallback;
  }
}
