import { catalogTags, catalogThemes } from "@/data/catalog-taxonomy";
import type { CatalogManifest, CatalogVideo } from "@/lib/atlas-catalog";

export type CatalogLoadResult = {
  records: readonly CatalogVideo[];
  manifest: CatalogManifest;
  source: "public_snapshot";
};

/**
 * The approved catalog is an immutable Cloudflare Asset. Keeping it out of
 * the Worker module graph leaves room for server-side Pinecone retrieval on
 * the Free plan while preserving the reviewed public projection.
 */
export async function loadAtlasCatalog(): Promise<CatalogLoadResult> {
  const response = await fetch("/atlas-public-catalog.json");
  if (!response.ok) throw new Error(`Unable to load public catalog: ${response.status}`);
  const payload = (await response.json()) as {
    manifest: CatalogManifest;
    records: CatalogVideo[];
  };
  return {
    records: payload.records.map((video) => ({
      ...video,
      themes: catalogThemes(video),
      tags: catalogTags(video),
    })),
    manifest: payload.manifest,
    source: "public_snapshot",
  };
}
