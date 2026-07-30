import { readFile } from "node:fs/promises";

import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  catalogManifestSchema,
  catalogVideoSchema,
  type CatalogManifest,
  type CatalogVideo,
} from "@/lib/atlas-catalog";

export type AtlasProjection = { manifest: CatalogManifest; records: readonly CatalogVideo[] };

const fallback: AtlasProjection = {
  manifest: ATLAS_CATALOG_MANIFEST,
  records: LAST_KNOWN_GOOD_CATALOG,
};

// This is server-only. The Mac Mini worker atomically replaces this file after
// source-policy validation; a missing or malformed file never replaces LKG.
export async function loadAtlasProjection(
  path = process.env.ATLAS_CATALOG_PROJECTION_PATH ?? "data/atlas-catalog-projection.json",
): Promise<AtlasProjection> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as {
      manifest: unknown;
      records: unknown;
    };
    return {
      manifest: catalogManifestSchema.parse(parsed.manifest),
      records: catalogVideoSchema.array().parse(parsed.records),
    };
  } catch {
    return fallback;
  }
}
