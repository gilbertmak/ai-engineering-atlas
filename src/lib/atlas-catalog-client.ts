import {
  ATLAS_CATALOG_MANIFEST,
  LAST_KNOWN_GOOD_CATALOG,
  type CatalogManifest,
  type CatalogVideo,
} from "@/lib/atlas-catalog";

export type CatalogLoadResult = {
  records: readonly CatalogVideo[];
  manifest: CatalogManifest;
  source: "public_snapshot";
};

/**
 * The approved catalog stays local to the build so the gallery and MCP tools
 * use the same reviewed projection without a second network round trip.
 */
export async function loadAtlasCatalog(): Promise<CatalogLoadResult> {
  return {
    records: LAST_KNOWN_GOOD_CATALOG,
    manifest: ATLAS_CATALOG_MANIFEST,
    source: "public_snapshot",
  };
}
